import logging

from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.filters import ProductFilterSet, StockReportFilter
from products.models import Category, ProductVariant, Products, StockTransaction, SubVariant
from products.pagination import StandardPagination
from products.permissions import IsAdminUser
from products.serializers import (
    CategorySerializer,
    DashboardSerializer,
    ProductCreateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductUpdateSerializer,
    ProductVariantSerializer,
    StockBulkPurchaseResponseSerializer,
    StockBulkPurchaseSerializer,
    StockLevelSerializer,
    StockPurchaseSerializer,
    StockSaleSerializer,
    StockTransactionSerializer,
    SubVariantSerializer,
    SubVariantUpdateSerializer,
    VariantWriteSerializer,
)
from products.services.dashboard_service import get_dashboard_data
from products.services.product_service import (
    add_variant_to_product,
    create_product_with_variants,
    delete_variant,
    update_product_details,
    update_variant,
)
from products.services.stock_service import bulk_purchase_stock, purchase_stock, sale_stock

logger = logging.getLogger('products')

STOCK_REPORT_PARAMETERS = [
    OpenApiParameter(name='start_date', type=str, description='Filter from date (YYYY-MM-DD)'),
    OpenApiParameter(name='end_date', type=str, description='Filter to date (YYYY-MM-DD)'),
    OpenApiParameter(name='product_id', type=str, description='Filter by product UUID'),
    OpenApiParameter(
        name='transaction_type',
        type=str,
        enum=['PURCHASE', 'SALE'],
        description='Filter by transaction type',
    ),
    OpenApiParameter(name='page', type=int, description='Page number'),
    OpenApiParameter(name='page_size', type=int, description='Results per page'),
]

STOCK_LEVEL_PARAMETERS = [
    OpenApiParameter(name='product_id', type=str, description='Filter by product UUID'),
    OpenApiParameter(
        name='include_archived',
        type=bool,
        description='Include archived sub-variants (default false)',
    ),
    OpenApiParameter(name='page', type=int, description='Page number'),
    OpenApiParameter(name='page_size', type=int, description='Results per page'),
]

PRODUCT_LIST_PARAMETERS = [
    OpenApiParameter(name='search', type=str, description='Search name, code, or HSN'),
    OpenApiParameter(name='category', type=str, description='Filter by category UUID'),
    OpenApiParameter(
        name='uncategorized',
        type=bool,
        description='When true, return only products without a category',
    ),
    OpenApiParameter(name='active', type=str, enum=['true', 'false'], description='Filter by active status'),
    OpenApiParameter(name='page', type=int, description='Page number'),
    OpenApiParameter(name='page_size', type=int, description='Results per page'),
]

DASHBOARD_PARAMETERS = [
    OpenApiParameter(name='days', type=int, description='Days of stock movement history (default 30, max 365)'),
    OpenApiParameter(name='recent_limit', type=int, description='Recent transactions to return (default 10, max 50)'),
    OpenApiParameter(name='top_limit', type=int, description='Top products by stock (default 5, max 20)'),
    OpenApiParameter(name='alerts_limit', type=int, description='Low stock alerts to return (default 10, max 50)'),
]


@extend_schema_view(
    list=extend_schema(tags=['Categories'], summary='List all categories'),
    create=extend_schema(tags=['Categories'], summary='Create category (admin only)'),
    retrieve=extend_schema(tags=['Categories'], summary='Retrieve category details'),
    update=extend_schema(tags=['Categories'], summary='Update category (admin only)'),
    partial_update=extend_schema(tags=['Categories'], summary='Partially update category (admin only)'),
    destroy=extend_schema(tags=['Categories'], summary='Delete category (admin only)'),
)
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    lookup_field = 'id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        logger.info('Category deleted: %s by %s', instance.name, self.request.user.username)
        instance.delete()


@extend_schema_view(
    list=extend_schema(
        tags=['Products'],
        summary='List all products',
        parameters=PRODUCT_LIST_PARAMETERS,
    ),
    create=extend_schema(tags=['Products'], summary='Create product with variants'),
    retrieve=extend_schema(tags=['Products'], summary='Retrieve product details'),
    update=extend_schema(tags=['Products'], summary='Update product details'),
    partial_update=extend_schema(tags=['Products'], summary='Partially update product'),
    destroy=extend_schema(
        tags=['Products'],
        summary='Delete product (soft delete; use ?hard=true for permanent delete)',
    ),
)
class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilterSet
    search_fields = ['ProductName', 'ProductCode', 'HSNCode']
    ordering_fields = ['CreatedDate', 'ProductName', 'TotalStock', 'ProductID']
    ordering = ['-CreatedDate']
    lookup_field = 'id'

    def get_queryset(self):
        queryset = Products.objects.select_related('CreatedUser', 'category').prefetch_related(
            'variants__options',
            'sub_variants__options',
        )
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            queryset = queryset.filter(Active=True)
        elif active_only == 'false':
            queryset = queryset.filter(Active=False)
        return queryset.annotate(
            low_stock_count=Count(
                'sub_variants',
                filter=Q(sub_variants__active=True)
                & Q(sub_variants__stock__lte=F('sub_variants__low_stock_threshold')),
            ),
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        if self.action == 'create':
            return ProductCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ProductUpdateSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payload = {
            'name': serializer.validated_data['resolved_name'],
            'ProductCode': serializer.validated_data['ProductCode'],
            'HSNCode': serializer.validated_data.get('HSNCode'),
            'variants': serializer.validated_data['variants'],
        }
        if serializer.validated_data.get('ProductImage'):
            payload['ProductImage'] = serializer.validated_data['ProductImage']
        if 'category_id' in serializer.validated_data:
            payload['category_id'] = serializer.validated_data['category_id']

        product = create_product_with_variants(payload, request.user)
        logger.info('Product created: %s by %s', product.ProductCode, request.user.username)

        output = ProductDetailSerializer(product, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        product = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        update_data = dict(serializer.validated_data)
        name = update_data.pop('name', None) or update_data.pop('ProductName', None)
        if name:
            update_data['name'] = name.strip()

        product = update_product_details(product, update_data)
        logger.info('Product updated: %s by %s', product.ProductCode, request.user.username)

        output = ProductDetailSerializer(product, context={'request': request})
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        hard_delete = request.query_params.get('hard') == 'true'

        if hard_delete:
            product_code = product.ProductCode
            product.delete()
            logger.info('Product hard-deleted: %s by %s', product_code, request.user.username)
            return Response(status=status.HTTP_204_NO_CONTENT)

        product.Active = False
        product.UpdatedDate = timezone.now()
        product.save(update_fields=['Active', 'UpdatedDate'])
        logger.info('Product soft-deleted: %s by %s', product.ProductCode, request.user.username)
        return Response(
            {'detail': 'Product deactivated successfully.', 'id': str(product.id)},
            status=status.HTTP_200_OK,
        )


class ProductVariantListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_product(self, product_id):
        return get_object_or_404(
            Products.objects.prefetch_related('variants__options'),
            pk=product_id,
        )

    @extend_schema(
        tags=['Variants'],
        summary='List variants for a product',
        responses={200: ProductVariantSerializer(many=True)},
    )
    def get(self, request, product_id):
        product = self.get_product(product_id)
        queryset = product.variants.prefetch_related('options').order_by('name')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ProductVariantSerializer(
            page,
            many=True,
            context={'include_inactive_options': request.query_params.get('include_archived') == 'true'},
        )
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        tags=['Variants'],
        summary='Add variant to product and regenerate sub-variants',
        request=VariantWriteSerializer,
        responses={201: ProductVariantSerializer},
    )
    def post(self, request, product_id):
        product = self.get_product(product_id)
        serializer = VariantWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant = add_variant_to_product(product, serializer.validated_data)
        logger.info(
            'Variant added to %s: %s by %s',
            product.ProductCode,
            variant.name,
            request.user.username,
        )
        product.refresh_from_db()
        output = ProductVariantSerializer(variant)
        return Response(output.data, status=status.HTTP_201_CREATED)


class ProductVariantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_variant(self, pk):
        return get_object_or_404(
            ProductVariant.objects.select_related('product').prefetch_related('options'),
            pk=pk,
        )

    @extend_schema(
        tags=['Variants'],
        summary='Update variant and regenerate sub-variants',
        request=VariantWriteSerializer,
        responses={200: ProductVariantSerializer},
    )
    def _update_variant(self, request, pk, *, partial=False):
        variant = self.get_variant(pk)
        serializer = VariantWriteSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        variant = update_variant(variant, serializer.validated_data)
        logger.info('Variant updated: %s by %s', variant.name, request.user.username)
        return Response(ProductVariantSerializer(variant).data)

    def put(self, request, pk):
        return self._update_variant(request, pk, partial=False)

    @extend_schema(
        tags=['Variants'],
        summary='Partially update variant and regenerate sub-variants',
        request=VariantWriteSerializer,
        responses={200: ProductVariantSerializer},
    )
    def patch(self, request, pk):
        return self._update_variant(request, pk, partial=True)

    @extend_schema(
        tags=['Variants'],
        summary='Delete variant and cascade sub-variants',
        responses={204: None},
    )
    def delete(self, request, pk):
        variant = self.get_variant(pk)
        variant_name = variant.name
        product_code = variant.product.ProductCode
        delete_variant(variant)
        logger.info(
            'Variant deleted from %s: %s by %s',
            product_code,
            variant_name,
            request.user.username,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductSubVariantListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Sub-Variants'],
        summary='List all sub-variants for a product',
        responses={200: SubVariantSerializer(many=True)},
    )
    def get(self, request, product_id):
        product = get_object_or_404(Products, pk=product_id)
        sub_variants = product.sub_variants.prefetch_related('options').order_by('name')

        include_archived = request.query_params.get('include_archived', '').lower() == 'true'
        if not include_archived:
            sub_variants = sub_variants.filter(active=True)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(sub_variants, request)
        serializer = SubVariantSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SubVariantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_sub_variant(self, pk):
        return get_object_or_404(
            SubVariant.objects.select_related('product').prefetch_related('options'),
            pk=pk,
        )

    @extend_schema(
        tags=['Sub-Variants'],
        summary='Update sub-variant settings (e.g. low stock threshold)',
        request=SubVariantUpdateSerializer,
        responses={200: SubVariantSerializer},
    )
    def patch(self, request, pk):
        sub_variant = self.get_sub_variant(pk)
        serializer = SubVariantUpdateSerializer(
            sub_variant,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        sub_variant = serializer.save()
        logger.info(
            'Sub-variant %s threshold updated to %s by %s',
            sub_variant.name,
            sub_variant.low_stock_threshold,
            request.user.username,
        )
        return Response(SubVariantSerializer(sub_variant).data)


class StockPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Stock'],
        summary='Add stock (purchase) for a sub-variant',
        request=StockPurchaseSerializer,
        responses={201: StockTransactionSerializer},
    )
    def post(self, request):
        serializer = StockPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sub_variant = SubVariant.objects.select_related('product').get(
            pk=serializer.validated_data['sub_variant_id']
        )
        transaction = purchase_stock(
            sub_variant,
            serializer.validated_data['quantity'],
            notes=serializer.validated_data.get('notes', ''),
            user=request.user,
        )
        logger.info(
            'Stock purchase: %s qty %s by %s',
            sub_variant.name,
            serializer.validated_data['quantity'],
            request.user.username,
        )
        return Response(
            StockTransactionSerializer(transaction).data,
            status=status.HTTP_201_CREATED,
        )


class StockBulkPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Stock'],
        summary='Add stock (purchase) for all active sub-variants of a product',
        request=StockBulkPurchaseSerializer,
        responses={201: StockBulkPurchaseResponseSerializer},
    )
    def post(self, request):
        serializer = StockBulkPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = Products.objects.get(pk=serializer.validated_data['product_id'])
        result = bulk_purchase_stock(
            product,
            serializer.validated_data['quantity'],
            notes=serializer.validated_data.get('notes', ''),
            user=request.user,
        )
        logger.info(
            'Bulk stock purchase: %s — %s units × %s variants by %s',
            product.ProductName,
            serializer.validated_data['quantity'],
            result['variants_updated'],
            request.user.username,
        )
        response_data = {
            'product_id': product.id,
            'product_name': product.ProductName,
            'quantity_per_variant': result['quantity_per_variant'],
            'variants_updated': result['variants_updated'],
            'total_units_added': result['total_units_added'],
        }
        return Response(
            StockBulkPurchaseResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED,
        )


class StockSaleView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Stock'],
        summary='Remove stock (sale) for a sub-variant',
        request=StockSaleSerializer,
        responses={201: StockTransactionSerializer},
    )
    def post(self, request):
        serializer = StockSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sub_variant = serializer.validated_data['sub_variant']
        transaction = sale_stock(
            sub_variant,
            serializer.validated_data['quantity'],
            notes=serializer.validated_data.get('notes', ''),
            user=request.user,
        )
        logger.info(
            'Stock sale: %s qty %s by %s',
            sub_variant.name,
            serializer.validated_data['quantity'],
            request.user.username,
        )
        return Response(
            StockTransactionSerializer(transaction).data,
            status=status.HTTP_201_CREATED,
        )


class StockLevelListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    @extend_schema(
        tags=['Stock'],
        summary='Get current stock levels for all sub-variants',
        parameters=STOCK_LEVEL_PARAMETERS,
        responses={200: StockLevelSerializer(many=True)},
    )
    def get(self, request):
        queryset = SubVariant.objects.select_related('product').prefetch_related('options')

        product_id = request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        include_archived = request.query_params.get('include_archived', '').lower() == 'true'
        if not include_archived:
            queryset = queryset.filter(active=True)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by('product__ProductName', 'name'), request)
        serializer = StockLevelSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StockReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = StandardPagination

    @extend_schema(
        tags=['Stock'],
        summary='Stock transaction report (admin only)',
        parameters=STOCK_REPORT_PARAMETERS,
        responses={200: StockTransactionSerializer(many=True)},
    )
    def get(self, request):
        queryset = StockTransaction.objects.select_related(
            'sub_variant__product',
            'created_by',
        ).order_by('-created_at')

        filterset = StockReportFilter(request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        queryset = filterset.qs
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = StockTransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Dashboard'],
        summary='Dashboard analytics summary',
        parameters=DASHBOARD_PARAMETERS,
        responses={200: DashboardSerializer},
    )
    def get(self, request):
        data = get_dashboard_data(
            days=request.query_params.get('days'),
            recent_limit=request.query_params.get('recent_limit'),
            top_limit=request.query_params.get('top_limit'),
            alerts_limit=request.query_params.get('alerts_limit'),
        )
        serializer = DashboardSerializer(data)
        return Response(serializer.data)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['System'],
        summary='API health check',
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string'},
                    'app': {'type': 'string'},
                    'message': {'type': 'string'},
                },
            }
        },
    )
    def get(self, request):
        return Response({
            'status': 'ok',
            'app': 'products',
            'message': 'Phase 4 complete — logging, admin, and API docs are ready',
        })
