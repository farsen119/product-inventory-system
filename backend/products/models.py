import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from versatileimagefield.fields import VersatileImageField


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('category')
        verbose_name_plural = _('categories')
        ordering = ('name',)

    def __str__(self):
        return self.name


class Products(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ProductID = models.BigIntegerField(unique=True)
    ProductCode = models.CharField(max_length=255, unique=True)
    ProductName = models.CharField(max_length=255)
    ProductImage = VersatileImageField(upload_to='uploads/', blank=True, null=True)
    CreatedDate = models.DateTimeField(auto_now_add=True)
    UpdatedDate = models.DateTimeField(blank=True, null=True)
    CreatedUser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='user%(class)s_objects',
        on_delete=models.CASCADE,
    )
    IsFavourite = models.BooleanField(default=False)
    Active = models.BooleanField(default=True, db_index=True)
    HSNCode = models.CharField(max_length=255, blank=True, null=True)
    category = models.ForeignKey(
        'Category',
        related_name='products',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        db_index=True,
    )
    TotalStock = models.DecimalField(
        default=0.00,
        max_digits=20,
        decimal_places=8,
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'products_product'
        verbose_name = _('product')
        verbose_name_plural = _('products')
        unique_together = (('ProductCode', 'ProductID'),)
        ordering = ('-CreatedDate', 'ProductID')

    def __str__(self):
        return self.ProductName


class ProductVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Products,
        related_name='variants',
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('product variant')
        verbose_name_plural = _('product variants')
        unique_together = (('product', 'name'),)
        ordering = ('name',)

    def __str__(self):
        return f'{self.product.ProductName} - {self.name}'


class VariantOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.ForeignKey(
        ProductVariant,
        related_name='options',
        on_delete=models.CASCADE,
    )
    value = models.CharField(max_length=255)
    active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = _('variant option')
        verbose_name_plural = _('variant options')
        unique_together = (('variant', 'value'),)
        ordering = ('value',)

    def __str__(self):
        return f'{self.variant.name}: {self.value}'


class SubVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Products,
        related_name='sub_variants',
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=500)
    sku_code = models.CharField(max_length=255, blank=True, default='')
    stock = models.DecimalField(
        default=0,
        max_digits=20,
        decimal_places=8,
    )
    low_stock_threshold = models.DecimalField(
        default=5,
        max_digits=20,
        decimal_places=8,
    )
    active = models.BooleanField(default=True, db_index=True)
    options = models.ManyToManyField(
        VariantOption,
        related_name='sub_variants',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('sub variant')
        verbose_name_plural = _('sub variants')
        unique_together = (('product', 'name'),)
        ordering = ('name',)

    def __str__(self):
        return self.name

    def is_low_stock(self):
        if not self.active:
            return False
        return self.stock <= self.low_stock_threshold


class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        PURCHASE = 'PURCHASE', _('Purchase')
        SALE = 'SALE', _('Sale')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_variant = models.ForeignKey(
        SubVariant,
        related_name='transactions',
        on_delete=models.CASCADE,
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
    )
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    notes = models.TextField(blank=True, default='')
    running_balance = models.DecimalField(max_digits=20, decimal_places=8)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='stock_transactions',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = _('stock transaction')
        verbose_name_plural = _('stock transactions')
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['sub_variant', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
        ]

    def __str__(self):
        return f'{self.transaction_type} {self.quantity} - {self.sub_variant.name}'
