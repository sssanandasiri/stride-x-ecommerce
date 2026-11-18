from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Review
from .services import refresh_product_rating


@receiver([post_save, post_delete], sender=Review)
def update_product_rating(sender, instance, **kwargs):
    """Whenever a review is added, hidden, or deleted (API OR admin), fix the product's stars."""
    refresh_product_rating(instance.product)
