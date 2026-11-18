from django.core.management.base import BaseCommand

from catalog.models import Product
from reviews.services import refresh_product_rating


class Command(BaseCommand):
    help = (
        "Recalculate every product's star rating and review count from REAL reviews. "
        "Run this once before launch: the demo catalog ships with made-up ratings and counts."
    )

    def handle(self, *args, **options):
        for product in Product.objects.all():
            refresh_product_rating(product)
        self.stdout.write(self.style.SUCCESS("Ratings and review counts now reflect real reviews only."))
