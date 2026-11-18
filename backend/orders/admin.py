from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_slug", "name", "size", "quantity", "unit_price")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "full_name", "payment_method", "subtotal", "status", "created_at")
    list_filter = ("status", "payment_method")
    search_fields = ("reference", "full_name", "phone")
    inlines = [OrderItemInline]
