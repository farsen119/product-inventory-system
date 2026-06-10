from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from products.models import Products, StockTransaction, SubVariant


def _parse_positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed < 1:
        return default
    if maximum is not None:
        return min(parsed, maximum)
    return parsed


def _build_stock_movements(days):
    since = timezone.now() - timedelta(days=days)
    aggregated = (
        StockTransaction.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate('created_at'))
        .values('day', 'transaction_type')
        .annotate(total=Sum('quantity'))
        .order_by('day')
    )

    movement_map = {}
    for row in aggregated:
        day = row['day']
        if day is None:
            continue
        day_key = day.isoformat()
        if day_key not in movement_map:
            movement_map[day_key] = {
                'date': day_key,
                'purchase': Decimal('0'),
                'sale': Decimal('0'),
            }
        if row['transaction_type'] == StockTransaction.TransactionType.PURCHASE:
            movement_map[day_key]['purchase'] = row['total'] or Decimal('0')
        elif row['transaction_type'] == StockTransaction.TransactionType.SALE:
            movement_map[day_key]['sale'] = row['total'] or Decimal('0')

    movements = []
    start_day = since.date()
    end_day = timezone.now().date()
    current = start_day
    while current <= end_day:
        day_key = current.isoformat()
        movements.append(
            movement_map.get(
                day_key,
                {'date': day_key, 'purchase': Decimal('0'), 'sale': Decimal('0')},
            )
        )
        current += timedelta(days=1)

    return movements


def _low_stock_queryset():
    return SubVariant.objects.filter(active=True, stock__lte=F('low_stock_threshold'))


def get_dashboard_data(days=30, recent_limit=10, top_limit=5, alerts_limit=10):
    """
    Aggregate dashboard metrics for the analytics page.

    Returns a dict ready for DashboardSerializer.
    """
    days = _parse_positive_int(days, default=30, maximum=365)
    recent_limit = _parse_positive_int(recent_limit, default=10, maximum=50)
    top_limit = _parse_positive_int(top_limit, default=5, maximum=20)

    active_products = Products.objects.filter(Active=True)
    total_products = active_products.count()

    total_stock_units = (
        SubVariant.objects.filter(active=True).aggregate(total=Sum('stock'))['total']
        or Decimal('0')
    )

    top_products = list(
        active_products.order_by('-TotalStock', 'ProductName').values(
            'id',
            'ProductCode',
            'ProductName',
            'TotalStock',
        )[:top_limit]
    )

    recent_transactions = list(
        StockTransaction.objects.select_related(
            'sub_variant__product',
            'created_by',
        ).order_by('-created_at')[:recent_limit]
    )

    stock_movements = _build_stock_movements(days)

    since = timezone.now() - timedelta(days=days)
    sales_agg = StockTransaction.objects.filter(
        created_at__gte=since,
        transaction_type=StockTransaction.TransactionType.SALE,
    ).aggregate(total=Sum('quantity'), count=Count('id'))
    total_sales_units = sales_agg['total'] or Decimal('0')
    sales_count = sales_agg['count'] or 0

    low_stock_qs = _low_stock_queryset().select_related('product')
    low_stock_count = low_stock_qs.count()
    low_stock_alerts = [
        {
            'id': item.id,
            'name': item.name,
            'product_id': item.product_id,
            'product_name': item.product.ProductName,
            'product_code': item.product.ProductCode,
            'stock': item.stock,
            'low_stock_threshold': item.low_stock_threshold,
        }
        for item in low_stock_qs.order_by('stock', 'name')[:alerts_limit]
    ]

    return {
        'total_products': total_products,
        'total_stock_units': total_stock_units,
        'total_sales_units': total_sales_units,
        'sales_count': sales_count,
        'low_stock_count': low_stock_count,
        'low_stock_alerts': low_stock_alerts,
        'top_products_by_stock': top_products,
        'recent_transactions': recent_transactions,
        'stock_movements': stock_movements,
        'movements_days': days,
    }
