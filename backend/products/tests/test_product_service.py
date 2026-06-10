from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase

from products.models import ProductVariant
from products.services.product_service import (
    add_variant_to_product,
    create_product_with_variants,
    delete_variant,
)


class ProductServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='productuser', password='test123')

    def test_create_product_with_variants(self):
        product = create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-100',
                'HSNCode': '6205',
                'variants': [
                    {'name': 'size', 'options': ['S', 'M']},
                    {'name': 'color', 'options': ['Red']},
                ],
            },
            self.user,
        )

        self.assertEqual(product.ProductName, 'Shirt')
        self.assertEqual(product.variants.count(), 2)
        self.assertEqual(product.sub_variants.filter(active=True).count(), 2)
        self.assertEqual(product.CreatedUser, self.user)

    def test_duplicate_product_code_rejected(self):
        create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-DUP',
                'variants': [{'name': 'size', 'options': ['S']}],
            },
            self.user,
        )

        with self.assertRaises(ValidationError):
            create_product_with_variants(
                {
                    'name': 'Polo',
                    'ProductCode': 'PROD-DUP',
                    'variants': [{'name': 'size', 'options': ['M']}],
                },
                self.user,
            )

    def test_add_variant_regenerates_subvariants(self):
        product = create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-200',
                'variants': [{'name': 'size', 'options': ['S', 'M']}],
            },
            self.user,
        )
        self.assertEqual(product.sub_variants.filter(active=True).count(), 2)

        add_variant_to_product(
            product,
            {'name': 'color', 'options': ['Red', 'Blue']},
        )

        product.refresh_from_db()
        self.assertEqual(product.variants.count(), 2)
        self.assertEqual(product.sub_variants.filter(active=True).count(), 4)

    def test_delete_variant_archives_subvariants_instead_of_hard_delete(self):
        product = create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-300',
                'variants': [
                    {'name': 'size', 'options': ['S']},
                    {'name': 'color', 'options': ['Red']},
                ],
            },
            self.user,
        )
        variant = product.variants.get(name='color')

        delete_variant(variant)

        product.refresh_from_db()
        self.assertTrue(ProductVariant.objects.filter(pk=variant.pk).exists())
        self.assertFalse(variant.options.filter(active=True).exists())
        self.assertEqual(product.sub_variants.filter(active=True).count(), 1)
        self.assertEqual(product.sub_variants.filter(active=False).count(), 1)
