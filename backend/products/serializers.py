from decimal import Decimal
import json

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from versatileimagefield.utils import build_versatileimagefield_url_set, get_rendition_key_set

from products.models import (
    Category,
    Products,
    ProductVariant,
    StockTransaction,
    SubVariant,
    VariantOption,
)
from products.services.subvariant_generator import preview_subvariant_names

PRODUCT_IMAGE_OPENAPI_SCHEMA = {
    'type': 'object',
    'nullable': True,
    'properties': {
        'thumbnail': {'type': 'string', 'format': 'uri'},
        'medium': {'type': 'string', 'format': 'uri'},
        'full': {'type': 'string', 'format': 'uri'},
    },
}


@extend_schema_field(PRODUCT_IMAGE_OPENAPI_SCHEMA)
class ProductImageReadSerializer(serializers.Serializer):
    """Read-only sized URLs for VersatileImageField (thumbnail, medium, full)."""

    def to_representation(self, value):
        if not value or not getattr(value, 'name', None):
            return None
        request = self.context.get('request')
        return build_versatileimagefield_url_set(
            value,
            get_rendition_key_set('product_image'),
            request=request,
        )


def validate_category_id(value):
    if value is not None and not Category.objects.filter(pk=value).exists():
        raise serializers.ValidationError('Category not found.')
    return value


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class VariantOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantOption
        fields = ['id', 'value', 'active']


class VariantInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    options = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


class ProductVariantSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'options', 'created_at']

    def get_options(self, obj):
        include_inactive = self.context.get('include_inactive_options', False)
        queryset = obj.options.all()
        if not include_inactive:
            queryset = queryset.filter(active=True)
        return VariantOptionSerializer(queryset, many=True).data


class VariantWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    options = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


class SubVariantSerializer(serializers.ModelSerializer):
    options = VariantOptionSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.ProductName', read_only=True)
    product_code = serializers.CharField(source='product.ProductCode', read_only=True)
    status = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = SubVariant
        fields = [
            'id',
            'product',
            'product_name',
            'product_code',
            'name',
            'sku_code',
            'stock',
            'low_stock_threshold',
            'is_low_stock',
            'active',
            'status',
            'options',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(serializers.CharField())
    def get_status(self, obj):
        return 'Active' if obj.active else 'Archived'

    @extend_schema_field(serializers.BooleanField())
    def get_is_low_stock(self, obj):
        return obj.is_low_stock()


class ProductListSerializer(serializers.ModelSerializer):
    ProductImage = ProductImageReadSerializer(read_only=True)
    category = CategorySummarySerializer(read_only=True)
    status = serializers.SerializerMethodField()
    low_stock_count = serializers.IntegerField(read_only=True)
    has_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Products
        fields = [
            'id',
            'ProductID',
            'ProductCode',
            'ProductName',
            'ProductImage',
            'category',
            'HSNCode',
            'TotalStock',
            'CreatedDate',
            'Active',
            'status',
            'low_stock_count',
            'has_low_stock',
        ]

    @extend_schema_field(serializers.CharField())
    def get_status(self, obj):
        return 'Active' if obj.Active else 'Inactive'

    @extend_schema_field(serializers.BooleanField())
    def get_has_low_stock(self, obj):
        return getattr(obj, 'low_stock_count', 0) > 0


class ProductDetailSerializer(serializers.ModelSerializer):
    ProductImage = ProductImageReadSerializer(read_only=True)
    category = CategorySummarySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    sub_variants = SubVariantSerializer(many=True, read_only=True)
    created_by = serializers.CharField(source='CreatedUser.username', read_only=True)

    class Meta:
        model = Products
        fields = [
            'id',
            'ProductID',
            'ProductCode',
            'ProductName',
            'ProductImage',
            'category',
            'HSNCode',
            'TotalStock',
            'Active',
            'IsFavourite',
            'CreatedDate',
            'UpdatedDate',
            'created_by',
            'variants',
            'sub_variants',
        ]


class ProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    ProductName = serializers.CharField(max_length=255, required=False)
    ProductCode = serializers.CharField(max_length=255)
    HSNCode = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    ProductImage = serializers.ImageField(required=False, allow_null=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    variants = VariantInputSerializer(many=True)

    def validate_category_id(self, value):
        return validate_category_id(value)

    def to_internal_value(self, data):
        if hasattr(data, 'keys'):
            mutable = {key: data.get(key) for key in data.keys()}
        elif hasattr(data, 'copy'):
            mutable = dict(data.copy())
        else:
            mutable = dict(data)

        variants = mutable.get('variants')
        if isinstance(variants, str):
            try:
                mutable['variants'] = json.loads(variants)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'variants': 'Invalid variants JSON.'}) from exc

        category_id = mutable.get('category_id')
        if category_id == '':
            mutable['category_id'] = None

        return super().to_internal_value(mutable)

    def validate(self, attrs):
        name = (attrs.get('name') or attrs.get('ProductName') or '').strip()
        if not name:
            raise serializers.ValidationError({'name': 'Product name is required.'})
        attrs['resolved_name'] = name

        if not attrs.get('variants'):
            raise serializers.ValidationError({'variants': 'At least one variant is required.'})

        preview_subvariant_names(name, attrs['variants'])
        return attrs


class ProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    ProductName = serializers.CharField(max_length=255, required=False)
    ProductCode = serializers.CharField(max_length=255, required=False)
    HSNCode = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    ProductImage = serializers.ImageField(required=False, allow_null=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    Active = serializers.BooleanField(required=False)
    IsFavourite = serializers.BooleanField(required=False)

    def validate_category_id(self, value):
        return validate_category_id(value)

    def to_internal_value(self, data):
        if hasattr(data, 'keys'):
            mutable = {key: data.get(key) for key in data.keys()}
        elif hasattr(data, 'copy'):
            mutable = dict(data.copy())
        else:
            mutable = dict(data)

        category_id = mutable.get('category_id')
        if category_id == '':
            mutable['category_id'] = None

        return super().to_internal_value(mutable)


class StockPurchaseSerializer(serializers.Serializer):
    sub_variant_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value

    def validate_sub_variant_id(self, value):
        try:
            sub_variant = SubVariant.objects.get(pk=value)
        except SubVariant.DoesNotExist as exc:
            raise serializers.ValidationError('Sub-variant not found.') from exc

        if not sub_variant.active:
            raise serializers.ValidationError('Sub-variant is archived and cannot receive stock.')

        return value


class StockBulkPurchaseSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value

    def validate_product_id(self, value):
        try:
            product = Products.objects.get(pk=value, Active=True)
        except Products.DoesNotExist as exc:
            raise serializers.ValidationError('Product not found or inactive.') from exc

        if not product.sub_variants.filter(active=True).exists():
            raise serializers.ValidationError(
                'This product has no active sub-variants to receive stock.'
            )

        return value


class StockBulkPurchaseResponseSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    product_name = serializers.CharField()
    quantity_per_variant = serializers.DecimalField(max_digits=20, decimal_places=8)
    variants_updated = serializers.IntegerField()
    total_units_added = serializers.DecimalField(max_digits=20, decimal_places=8)


class StockSaleSerializer(serializers.Serializer):
    sub_variant_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        quantity = attrs['quantity']
        if quantity <= 0:
            raise serializers.ValidationError({'quantity': 'Quantity must be greater than zero.'})

        try:
            sub_variant = SubVariant.objects.get(pk=attrs['sub_variant_id'])
        except SubVariant.DoesNotExist as exc:
            raise serializers.ValidationError({'sub_variant_id': 'Sub-variant not found.'}) from exc

        if not sub_variant.active:
            raise serializers.ValidationError(
                {'sub_variant_id': 'Sub-variant is archived and cannot be sold.'}
            )

        if sub_variant.stock < quantity:
            raise serializers.ValidationError(
                {'quantity': f'Insufficient stock. Available: {sub_variant.stock}'}
            )

        attrs['sub_variant'] = sub_variant
        return attrs


class StockLevelSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.ProductName', read_only=True)
    product_code = serializers.CharField(source='product.ProductCode', read_only=True)
    options = VariantOptionSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = SubVariant
        fields = [
            'id',
            'product_id',
            'product_name',
            'product_code',
            'name',
            'sku_code',
            'stock',
            'low_stock_threshold',
            'is_low_stock',
            'active',
            'status',
            'options',
            'updated_at',
        ]

    @extend_schema_field(serializers.CharField())
    def get_status(self, obj):
        return 'Active' if obj.active else 'Archived'

    @extend_schema_field(serializers.BooleanField())
    def get_is_low_stock(self, obj):
        return obj.is_low_stock()


class StockTransactionSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source='sub_variant.product.id', read_only=True)
    product_name = serializers.CharField(source='sub_variant.product.ProductName', read_only=True)
    sub_variant_name = serializers.CharField(source='sub_variant.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)

    class Meta:
        model = StockTransaction
        fields = [
            'id',
            'created_at',
            'product_id',
            'product_name',
            'sub_variant',
            'sub_variant_name',
            'transaction_type',
            'quantity',
            'notes',
            'running_balance',
            'created_by',
            'created_by_username',
        ]


class DashboardTopProductSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    ProductCode = serializers.CharField()
    ProductName = serializers.CharField()
    TotalStock = serializers.DecimalField(max_digits=20, decimal_places=8)


class StockMovementSerializer(serializers.Serializer):
    date = serializers.DateField()
    purchase = serializers.DecimalField(max_digits=20, decimal_places=8)
    sale = serializers.DecimalField(max_digits=20, decimal_places=8)


class SubVariantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubVariant
        fields = ['low_stock_threshold']

    def validate_low_stock_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError('Threshold must be zero or greater.')
        return value


class DashboardLowStockSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    product_id = serializers.UUIDField()
    product_name = serializers.CharField()
    product_code = serializers.CharField()
    stock = serializers.DecimalField(max_digits=20, decimal_places=8)
    low_stock_threshold = serializers.DecimalField(max_digits=20, decimal_places=8)


class DashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_stock_units = serializers.DecimalField(max_digits=20, decimal_places=8)
    total_sales_units = serializers.DecimalField(max_digits=20, decimal_places=8)
    sales_count = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    low_stock_alerts = DashboardLowStockSerializer(many=True)
    top_products_by_stock = DashboardTopProductSerializer(many=True)
    recent_transactions = StockTransactionSerializer(many=True)
    stock_movements = StockMovementSerializer(many=True)
    movements_days = serializers.IntegerField()
