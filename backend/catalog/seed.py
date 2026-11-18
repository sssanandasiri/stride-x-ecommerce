import json
from pathlib import Path

from .models import Product, ProductSize

SEED_FILE = Path(__file__).parent / "seed_data" / "products.json"


def load_seed(wipe=False):
    """Load the starting catalog (converted from the React data/products.js)."""
    if wipe:
        for existing in Product.objects.all():
            if existing.image_file:
                existing.image_file.delete(save=False)
        Product.objects.all().delete()
    items = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    for item in items:
        sizes = item.get("sizes")
        product, _ = Product.objects.update_or_create(
            slug=item["id"],
            defaults={
                "brand": item["brand"],
                "name": item["name"],
                "category": item["category"],
                "image": item["image"],
                "badge": item.get("badge"),
                "rating": item.get("rating", 5),
                "reviews": item.get("reviews", 0),
                "price": item["price"],
                "sale_price": item.get("salePrice"),
                "stock": 0 if sizes else item.get("stock", 0),
            },
        )
        product.sizes.all().delete()
        for s in sizes or []:
            ProductSize.objects.create(product=product, size=s["size"], stock=s["stock"])
    return len(items)
