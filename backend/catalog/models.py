"""
DATABASE TABLES for the shop catalog.

A Django "model" is a Python class that becomes a MySQL table. Each
attribute becomes a column. After editing models you run:
    python manage.py makemigrations   -> writes a migration file (the change)
    python manage.py migrate          -> applies it to MySQL
"""
from django.db import models


class Product(models.Model):
    CATEGORY_CHOICES = [
        ("shoes", "Shoes"),
        ("belts", "Belts"),
        ("wallets", "Wallets"),
        ("socks", "Socks"),
        ("care", "Shoe care"),
    ]

    # The React app identifies products by a text id like "nike-dunk-panda".
    # We call it `slug` here and expose it to React as `id` (see serializers.py).
    slug = models.SlugField(max_length=100, unique=True)
    brand = models.CharField(max_length=60)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="shoes")
    # Two ways to give a product a picture:
    #  * `image`      - a path to a file you copied into the React public/images folder
    #  * `image_file` - a photo uploaded through the admin page (preferred; wins if both exist)
    image = models.CharField(max_length=255, blank=True, help_text="e.g. /images/panda.avif")
    image_file = models.ImageField(upload_to="products/", blank=True)
    badge = models.CharField(max_length=30, blank=True, null=True)
    rating = models.PositiveSmallIntegerField(default=5)
    reviews = models.PositiveIntegerField(default=0)
    # DecimalField (not float!) is the right type for money.
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # Used only for products WITHOUT sizes (belts, wallets...). Shoes use ProductSize.
    stock = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name

    @property
    def has_sizes(self):
        return self.sizes.exists()

    @property
    def total_stock(self):
        if self.has_sizes:
            return sum(s.stock for s in self.sizes.all())
        return self.stock

    @property
    def unit_price(self):
        """The price a customer actually pays right now."""
        return self.sale_price if self.sale_price is not None else self.price


class ProductSize(models.Model):
    """One row per size of a shoe, with its own stock count."""
    product = models.ForeignKey(Product, related_name="sizes", on_delete=models.CASCADE)
    size = models.CharField(max_length=10)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("product", "size")
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} / {self.size}"
