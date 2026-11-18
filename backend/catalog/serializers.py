"""
SERIALIZERS convert between Python/database objects and JSON.

The React app was written first, so we shape the JSON to match what it
already expects: camelCase `salePrice`, `id` as text, `sizes` as
[{size, stock}] or null, and `stock` as a total.
"""
from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Product, ProductSize


class SizeSerializer(serializers.Serializer):
    size = serializers.CharField(max_length=10)
    stock = serializers.IntegerField(min_value=0)


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.SlugField(
        source="slug", validators=[UniqueValidator(queryset=Product.objects.all(), message="A product with this id already exists.")]
    )
    salePrice = serializers.DecimalField(
        source="sale_price", max_digits=10, decimal_places=2, allow_null=True, required=False
    )
    sizes = SizeSerializer(many=True, allow_null=True, required=False)
    stock = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = Product
        fields = ["id", "brand", "name", "category", "image", "badge", "rating",
                  "reviews", "price", "salePrice", "sizes", "stock"]

    # ---- reading: Product -> JSON ----
    def to_representation(self, product):
        data = super().to_representation(product)
        sizes = list(product.sizes.all())
        data["sizes"] = [{"size": s.size, "stock": s.stock} for s in sizes] if sizes else None
        data["stock"] = sum(s.stock for s in sizes) if sizes else product.stock
        # An uploaded photo wins over the old "/images/..." path. We return a full URL
        # so the image loads no matter which domain the React app is served from.
        if product.image_file:
            data["image"] = f"{settings.BACKEND_URL}{product.image_file.url}"
        return data

    # ---- writing: JSON -> Product ----
    @transaction.atomic
    def create(self, validated):
        sizes = validated.pop("sizes", None)
        product = Product.objects.create(**validated)
        self._save_sizes(product, sizes)
        return product

    @transaction.atomic
    def update(self, product, validated):
        sizes = validated.pop("sizes", "keep")
        if "image" in validated and product.image_file:
            # someone typed a new image path -> drop the uploaded photo so the path is used
            product.image_file.delete(save=False)
            product.image_file = None
        for field, value in validated.items():
            setattr(product, field, value)
        product.save()
        if sizes != "keep":
            self._save_sizes(product, sizes)
        return product

    def _save_sizes(self, product, sizes):
        product.sizes.all().delete()
        if sizes:
            ProductSize.objects.bulk_create(
                [ProductSize(product=product, size=s["size"], stock=s["stock"]) for s in sizes]
            )
            product.stock = 0  # sized products track stock per size instead
            product.save(update_fields=["stock"])
