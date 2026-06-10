from itertools import product as cartesian_product

from django.core.exceptions import ValidationError
from django.utils import timezone

from products.models import SubVariant, VariantOption


def build_subvariant_name(product_name, option_values):
    return f'{product_name} / {" / ".join(option_values)}'


def build_sku_code(product_code, option_values):
    parts = [product_code]
    parts.extend(value.upper().replace(' ', '-') for value in option_values)
    return '-'.join(parts)


def get_option_groups(product):
    """Return ordered active option lists for each variant that still has active options."""
    variants = product.variants.prefetch_related('options').order_by('name')
    groups = []

    for variant in variants:
        options = list(variant.options.filter(active=True).order_by('value'))
        if options:
            groups.append(options)

    if not groups:
        raise ValidationError({'variants': 'At least one variant with active options is required.'})

    return groups


def get_combinations(product):
    """Return the Cartesian product of all active variant option groups."""
    groups = get_option_groups(product)
    if not groups:
        return []
    return [combo for combo in cartesian_product(*groups)]


def _find_subvariant_by_options(product, options):
    """Find sub-variant by option set, including archived rows (for reactivation)."""
    option_ids = {option.id for option in options}

    for sub_variant in product.sub_variants.prefetch_related('options'):
        if {option.id for option in sub_variant.options.all()} == option_ids:
            return sub_variant

    return None


def archive_sub_variant(sub_variant):
    """Soft-archive a sub-variant — preserves stock history and transactions."""
    sub_variant.active = False
    sub_variant.updated_at = timezone.now()
    sub_variant.save(update_fields=['active', 'updated_at'])


def sync_sub_variants(product):
    """
    Production-style sync after variant/option changes:
    - Block if an active obsolete sub-variant still has stock
    - Archive (active=False) obsolete zero-stock sub-variants — never hard delete
    - Create only missing combinations; reactivate archived matches when possible
    """
    combinations = get_combinations(product)
    valid_option_sets = [{option.id for option in combo} for combo in combinations]

    for sub_variant in product.sub_variants.prefetch_related('options').filter(active=True):
        option_ids = {option.id for option in sub_variant.options.all()}
        if option_ids not in valid_option_sets:
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
            archive_sub_variant(sub_variant)

    return generate_sub_variants(product)


# Backwards-compatible alias used across services/tests
regenerate_sub_variants = sync_sub_variants


def generate_sub_variants(product):
    """
    Create missing sub-variants for all active option combinations.
    Idempotent — existing or archived matches are reactivated, not duplicated.
    """
    combinations = get_combinations(product)
    created = []

    for combo in combinations:
        option_values = [option.value for option in combo]
        name = build_subvariant_name(product.ProductName, option_values)
        existing = _find_subvariant_by_options(product, combo)

        if existing:
            update_fields = []
            if not existing.active:
                existing.active = True
                update_fields.append('active')
            if existing.name != name:
                existing.name = name
                update_fields.append('name')
            new_sku = build_sku_code(product.ProductCode, option_values)
            if existing.sku_code != new_sku:
                existing.sku_code = new_sku
                update_fields.append('sku_code')
            if update_fields:
                existing.updated_at = timezone.now()
                update_fields.append('updated_at')
                existing.save(update_fields=update_fields)
            continue

        sub_variant = SubVariant.objects.create(
            product=product,
            name=name,
            sku_code=build_sku_code(product.ProductCode, option_values),
            stock=0,
            active=True,
        )
        sub_variant.options.set(combo)
        created.append(sub_variant)

    return created


def preview_subvariant_names(product_name, variants_data):
    """
    Preview sub-variant names from unsaved variant data.
    variants_data: [{'name': 'size', 'options': ['S', 'M']}, ...]
    """
    option_groups = []
    for variant in variants_data:
        options = variant.get('options', [])
        if not options:
            raise ValidationError(
                {'variants': f"Variant '{variant.get('name')}' must have at least one option."}
            )
        option_groups.append(options)

    if not option_groups:
        return []

    names = []
    for combo in cartesian_product(*option_groups):
        names.append(build_subvariant_name(product_name, list(combo)))

    return names


def find_sub_variants_with_any_option(product, option_ids, active_only=True):
    """Return sub-variants that include any of the given option IDs."""
    option_ids = set(option_ids)
    matches = []

    queryset = product.sub_variants.prefetch_related('options')
    if active_only:
        queryset = queryset.filter(active=True)

    for sub_variant in queryset:
        sub_option_ids = {option.id for option in sub_variant.options.all()}
        if sub_option_ids & option_ids:
            matches.append(sub_variant)

    return matches
