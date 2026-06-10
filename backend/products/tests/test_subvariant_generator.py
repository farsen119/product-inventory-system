from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase

from products.models import Products, SubVariant
from products.services.product_service import (
    add_variant_to_product,
    create_product_with_variants,
    delete_variant,
    update_variant,
)
from products.services.subvariant_generator import (
    generate_sub_variants,
    preview_subvariant_names,
)


class SubVariantGeneratorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='test123')

    def _create_shirt_product(self):
        return create_product_with_variants(
            {
                'name': 'Shirt',
                'ProductCode': 'PROD-001',
                'variants': [
                    {'name': 'size', 'options': ['S', 'M', 'L']},
                    {'name': 'color', 'options': ['Red', 'Blue']},
                ],
            },
            self.user,
        )

    def test_generates_cartesian_product_subvariants(self):
        product = self._create_shirt_product()
        self.assertEqual(product.sub_variants.filter(active=True).count(), 6)

    def test_preview_subvariant_names(self):
        names = preview_subvariant_names(
            'Shirt',
            [
                {'name': 'size', 'options': ['S', 'M']},
                {'name': 'color', 'options': ['Red', 'Blue']},
            ],
        )
        self.assertEqual(len(names), 4)
        self.assertIn('Shirt / S / Red', names)

    def test_generate_is_idempotent(self):
        product = self._create_shirt_product()
        created = generate_sub_variants(product)
        self.assertEqual(created, [])
        self.assertEqual(product.sub_variants.filter(active=True).count(), 6)

    def test_duplicate_combination_not_created_twice(self):
        product = self._create_shirt_product()
        before = product.sub_variants.filter(active=True).count()
        generate_sub_variants(product)
        self.assertEqual(product.sub_variants.filter(active=True).count(), before)

    def test_add_option_creates_only_missing_subvariants(self):
        product = create_product_with_variants(
            {
                'name': 'Shoe',
                'ProductCode': 'PROD-SHOE',
                'variants': [
                    {'name': 'size', 'options': ['30', '32']},
                    {'name': 'color', 'options': ['Black']},
                ],
            },
            self.user,
        )
        self.assertEqual(product.sub_variants.filter(active=True).count(), 2)

        size_variant = product.variants.get(name='size')
        update_variant(size_variant, {'name': 'size', 'options': ['30', '32', '36']})

        product.refresh_from_db()
        self.assertEqual(product.sub_variants.filter(active=True).count(), 3)
        self.assertTrue(
            product.sub_variants.filter(active=True, name__contains='36').exists()
        )

    def test_remove_option_archives_zero_stock_subvariant(self):
        product = create_product_with_variants(
            {
                'name': 'Shoe',
                'ProductCode': 'PROD-ARCH',
                'variants': [
                    {'name': 'size', 'options': ['30', '32']},
                    {'name': 'color', 'options': ['Black']},
                ],
            },
            self.user,
        )
        size_variant = product.variants.get(name='size')
        update_variant(size_variant, {'name': 'size', 'options': ['32']})

        product.refresh_from_db()
        self.assertEqual(product.sub_variants.filter(active=True).count(), 1)
        archived = product.sub_variants.filter(active=False)
        self.assertEqual(archived.count(), 1)
        self.assertIn('30', archived.first().name)

    def test_remove_option_blocked_when_stock_exists(self):
        product = self._create_shirt_product()
        size_variant = product.variants.get(name='size')
        s_option = size_variant.options.get(value='S')
        sub_variant = product.sub_variants.filter(options=s_option).first()
        sub_variant.stock = Decimal('5')
        sub_variant.save(update_fields=['stock'])

        with self.assertRaises(ValidationError):
            update_variant(size_variant, {'name': 'size', 'options': ['M', 'L']})

    def test_add_variant_dimension_blocks_when_existing_stock(self):
        product = self._create_shirt_product()
        sub_variant = product.sub_variants.first()
        sub_variant.stock = Decimal('5')
        sub_variant.save()

        with self.assertRaises(ValidationError):
            add_variant_to_product(
                product,
                {'name': 'material', 'options': ['Cotton']},
            )

    def test_empty_variant_options_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            create_product_with_variants(
                {
                    'name': 'Shirt',
                    'ProductCode': 'PROD-002',
                    'variants': [{'name': 'size', 'options': []}],
                },
                self.user,
            )
