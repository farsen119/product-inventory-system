from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from products.services.product_service import create_product_with_variants


class DashboardAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='admin123',
        )
        self.user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            password='staff123',
        )
        self.product = create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-DASH-001',
                'variants': [
                    {'name': 'size', 'options': ['S', 'M']},
                    {'name': 'color', 'options': ['Red', 'Blue']},
                ],
            },
            self.admin,
        )
        self.sub_variant = self.product.sub_variants.first()

    def _auth(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_dashboard_requires_authentication(self):
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_returns_summary(self):
        self._auth(self.user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 1)
        self.assertIn('total_stock_units', response.data)
        self.assertIn('total_sales_units', response.data)
        self.assertIn('sales_count', response.data)
        self.assertIn('low_stock_count', response.data)
        self.assertIn('low_stock_alerts', response.data)
        self.assertIn('top_products_by_stock', response.data)
        self.assertIn('recent_transactions', response.data)
        self.assertIn('stock_movements', response.data)
        self.assertEqual(response.data['movements_days'], 30)

    def test_dashboard_top_products_ordered_by_stock(self):
        other = create_product_with_variants(
            {
                'name': 'Jeans',
                'ProductCode': 'PROD-DASH-002',
                'variants': [{'name': 'size', 'options': ['32']}],
            },
            self.admin,
        )
        other.TotalStock = Decimal('100')
        other.save(update_fields=['TotalStock'])
        self.product.TotalStock = Decimal('10')
        self.product.save(update_fields=['TotalStock'])

        self._auth(self.user)
        response = self.client.get('/api/dashboard/?top_limit=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        top = response.data['top_products_by_stock']
        self.assertLessEqual(len(top), 5)
        self.assertEqual(top[0]['ProductCode'], 'PROD-DASH-002')
        self.assertEqual(Decimal(top[0]['TotalStock']), Decimal('100'))

    def test_dashboard_includes_recent_transaction_after_purchase(self):
        self._auth(self.user)
        purchase_response = self.client.post(
            '/api/stock/purchase/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '12',
                'notes': 'Dashboard test purchase',
            },
            format='json',
        )
        self.assertEqual(purchase_response.status_code, status.HTTP_201_CREATED)

        response = self.client.get('/api/dashboard/?recent_limit=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['recent_transactions']), 1)
        latest = response.data['recent_transactions'][0]
        self.assertEqual(latest['transaction_type'], 'PURCHASE')
        self.assertEqual(Decimal(latest['quantity']), Decimal('12'))

    def test_dashboard_stock_movements_include_purchase_day(self):
        self._auth(self.user)
        self.client.post(
            '/api/stock/purchase/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '8',
                'notes': 'Movement chart test',
            },
            format='json',
        )

        response = self.client.get('/api/dashboard/?days=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        movements = response.data['stock_movements']
        self.assertGreaterEqual(len(movements), 1)
        self.assertTrue(any(Decimal(item['purchase']) > 0 for item in movements))

    def test_dashboard_sales_units_after_sale(self):
        self._auth(self.user)
        self.client.post(
            '/api/stock/purchase/',
            {'sub_variant_id': str(self.sub_variant.id), 'quantity': '20'},
            format='json',
        )
        self.client.post(
            '/api/stock/sale/',
            {'sub_variant_id': str(self.sub_variant.id), 'quantity': '5'},
            format='json',
        )

        response = self.client.get('/api/dashboard/?days=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['total_sales_units']), Decimal('5'))
        self.assertEqual(response.data['sales_count'], 1)

    def test_dashboard_low_stock_alerts(self):
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.stock = Decimal('3')
        self.sub_variant.save(update_fields=['low_stock_threshold', 'stock'])

        self._auth(self.user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['low_stock_count'], 1)
        self.assertTrue(any(item['id'] == str(self.sub_variant.id) for item in response.data['low_stock_alerts']))

    def test_dashboard_excludes_inactive_products_from_count(self):
        self.product.Active = False
        self.product.save(update_fields=['Active'])

        self._auth(self.user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 0)
        self.assertEqual(len(response.data['top_products_by_stock']), 0)
