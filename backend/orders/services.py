"""
Business logic for orders lives here (not in views) so it's easy to read
and test. The most important rules:

1. NEVER trust prices from the browser. We look the products up ourselves.
2. Check + reduce stock inside ONE database transaction, with the product
   rows locked (select_for_update), so two customers can't both buy the
   last pair of shoes at the same moment.
"""
import secrets
import string
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from catalog.models import Product, ProductSize

from .models import Order, OrderItem


class OrderError(Exception):
    """A problem the customer should see (out of stock, unknown product...)."""


def _new_reference():
    alphabet = string.ascii_uppercase + string.digits
    while True:
        ref = "SX-" + "".join(secrets.choice(alphabet) for _ in range(10))
        if not Order.objects.filter(reference=ref).exists():
            return ref


@transaction.atomic
def create_order(shipping, payment_method, items, customer=None):
    # Merge duplicate lines (same product + same size) into one.
    wanted = {}
    for line in items:
        key = (line["id"], line.get("size") or None)
        wanted[key] = wanted.get(key, 0) + line["quantity"]

    slugs = {slug for slug, _ in wanted}
    products = {p.slug: p for p in Product.objects.select_for_update().filter(slug__in=slugs)}

    order = Order.objects.create(
        reference=_new_reference(),
        customer=customer,
        payment_method=payment_method,
        subtotal=Decimal("0"),
        full_name=shipping["fullName"],
        phone=shipping["phone"],
        email=shipping.get("email", ""),
        address=shipping["address"],
        city=shipping["city"],
    )

    subtotal = Decimal("0")
    for (slug, size), qty in wanted.items():
        product = products.get(slug)
        if product is None:
            raise OrderError("One of the items in your cart is no longer available.")

        size_rows = list(product.sizes.select_for_update())
        if size_rows:
            if not size:
                raise OrderError(f"Please choose a size for {product.name}.")
            row = next((r for r in size_rows if r.size == size), None)
            if row is None:
                raise OrderError(f"{product.name} does not come in size {size}.")
            if row.stock < qty:
                raise OrderError(f"Only {row.stock} left of {product.name} in size {size}.")
            row.stock -= qty
            row.save(update_fields=["stock"])
        else:
            size = None
            if product.stock < qty:
                raise OrderError(f"Only {product.stock} left of {product.name}.")
            product.stock -= qty
            product.save(update_fields=["stock"])

        price = product.unit_price
        subtotal += price * qty
        OrderItem.objects.create(
            order=order, product=product, product_slug=product.slug, name=product.name,
            size=size, quantity=qty, unit_price=price,
        )

    order.subtotal = subtotal
    order.save(update_fields=["subtotal"])
    return order


@transaction.atomic
def restock_order(order):
    """Put the stock back (payment failed / order cancelled). Safe to call twice."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.stock_restored:
        return
    # F() = "do the arithmetic inside MySQL" so concurrent updates don't overwrite each other.
    for item in order.items.select_related("product"):
        if item.product is None:
            continue
        if item.size:
            ProductSize.objects.filter(product=item.product, size=item.size).update(
                stock=F("stock") + item.quantity
            )
        else:
            Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
    order.stock_restored = True
    order.save(update_fields=["stock_restored"])

