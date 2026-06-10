from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from products.logging_utils import log_product_event
from products.models import ProductVariant, Products, VariantOption
from products.services.stock_service import sync_product_total_stock
from products.services.subvariant_generator import (
    archive_sub_variant,
    find_sub_variants_with_any_option,
    generate_sub_variants,
    sync_sub_variants,
)


def _next_product_id():
    current_max = Products.objects.aggregate(max_id=Max('ProductID'))['max_id']
    return (current_max or 0) + 1


def _validate_variants_data(variants_data):
    if not variants_data:
        raise ValidationError({'variants': 'At least one variant is required.'})

    seen_names = set()
    for variant in variants_data:
        name = (variant.get('name') or '').strip()
        options = variant.get('options') or []

        if not name:
            raise ValidationError({'variants': 'Variant name cannot be empty.'})
        if name.lower() in seen_names:
            raise ValidationError({'variants': f"Duplicate variant name '{name}'."})
        seen_names.add(name.lower())

        if not options:
            raise ValidationError(
                {'variants': f"Variant '{name}' must have at least one option."}
            )

        cleaned_options = [str(option).strip() for option in options if str(option).strip()]
        if not cleaned_options:
            raise ValidationError(
                {'variants': f"Variant '{name}' must have at least one option."}
            )
        if len(cleaned_options) != len(set(option.lower() for option in cleaned_options)):
            raise ValidationError(
                {'variants': f"Duplicate options found in variant '{name}'."}
            )


def _create_variants_and_options(product, variants_data):
    for variant_data in variants_data:
        variant = ProductVariant.objects.create(
            product=product,
            name=variant_data['name'].strip(),
        )
        for option_value in variant_data['options']:
            value = str(option_value).strip()
            if value:
                VariantOption.objects.create(variant=variant, value=value, active=True)


def _block_or_archive_sub_variants(sub_variants):
    """Block if any sub-variant has stock; otherwise soft-archive."""
    for sub_variant in sub_variants:
        if sub_variant.stock > 0:
            raise ValidationError(
                {
                    'variants': (
                        f"Cannot change variants while '{sub_variant.name}' "
                        f"still has stock ({sub_variant.stock}). "
                        f"Sell or adjust stock to zero first."
                    )
                }
            )

    for sub_variant in sub_variants:
        archive_sub_variant(sub_variant)


def _sync_variant_options(variant, new_option_values):
    """
    Diff active options: deactivate removed, add/reactivate new.
    Preserves history — options are never hard-deleted.
    """
    cleaned_values = [str(value).strip() for value in new_option_values if str(value).strip()]
    if not cleaned_values:
        raise ValidationError({'options': 'At least one option is required.'})

    _validate_variants_data([{'name': variant.name, 'options': cleaned_values}])

    existing_options = list(variant.options.all())
    existing_by_value = {opt.value.lower(): opt for opt in existing_options}

    new_values_lower = {value.lower() for value in cleaned_values}
    old_active_values = {opt.value.lower() for opt in existing_options if opt.active}

    removed_values = old_active_values - new_values_lower
    added_values = new_values_lower - old_active_values

    if removed_values:
        removed_option_ids = [
            existing_by_value[value].id
            for value in removed_values
            if value in existing_by_value
        ]
        affected = find_sub_variants_with_any_option(
            variant.product,
            removed_option_ids,
            active_only=True,
        )
        _block_or_archive_sub_variants(affected)

        for value in removed_values:
            option = existing_by_value.get(value)
            if option and option.active:
                option.active = False
                option.save(update_fields=['active'])

    for value in cleaned_values:
        key = value.lower()
        if key not in added_values:
            continue

        inactive_match = variant.options.filter(value__iexact=value, active=False).first()
        if inactive_match:
            inactive_match.active = True
            inactive_match.save(update_fields=['active'])
        else:
            VariantOption.objects.create(variant=variant, value=value, active=True)


@transaction.atomic
def create_product_with_variants(data, user):
    """
    Create a product with variants, options, and auto-generated sub-variants.

    Expected data:
    {
        'name': 'Shirt',
        'ProductCode': 'PROD-001',
        'HSNCode': '6205',
        'ProductImage': <file optional>,
        'category_id': <uuid optional>,
        'variants': [
            {'name': 'size', 'options': ['S', 'M', 'L']},
            {'name': 'color', 'options': ['Red', 'Blue']},
        ],
    }
    """
    product_name = (data.get('name') or data.get('ProductName') or '').strip()
    product_code = (data.get('ProductCode') or '').strip()
    variants_data = data.get('variants') or []

    if not product_name:
        raise ValidationError({'name': 'Product name is required.'})
    if not product_code:
        raise ValidationError({'ProductCode': 'Product code is required.'})
    if Products.objects.filter(ProductCode=product_code).exists():
        raise ValidationError({'ProductCode': 'Product code already exists.'})

    _validate_variants_data(variants_data)

    product_kwargs = {
        'ProductID': _next_product_id(),
        'ProductCode': product_code,
        'ProductName': product_name,
        'CreatedUser': user,
        'HSNCode': data.get('HSNCode') or None,
        'TotalStock': 0,
    }
    if 'category_id' in data:
        product_kwargs['category_id'] = data['category_id']
    if data.get('ProductImage'):
        product_kwargs['ProductImage'] = data['ProductImage']

    product = Products.objects.create(**product_kwargs)
    _create_variants_and_options(product, variants_data)
    generate_sub_variants(product)
    log_product_event(
        'PRODUCT_CREATED',
        product,
        user,
        f'variants={len(variants_data)} sub_variants={product.sub_variants.filter(active=True).count()}',
    )
    return product


@transaction.atomic
def update_product_details(product, data):
    """Update basic product fields."""
    if 'name' in data or 'ProductName' in data:
        product.ProductName = (data.get('name') or data.get('ProductName') or '').strip()
    if 'ProductCode' in data:
        new_code = data['ProductCode'].strip()
        if Products.objects.exclude(pk=product.pk).filter(ProductCode=new_code).exists():
            raise ValidationError({'ProductCode': 'Product code already exists.'})
        product.ProductCode = new_code
    if 'HSNCode' in data:
        product.HSNCode = data['HSNCode'] or None
    if 'Active' in data:
        product.Active = bool(data['Active'])
    if 'IsFavourite' in data:
        product.IsFavourite = bool(data['IsFavourite'])
    if 'category_id' in data:
        product.category_id = data['category_id']
    if data.get('ProductImage'):
        product.ProductImage = data['ProductImage']

    product.UpdatedDate = timezone.now()
    product.save()
    log_product_event('PRODUCT_UPDATED', product, user=None)
    return product


@transaction.atomic
def add_variant_to_product(product, variant_data):
    """Add a variant with options — creates only missing sub-variant combinations."""
    name = (variant_data.get('name') or '').strip()
    options = variant_data.get('options') or []

    if not name:
        raise ValidationError({'name': 'Variant name is required.'})
    if product.variants.filter(name__iexact=name).exists():
        raise ValidationError({'name': f"Variant '{name}' already exists for this product."})
    if not options:
        raise ValidationError({'options': 'At least one option is required.'})

    _validate_variants_data([{'name': name, 'options': options}])

    variant = ProductVariant.objects.create(product=product, name=name)
    for option_value in options:
        value = str(option_value).strip()
        if value:
            VariantOption.objects.create(variant=variant, value=value, active=True)

    product.UpdatedDate = timezone.now()
    product.save(update_fields=['UpdatedDate'])
    sync_sub_variants(product)
    sync_product_total_stock(product)
    return variant


@transaction.atomic
def update_variant(variant, variant_data):
    """
    Update variant name and/or options.
    - Adding options: creates only new sub-variant combinations
    - Removing/renaming options: archives obsolete sub-variants (blocks if stock > 0)
    """
    product = variant.product
    new_name = (variant_data.get('name') or variant.name).strip()
    options = variant_data.get('options')

    if not new_name:
        raise ValidationError({'name': 'Variant name is required.'})
    if product.variants.exclude(pk=variant.pk).filter(name__iexact=new_name).exists():
        raise ValidationError({'name': f"Variant '{new_name}' already exists for this product."})

    variant.name = new_name
    variant.save(update_fields=['name'])

    if options is not None:
        _sync_variant_options(variant, options)

    product.UpdatedDate = timezone.now()
    product.save(update_fields=['UpdatedDate'])
    sync_sub_variants(product)
    sync_product_total_stock(product)
    return variant


@transaction.atomic
def delete_variant(variant):
    """
    Soft-remove a variant by deactivating its options and archiving affected sub-variants.
    Never hard-deletes rows that have inventory history.
    """
    product = variant.product
    option_ids = list(variant.options.filter(active=True).values_list('id', flat=True))

    if option_ids:
        affected = find_sub_variants_with_any_option(product, option_ids, active_only=True)
        _block_or_archive_sub_variants(affected)
        variant.options.filter(id__in=option_ids).update(active=False)

    product.UpdatedDate = timezone.now()
    product.save(update_fields=['UpdatedDate'])
    sync_sub_variants(product)
    sync_product_total_stock(product)
