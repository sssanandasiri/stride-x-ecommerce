from django.db.models import Avg, Count

from catalog.models import Product
from orders.models import OrderItem


def refresh_product_rating(product):
    """Recalculate the product's star rating and review count from its VISIBLE reviews."""
    agg = product.user_reviews.filter(is_visible=True).aggregate(avg=Avg("rating"), n=Count("id"))
    count = agg["n"]
    rating = int(agg["avg"] + 0.5) if count else 0   # round half up
    Product.objects.filter(pk=product.pk).update(reviews=count, rating=rating)


def has_received(user, product):
    """True if this customer has an order with the product that has shipped or been delivered."""
    return OrderItem.objects.filter(
        order__customer=user, order__status__in=["shipped", "delivered"], product_slug=product.slug
    ).exists()


def review_permission(user, product):
    """Returns (can_review, reason_code). The React app turns the code into a friendly message."""
    if not user.is_authenticated:
        return False, "sign_in"
    if product.user_reviews.filter(user=user).exists():
        return False, "already_reviewed"
    if not has_received(user, product):
        return False, "not_purchased"
    return True, None
