from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, reset_catalog, upload_product_image

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    path("products/reset/", reset_catalog),   # must come BEFORE the router urls
    path("products/<str:id>/image/", upload_product_image),
    path("", include(router.urls)),
]
