"""Small helpers that build test data (products, staff users, order payloads)."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from catalog.models import Product, ProductSize

SHIPPING = {
    "fullName": "Test Buyer",
    "phone": "0771234567",
    "email": "buyer@example.com",
    "address": "1 Main Street",
    "city": "Colombo",
}


def make_product(slug="test-shoe", price="7500", sale_price=None, stock=0, sizes=None, category="shoes"):
    """sizes: dict like {"40": 5, "41": 2}. If given, stock is tracked per size."""
    product = Product.objects.create(
        slug=slug, brand="Test", name=f"Test {slug}", category=category, image="/images/x.webp",
        price=Decimal(price), sale_price=Decimal(sale_price) if sale_price else None,
        stock=0 if sizes else stock,
    )
    for size, qty in (sizes or {}).items():
        ProductSize.objects.create(product=product, size=size, stock=qty)
    return product


def order_payload(items, method="cod"):
    return {"shipping": SHIPPING, "paymentMethod": method, "items": items}


def staff_token():
    user = get_user_model().objects.create_user("boss", password="pass12345", is_staff=True)
    return Token.objects.create(user=user).key
