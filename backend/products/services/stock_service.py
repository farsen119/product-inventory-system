from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from products.logging_utils import log_stock_event
from products.models import StockTransaction


def sync_product_total_stock(product):
    """Recalculate product TotalStock from active sub-variants only."""
    total = (
        product.sub_variants.filter(active=True).aggregate(total=Sum('stock'))['total']
        or Decimal('0')
    )
    product.TotalStock = total
    product.UpdatedDate = timezone.now()
    product.save(update_fields=['TotalStock', 'UpdatedDate'])
    return product


@transaction.atomic
def purchase_stock(sub_variant, quantity, notes='', user=None):
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValidationError({'quantity': 'Quantity must be greater than zero.'})

    sub_variant = sub_variant.__class__.objects.select_for_update().get(pk=sub_variant.pk)
    if not sub_variant.active:
        raise ValidationError({'sub_variant_id': 'Cannot purchase stock for an archived sub-variant.'})

    sub_variant.stock += quantity
    sub_variant.save(update_fields=['stock', 'updated_at'])

    product = sub_variant.product
    product = product.__class__.objects.select_for_update().get(pk=product.pk)
    product.TotalStock = (product.TotalStock or Decimal('0')) + quantity
    product.UpdatedDate = timezone.now()
    product.save(update_fields=['TotalStock', 'UpdatedDate'])

    txn = StockTransaction.objects.create(
        sub_variant=sub_variant,
        transaction_type=StockTransaction.TransactionType.PURCHASE,
        quantity=quantity,
        notes=notes or '',
        running_balance=sub_variant.stock,
        created_by=user,
    )
    log_stock_event('PURCHASE', sub_variant, quantity, user, notes)
    return txn


@transaction.atomic
def bulk_purchase_stock(product, quantity, notes='', user=None):
    """
    Add the same purchase quantity to every active sub-variant of a product.
    """
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValidationError({'quantity': 'Quantity must be greater than zero.'})

    product = product.__class__.objects.select_for_update().get(pk=product.pk)
    sub_variants = list(
        product.sub_variants.filter(active=True).select_for_update().order_by('name')
    )
    if not sub_variants:
        raise ValidationError(
            {'product_id': 'This product has no active sub-variants to receive stock.'}
        )

    transactions = []
    total_added = quantity * len(sub_variants)

    for sub_variant in sub_variants:
        sub_variant.stock += quantity
        sub_variant.save(update_fields=['stock', 'updated_at'])
        txn = StockTransaction.objects.create(
            sub_variant=sub_variant,
            transaction_type=StockTransaction.TransactionType.PURCHASE,
            quantity=quantity,
            notes=notes or '',
            running_balance=sub_variant.stock,
            created_by=user,
        )
        log_stock_event('PURCHASE', sub_variant, quantity, user, notes)
        transactions.append(txn)

    product.TotalStock = (product.TotalStock or Decimal('0')) + total_added
    product.UpdatedDate = timezone.now()
    product.save(update_fields=['TotalStock', 'UpdatedDate'])

    return {
        'product': product,
        'quantity_per_variant': quantity,
        'variants_updated': len(sub_variants),
        'total_units_added': total_added,
        'transactions': transactions,
    }


@transaction.atomic
def sale_stock(sub_variant, quantity, notes='', user=None):
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValidationError({'quantity': 'Quantity must be greater than zero.'})

    sub_variant = sub_variant.__class__.objects.select_for_update().get(pk=sub_variant.pk)
    if not sub_variant.active:
        raise ValidationError({'sub_variant_id': 'Cannot sell stock for an archived sub-variant.'})

    if sub_variant.stock < quantity:
        raise ValidationError(
            {'quantity': f'Insufficient stock. Available: {sub_variant.stock}'}
        )

    sub_variant.stock -= quantity
    sub_variant.save(update_fields=['stock', 'updated_at'])

    product = sub_variant.product
    product = product.__class__.objects.select_for_update().get(pk=product.pk)
    product.TotalStock = (product.TotalStock or Decimal('0')) - quantity
    product.UpdatedDate = timezone.now()
    product.save(update_fields=['TotalStock', 'UpdatedDate'])

    txn = StockTransaction.objects.create(
        sub_variant=sub_variant,
        transaction_type=StockTransaction.TransactionType.SALE,
        quantity=quantity,
        notes=notes or '',
        running_balance=sub_variant.stock,
        created_by=user,
    )
    log_stock_event('SALE', sub_variant, quantity, user, notes)
    return txn
