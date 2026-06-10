from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase

from products.models import StockTransaction
from products.services.product_service import create_product_with_variants
from products.services.stock_service import purchase_stock, sale_stock, sync_product_total_stock


class StockServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='stockuser', password='test123')
        self.product = create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-STOCK',
                'variants': [
                    {'name': 'size', 'options': ['M']},
                    {'name': 'color', 'options': ['Blue']},
                ],
            },
            self.user,
        )
        self.sub_variant = self.product.sub_variants.first()

    def test_purchase_increases_subvariant_and_total_stock(self):
        purchase_stock(self.sub_variant, 50, notes='Initial stock', user=self.user)

        self.sub_variant.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(self.sub_variant.stock, Decimal('50'))
        self.assertEqual(self.product.TotalStock, Decimal('50'))
        self.assertEqual(
            StockTransaction.objects.filter(
                transaction_type=StockTransaction.TransactionType.PURCHASE
            ).count(),
            1,
        )

    def test_sale_decreases_subvariant_and_total_stock(self):
        purchase_stock(self.sub_variant, 50, user=self.user)
        sale_stock(self.sub_variant, 20, notes='Customer order', user=self.user)

        self.sub_variant.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(self.sub_variant.stock, Decimal('30'))
        self.assertEqual(self.product.TotalStock, Decimal('30'))

    def test_sale_with_insufficient_stock_raises_error(self):
        purchase_stock(self.sub_variant, 10, user=self.user)

        with self.assertRaises(ValidationError):
            sale_stock(self.sub_variant, 20, user=self.user)

    def test_zero_quantity_purchase_raises_error(self):
        with self.assertRaises(ValidationError):
            purchase_stock(self.sub_variant, 0, user=self.user)

    def test_running_balance_recorded_on_transaction(self):
        purchase_stock(self.sub_variant, 15, user=self.user)
        sale_stock(self.sub_variant, 5, user=self.user)

        last_transaction = StockTransaction.objects.order_by('created_at').last()
        self.assertEqual(last_transaction.running_balance, Decimal('10'))

    def test_sync_product_total_stock(self):
        purchase_stock(self.sub_variant, 25, user=self.user)
        self.product.TotalStock = Decimal('0')
        self.product.save(update_fields=['TotalStock'])

        sync_product_total_stock(self.product)
        self.product.refresh_from_db()

        self.assertEqual(self.product.TotalStock, Decimal('25'))
