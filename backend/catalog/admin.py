from django.contrib import admin

from .models import Product, ProductSize


class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "category", "price", "sale_price", "stock")
    list_filter = ("category", "brand")
    search_fields = ("name", "brand", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductSizeInline]
