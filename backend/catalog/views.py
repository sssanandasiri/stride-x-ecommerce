import uuid

from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Product
from .seed import load_seed
from .serializers import ProductSerializer
from .uploads import check_image


class IsStaffOrReadOnly(permissions.BasePermission):
    """Anyone may GET products. Only logged-in staff may create/edit/delete."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class ProductViewSet(viewsets.ModelViewSet):
    """
    One class gives us all of:
      GET    /api/products/        list
      POST   /api/products/        create        (staff)
      GET    /api/products/<id>/   detail
      PATCH  /api/products/<id>/   update        (staff)
      DELETE /api/products/<id>/   delete        (staff)
    """
    queryset = Product.objects.prefetch_related("sizes")
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    lookup_url_kwarg = "id"
    pagination_class = None  # return a plain list; the catalog is small

    def perform_destroy(self, instance):
        if instance.image_file:
            instance.image_file.delete(save=False)  # don't leave orphan files on disk
        super().perform_destroy(instance)


@api_view(["POST"])
@permission_classes([permissions.IsAdminUser])
def reset_catalog(request):
    """Admin 'Reset catalog to defaults' button: wipe + reload the seed file."""
    count = load_seed(wipe=True)
    return Response({"detail": f"Catalog reset ({count} products)."})


@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([permissions.IsAdminUser])
def upload_product_image(request, id):
    """POST /api/products/<id>/image/  (multipart form, field name: image) -- staff only."""
    product = get_object_or_404(Product, slug=id)
    upload = request.FILES.get("image")
    if upload is None:
        return Response({"detail": "No image file was sent."}, status=400)
    try:
        extension = check_image(upload)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    if product.image_file:
        product.image_file.delete(save=False)  # replace, don't pile up old photos
    product.image_file.save(f"{uuid.uuid4().hex}.{extension}", upload, save=True)
    return Response(ProductSerializer(product).data)
