from decimal import Decimal
import json
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from products.models import Category, Products, StockTransaction
from products.services.product_service import create_product_with_variants


def make_test_image(name='test.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (800, 600), color='red').save(buffer, 'JPEG')
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type='image/jpeg')


class ProductAPITests(APITestCase):
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
                'ProductCode': 'PROD-API-001',
                'HSNCode': '6205',
                'variants': [
                    {'name': 'size', 'options': ['S', 'M']},
                    {'name': 'color', 'options': ['Red', 'Blue']},
                ],
            },
            self.admin,
        )
        self.sub_variant = self.product.sub_variants.first()
        self.category = Category.objects.create(
            name='Apparel',
            description='Clothing and wearables',
        )

    def _auth(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_unauthenticated_request_returns_401(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_product_via_api(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Jeans',
                'ProductCode': 'PROD-API-002',
                'HSNCode': '6203',
                'variants': [
                    {'name': 'size', 'options': ['32', '34']},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ProductName'], 'Jeans')
        self.assertEqual(len(response.data['sub_variants']), 2)

    def test_list_products_paginated(self):
        self._auth(self.user)
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_retrieve_product_detail(self):
        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['variants']), 2)
        self.assertEqual(len(response.data['sub_variants']), 4)
        self.assertIsNone(response.data['ProductImage'])
        first_sub = response.data['sub_variants'][0]
        self.assertIn('low_stock_threshold', first_sub)
        self.assertIn('is_low_stock', first_sub)
        self.assertEqual(Decimal(first_sub['low_stock_threshold']), Decimal('5'))
        self.assertTrue(first_sub['is_low_stock'])

    def test_is_low_stock_false_when_stock_above_threshold(self):
        self.sub_variant.stock = Decimal('10')
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.save()

        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/')
        sub = next(
            item for item in response.data['sub_variants']
            if item['id'] == str(self.sub_variant.id)
        )
        self.assertFalse(sub['is_low_stock'])

    def test_is_low_stock_true_when_stock_at_threshold(self):
        self.sub_variant.stock = Decimal('5')
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.save()

        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/')
        sub = next(
            item for item in response.data['sub_variants']
            if item['id'] == str(self.sub_variant.id)
        )
        self.assertTrue(sub['is_low_stock'])

    def test_is_low_stock_false_for_archived_subvariant(self):
        self.sub_variant.stock = Decimal('0')
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.active = False
        self.sub_variant.save()

        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/')
        sub = next(
            item for item in response.data['sub_variants']
            if item['id'] == str(self.sub_variant.id)
        )
        self.assertFalse(sub['is_low_stock'])

    def test_stock_levels_include_low_stock_flag(self):
        self.sub_variant.stock = Decimal('2')
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.save()

        self._auth(self.user)
        response = self.client.get('/api/stock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(
            item for item in response.data['results']
            if item['id'] == str(self.sub_variant.id)
        )
        self.assertTrue(row['is_low_stock'])
        self.assertEqual(Decimal(row['low_stock_threshold']), Decimal('5'))

    def test_create_product_with_image_returns_sized_urls(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/products/',
            {
                'ProductName': 'Jacket',
                'ProductCode': 'PROD-IMG-001',
                'variants': json.dumps([{'name': 'size', 'options': ['L']}]),
                'ProductImage': make_test_image(),
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image_data = response.data['ProductImage']
        self.assertIn('thumbnail', image_data)
        self.assertIn('medium', image_data)
        self.assertIn('full', image_data)
        self.assertTrue(image_data['thumbnail'].startswith('http'))

    def test_list_product_with_image_includes_thumbnail(self):
        self._auth(self.user)
        create_response = self.client.post(
            '/api/products/',
            {
                'ProductName': 'Cap',
                'ProductCode': 'PROD-IMG-002',
                'variants': json.dumps([{'name': 'size', 'options': ['One']}]),
                'ProductImage': make_test_image('cap.jpg'),
            },
            format='multipart',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get('/api/products/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        cap = next(
            item for item in list_response.data['results']
            if item['ProductCode'] == 'PROD-IMG-002'
        )
        self.assertIn('thumbnail', cap['ProductImage'])
        self.assertIn('medium', cap['ProductImage'])
        self.assertIn('full', cap['ProductImage'])

    def test_update_product_image(self):
        self._auth(self.user)
        response = self.client.patch(
            f'/api/products/{self.product.id}/',
            {'ProductImage': make_test_image('updated.jpg')},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('thumbnail', response.data['ProductImage'])

    def test_list_product_variants(self):
        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/variants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 2)

    def test_list_subvariants(self):
        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/subvariants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 4)

    def test_product_list_includes_low_stock_count(self):
        self._auth(self.user)
        self.sub_variant.low_stock_threshold = Decimal('5')
        self.sub_variant.stock = Decimal('2')
        self.sub_variant.save(update_fields=['low_stock_threshold', 'stock'])

        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data['results'] if item['id'] == str(self.product.id))
        self.assertGreaterEqual(row['low_stock_count'], 1)
        self.assertTrue(row['has_low_stock'])

    def test_patch_subvariant_threshold(self):
        self._auth(self.user)
        response = self.client.patch(
            f'/api/subvariants/{self.sub_variant.id}/',
            {'low_stock_threshold': '10'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['low_stock_threshold']), Decimal('10'))
        self.sub_variant.refresh_from_db()
        self.assertEqual(self.sub_variant.low_stock_threshold, Decimal('10'))

    def test_patch_variant_updates_name_only(self):
        self._auth(self.user)
        variant = self.product.variants.get(name='size')
        response = self.client.patch(
            f'/api/variants/{variant.id}/',
            {'name': 'Size'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Size')
        variant.refresh_from_db()
        self.assertEqual(variant.name, 'Size')

    def test_purchase_stock(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/stock/purchase/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '25',
                'notes': 'Initial stock',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.TotalStock, Decimal('25'))

    def test_bulk_purchase_stock_all_sub_variants(self):
        self._auth(self.user)
        active_count = self.product.sub_variants.filter(active=True).count()
        self.assertEqual(active_count, 4)

        response = self.client.post(
            '/api/stock/purchase/bulk/',
            {
                'product_id': str(self.product.id),
                'quantity': '10',
                'notes': 'Bulk shipment',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['variants_updated'], 4)
        self.assertEqual(Decimal(response.data['quantity_per_variant']), Decimal('10'))
        self.assertEqual(Decimal(response.data['total_units_added']), Decimal('40'))

        self.product.refresh_from_db()
        self.assertEqual(self.product.TotalStock, Decimal('40'))
        for sub_variant in self.product.sub_variants.filter(active=True):
            sub_variant.refresh_from_db()
            self.assertEqual(sub_variant.stock, Decimal('10'))

    def test_bulk_purchase_no_active_sub_variants_returns_400(self):
        self._auth(self.user)
        self.product.sub_variants.update(active=False)

        response = self.client.post(
            '/api/stock/purchase/bulk/',
            {
                'product_id': str(self.product.id),
                'quantity': '5',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sale_stock_insufficient_returns_400(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/stock/sale/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '10',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_stock_levels_list(self):
        self._auth(self.user)
        response = self.client.get('/api/stock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_stock_report_admin_only(self):
        self._auth(self.user)
        response = self.client.get('/api/stock/report/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        response = self.client.get('/api/stock/report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_product_requires_admin(self):
        self._auth(self.user)
        response = self.client.delete(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        response = self.client.delete(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertFalse(self.product.Active)

    def test_add_variant_to_product(self):
        self._auth(self.user)
        response = self.client.post(
            f'/api/products/{self.product.id}/variants/',
            {'name': 'material', 'options': ['Cotton']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.variants.count(), 3)
        self.assertEqual(self.product.sub_variants.filter(active=True).count(), 4)
        self.assertEqual(self.product.sub_variants.filter(active=False).count(), 4)

    def test_list_categories(self):
        self._auth(self.user)
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['results'][0]['name'], 'Apparel')

    def test_create_category_requires_admin(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/categories/',
            {'name': 'Furniture', 'description': 'Home furniture'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        response = self.client.post(
            '/api/categories/',
            {'name': 'Furniture', 'description': 'Home furniture'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Furniture')

    def test_update_category_admin_only(self):
        self._auth(self.admin)
        response = self.client.patch(
            f'/api/categories/{self.category.id}/',
            {'description': 'Updated description'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'Updated description')

    def test_delete_category_admin_only(self):
        extra = Category.objects.create(name='Temporary', description='To delete')
        self._auth(self.user)
        response = self.client.delete(f'/api/categories/{extra.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        response = self.client.delete(f'/api/categories/{extra.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(pk=extra.id).exists())

    def test_create_product_with_category(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Jeans',
                'ProductCode': 'PROD-CAT-001',
                'category_id': str(self.category.id),
                'variants': [
                    {'name': 'size', 'options': ['32']},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['category']['name'], 'Apparel')

    def test_create_product_without_category(self):
        self._auth(self.user)
        response = self.client.get(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])

    def test_create_product_invalid_category_returns_400(self):
        self._auth(self.user)
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Hat',
                'ProductCode': 'PROD-CAT-BAD',
                'category_id': '00000000-0000-0000-0000-000000000001',
                'variants': [{'name': 'size', 'options': ['One']}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_products_by_category(self):
        self._auth(self.user)
        self.product.category = self.category
        self.product.save()

        response = self.client.get(f'/api/products/?category={self.category.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [item['ProductCode'] for item in response.data['results']]
        self.assertIn('PROD-API-001', codes)

        other = Category.objects.create(name='Electronics', description='Devices')
        response = self.client.get(f'/api/products/?category={other.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_filter_uncategorized_products(self):
        self._auth(self.user)
        self.product.category = self.category
        self.product.save()

        response = self.client.get('/api/products/?uncategorized=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [item['ProductCode'] for item in response.data['results']]
        self.assertNotIn('PROD-API-001', codes)

        self.product.category = None
        self.product.save()
        response = self.client.get('/api/products/?uncategorized=true')
        codes = [item['ProductCode'] for item in response.data['results']]
        self.assertIn('PROD-API-001', codes)

    def test_update_product_category(self):
        self._auth(self.user)
        response = self.client.patch(
            f'/api/products/{self.product.id}/',
            {'category_id': str(self.category.id)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['category']['name'], 'Apparel')

    def test_clear_product_category(self):
        self._auth(self.user)
        self.product.category = self.category
        self.product.save()

        response = self.client.patch(
            f'/api/products/{self.product.id}/',
            {'category_id': None},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])

    def test_stock_report_after_transactions(self):
        self._auth(self.user)
        self.client.post(
            '/api/stock/purchase/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '15',
                'notes': 'Purchase',
            },
            format='json',
        )
        self.client.post(
            '/api/stock/sale/',
            {
                'sub_variant_id': str(self.sub_variant.id),
                'quantity': '5',
                'notes': 'Sale',
            },
            format='json',
        )

        self._auth(self.admin)
        response = self.client.get('/api/stock/report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(
            response.data['results'][0]['transaction_type'],
            StockTransaction.TransactionType.SALE,
        )
