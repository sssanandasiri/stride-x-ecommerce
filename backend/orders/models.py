from django.conf import settings
from django.db import models

from catalog.models import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending_payment", "Pending payment"),
        ("confirmed", "Confirmed"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_METHODS = [
        ("cod", "Cash on delivery"),
        ("card", "Debit / Credit card"),
        ("koko", "Koko"),
        ("mintpay", "Mintpay"),
        ("payz", "PayZ"),
    ]

    # Set when the buyer was signed in. Guest checkouts leave it empty.
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )

    # Public order number shown to the customer, e.g. SX-7K2M9QX4TA.
    # Random + long, so nobody can guess other people's orders.
    reference = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_payment")
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    stock_restored = models.BooleanField(default=False)  # makes "put stock back" safe to call twice

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=80)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.reference


class OrderItem(models.Model):
    """
    A line on an order. We COPY the name and price onto the line (a
    "snapshot") instead of only pointing at the product, because the shop
    may change a product's price tomorrow — old orders must keep the price
    the customer actually paid.
    """
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, null=True, on_delete=models.SET_NULL)
    product_slug = models.CharField(max_length=100)
    name = models.CharField(max_length=150)
    size = models.CharField(max_length=10, blank=True, null=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.name}"
