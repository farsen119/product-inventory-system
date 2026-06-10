from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'
    verbose_name = 'Product Inventory'

    def ready(self):
        from django.contrib import admin

        admin.site.site_header = 'Inventory System Admin'
        admin.site.site_title = 'Inventory Admin'
        admin.site.index_title = 'Product & Stock Management'
