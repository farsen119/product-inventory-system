from django.contrib import admin, messages
from django.utils.html import format_html

from .models import (
    Category,
    Products,
    ProductVariant,
    StockTransaction,
    SubVariant,
    VariantOption,
)


class VariantOptionInline(admin.TabularInline):
    model = VariantOption
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    show_change_link = True


class SubVariantInline(admin.TabularInline):
    model = SubVariant
    extra = 0
    show_change_link = True
    readonly_fields = ['name', 'sku_code', 'stock', 'active', 'updated_at']
    fields = ['name', 'sku_code', 'stock', 'active', 'updated_at']
    can_delete = False


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):
    list_display = [
        'ProductName',
        'ProductCode',
        'category',
        'ProductID',
        'display_total_stock',
        'display_status',
        'IsFavourite',
        'CreatedDate',
        'CreatedUser',
    ]
    list_filter = ['Active', 'IsFavourite', 'category', 'CreatedDate']
    search_fields = ['ProductName', 'ProductCode', 'HSNCode', 'ProductID']
    readonly_fields = ['id', 'ProductID', 'CreatedDate', 'TotalStock', 'UpdatedDate']
    list_per_page = 25
    date_hierarchy = 'CreatedDate'
    inlines = [ProductVariantInline, SubVariantInline]
    ordering = ('-CreatedDate',)
    actions = ['make_active', 'make_inactive']

    fieldsets = (
        ('Product Information', {
            'fields': ('ProductName', 'ProductCode', 'ProductID', 'HSNCode', 'category', 'ProductImage'),
        }),
        ('Stock & Status', {
            'fields': ('TotalStock', 'Active', 'IsFavourite'),
        }),
        ('Audit', {
            'fields': ('CreatedUser', 'CreatedDate', 'UpdatedDate', 'id'),
        }),
    )

    @admin.display(description='Total Stock', ordering='TotalStock')
    def display_total_stock(self, obj):
        return obj.TotalStock or 0

    @admin.display(description='Status', ordering='Active')
    def display_status(self, obj):
        if obj.Active:
            return format_html('<span style="color:green;">Active</span>')
        return format_html('<span style="color:red;">Inactive</span>')

    @admin.action(description='Mark selected products as active')
    def make_active(self, request, queryset):
        updated = queryset.update(Active=True)
        self.message_user(request, f'{updated} product(s) marked active.', messages.SUCCESS)

    @admin.action(description='Mark selected products as inactive')
    def make_inactive(self, request, queryset):
        updated = queryset.update(Active=False)
        self.message_user(request, f'{updated} product(s) marked inactive.', messages.SUCCESS)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['name', 'product', 'option_count', 'created_at']
    list_filter = ['created_at', 'product']
    search_fields = ['name', 'product__ProductName', 'product__ProductCode']
    inlines = [VariantOptionInline]
    list_select_related = ['product']

    @admin.display(description='Options')
    def option_count(self, obj):
        return obj.options.count()


@admin.register(VariantOption)
class VariantOptionAdmin(admin.ModelAdmin):
    list_display = ['value', 'variant', 'active', 'variant_product']
    list_filter = ['active', 'variant__product']
    search_fields = ['value', 'variant__name', 'variant__product__ProductName']
    list_select_related = ['variant__product']

    @admin.display(description='Product')
    def variant_product(self, obj):
        return obj.variant.product.ProductName


class StockTransactionInline(admin.TabularInline):
    model = StockTransaction
    extra = 0
    can_delete = False
    readonly_fields = [
        'transaction_type',
        'quantity',
        'running_balance',
        'notes',
        'created_by',
        'created_at',
    ]
    fields = readonly_fields
    ordering = ('-created_at',)


@admin.register(SubVariant)
class SubVariantAdmin(admin.ModelAdmin):
    list_display = ['name', 'product', 'sku_code', 'stock', 'low_stock_threshold', 'active', 'updated_at']
    list_filter = ['active', 'product', 'updated_at']
    search_fields = ['name', 'sku_code', 'product__ProductName', 'product__ProductCode']
    filter_horizontal = ['options']
    readonly_fields = ['created_at', 'updated_at']
    list_select_related = ['product']
    inlines = [StockTransactionInline]
    fieldsets = (
        (None, {
            'fields': ('product', 'name', 'sku_code', 'options'),
        }),
        ('Stock', {
            'fields': ('stock', 'low_stock_threshold', 'active'),
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
        }),
    )


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'created_at',
        'transaction_type',
        'product_name',
        'sub_variant',
        'quantity',
        'running_balance',
        'created_by',
    ]
    list_filter = ['transaction_type', 'created_at', 'sub_variant__product']
    search_fields = [
        'sub_variant__name',
        'sub_variant__product__ProductName',
        'sub_variant__product__ProductCode',
        'notes',
    ]
    readonly_fields = ['id', 'created_at', 'running_balance']
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    list_per_page = 30
    list_select_related = ['sub_variant__product', 'created_by']

    @admin.display(description='Product', ordering='sub_variant__product__ProductName')
    def product_name(self, obj):
        return obj.sub_variant.product.ProductName
