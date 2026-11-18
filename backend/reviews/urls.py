from django.urls import path

from .views import ProductReviewsView

urlpatterns = [path("products/<str:id>/reviews/", ProductReviewsView.as_view())]
