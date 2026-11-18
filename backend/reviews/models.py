from django.conf import settings
from django.db import models

from catalog.models import Product


class Review(models.Model):
    """
    A customer review. Only signed-in customers who actually received the product
    can write one (see views.can_review), and only one review per product.
    """
    # NOTE: related_name can't be "reviews" because Product already has a `reviews` number field.
    product = models.ForeignKey(Product, related_name="user_reviews", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="reviews", on_delete=models.CASCADE)
    author_name = models.CharField(max_length=60)       # first name only, shown publicly
    rating = models.PositiveSmallIntegerField()          # 1 to 5
    text = models.TextField(max_length=1000)
    is_visible = models.BooleanField(default=True, help_text="Untick to hide a review from the shop.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("product", "user")

    def __str__(self):
        return f"{self.product.name}: {self.rating}/5 by {self.author_name}"
