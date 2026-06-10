import django_filters

from products.models import Products, StockTransaction


class ProductFilterSet(django_filters.FilterSet):
    category = django_filters.UUIDFilter(field_name='category_id')
    uncategorized = django_filters.BooleanFilter(method='filter_uncategorized')

    class Meta:
        model = Products
        fields = ['category']

    def filter_uncategorized(self, queryset, name, value):
        if value:
            return queryset.filter(category__isnull=True)
        return queryset


class StockReportFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(method='filter_start_date')
    end_date = django_filters.DateFilter(method='filter_end_date')
    product_id = django_filters.UUIDFilter(field_name='sub_variant__product_id')
    transaction_type = django_filters.ChoiceFilter(choices=StockTransaction.TransactionType.choices)

    class Meta:
        model = StockTransaction
        fields = ['start_date', 'end_date', 'product_id', 'transaction_type']

    def filter_start_date(self, queryset, name, value):
        return queryset.filter(created_at__date__gte=value)

    def filter_end_date(self, queryset, name, value):
        return queryset.filter(created_at__date__lte=value)
