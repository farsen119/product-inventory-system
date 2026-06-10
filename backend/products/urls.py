from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    DashboardView,
    HealthCheckView,
    ProductSubVariantListView,
    ProductVariantDetailView,
    ProductVariantListCreateView,
    ProductViewSet,
    StockBulkPurchaseView,
    SubVariantDetailView,
    StockLevelListView,
    StockPurchaseView,
    StockReportView,
    StockSaleView,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('products/<uuid:product_id>/variants/', ProductVariantListCreateView.as_view(), name='product-variants'),
    path('products/<uuid:product_id>/subvariants/', ProductSubVariantListView.as_view(), name='product-subvariants'),
    path('variants/<uuid:pk>/', ProductVariantDetailView.as_view(), name='variant-detail'),
    path('subvariants/<uuid:pk>/', SubVariantDetailView.as_view(), name='subvariant-detail'),
    path('stock/purchase/bulk/', StockBulkPurchaseView.as_view(), name='stock-purchase-bulk'),
    path('stock/purchase/', StockPurchaseView.as_view(), name='stock-purchase'),
    path('stock/sale/', StockSaleView.as_view(), name='stock-sale'),
    path('stock/report/', StockReportView.as_view(), name='stock-report'),
    path('stock/', StockLevelListView.as_view(), name='stock-levels'),
    path('', include(router.urls)),
]
