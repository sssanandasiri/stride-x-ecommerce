from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from catalog.models import Product

from .models import Review
from .serializers import ReviewInputSerializer, ReviewSerializer
from .services import review_permission

BLOCKED_MESSAGES = {
    "sign_in": "Sign in to write a review.",
    "already_reviewed": "You've already reviewed this product.",
    "not_purchased": "Only customers who've received this product can review it.",
}


class ProductReviewsView(APIView):
    """
    GET  /api/products/<id>/reviews/  -> visible reviews + whether THIS visitor may write one
    POST /api/products/<id>/reviews/  -> write a review (signed-in buyers only)
    """
    permission_classes = [permissions.AllowAny]

    def get_throttles(self):
        # limit review spam, but never limit simply READING reviews
        if self.request.method == "POST":
            self.throttle_scope = "reviews"
            return [ScopedRateThrottle()]
        return []

    def get(self, request, id):
        product = get_object_or_404(Product, slug=id)
        reviews = product.user_reviews.filter(is_visible=True)
        can_review, reason = review_permission(request.user, product)
        return Response({
            "reviews": ReviewSerializer(reviews, many=True).data,
            "canReview": can_review,
            "blockedReason": reason,
        })

    def post(self, request, id):
        product = get_object_or_404(Product, slug=id)
        can_review, reason = review_permission(request.user, product)
        if not can_review:
            code = status.HTTP_401_UNAUTHORIZED if reason == "sign_in" else status.HTTP_403_FORBIDDEN
            return Response({"detail": BLOCKED_MESSAGES[reason]}, status=code)

        serializer = ReviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        first_name = (request.user.first_name.split() or ["Customer"])[0]  # show first name only
        try:
            review = Review.objects.create(
                product=product, user=request.user, author_name=first_name,
                rating=serializer.validated_data["rating"], text=serializer.validated_data["text"],
            )
        except IntegrityError:  # two clicks at once
            return Response({"detail": BLOCKED_MESSAGES["already_reviewed"]}, status=status.HTTP_403_FORBIDDEN)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
