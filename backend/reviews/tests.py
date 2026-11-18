from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from catalog.factories import SHIPPING, make_product
from catalog.models import Product
from orders import services as order_services
from reviews.models import Review

User = get_user_model()


class ReviewTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.product = make_product("belt", price="1000", stock=50, category="belts")
        self.user = User.objects.create_user("amal@example.com", "amal@example.com", "pass12345", first_name="Amal Silva")
        self.token = Token.objects.create(user=self.user).key

    def buy(self, user, status):
        order = order_services.create_order(SHIPPING, "cod", [{"id": "belt", "quantity": 1}], customer=user)
        order.status = status
        order.save()
        return order

    def sign_in(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

    def post_review(self, rating=5, text="Great belt, very sturdy."):
        return self.client.post("/api/products/belt/reviews/", {"rating": rating, "text": text}, format="json")

    # ---- who may review ----
    def test_anyone_can_read_reviews_and_is_told_to_sign_in(self):
        response = self.client.get("/api/products/belt/reviews/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reviews"], [])
        self.assertEqual(response.data["blockedReason"], "sign_in")

    def test_posting_requires_sign_in(self):
        self.assertEqual(self.post_review().status_code, 401)

    def test_customer_who_has_not_received_the_product_cannot_review(self):
        self.sign_in()
        self.assertEqual(self.post_review().status_code, 403)        # never ordered it
        self.buy(self.user, "confirmed")
        self.assertEqual(self.post_review().status_code, 403)        # ordered but not shipped yet
        self.assertEqual(Review.objects.count(), 0)

    def test_customer_with_a_delivered_order_can_review_once(self):
        self.buy(self.user, "delivered")
        self.sign_in()
        self.assertTrue(self.client.get("/api/products/belt/reviews/").data["canReview"])

        response = self.post_review(4, "Good value.")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["author"], "Amal")             # first name only
        self.assertEqual(self.post_review().status_code, 403)         # second try blocked
        self.assertEqual(Review.objects.count(), 1)

    def test_rating_must_be_between_1_and_5(self):
        self.buy(self.user, "delivered")
        self.sign_in()
        self.assertEqual(self.post_review(rating=6).status_code, 400)
        self.assertEqual(self.post_review(rating=0).status_code, 400)

    def test_someone_elses_delivered_order_does_not_count(self):
        other = User.objects.create_user("x@example.com", "x@example.com", "pass12345")
        self.buy(other, "delivered")
        self.sign_in()
        self.assertEqual(self.post_review().status_code, 403)

    # ---- stars on the product ----
    def test_product_rating_and_count_follow_visible_reviews(self):
        self.buy(self.user, "delivered")
        self.sign_in()
        self.post_review(4)
        product = Product.objects.get(slug="belt")
        self.assertEqual((product.rating, product.reviews), (4, 1))

        review = Review.objects.get()
        review.is_visible = False          # you hide it in the Django admin
        review.save()
        product.refresh_from_db()
        self.assertEqual((product.rating, product.reviews), (0, 0))
        self.assertEqual(self.client.get("/api/products/belt/reviews/").data["reviews"], [])

        review.delete()
        product.refresh_from_db()
        self.assertEqual(product.reviews, 0)

    def test_rating_is_the_rounded_average(self):
        second = User.objects.create_user("b@example.com", "b@example.com", "pass12345", first_name="Bimal")
        Review.objects.create(product=self.product, user=self.user, author_name="Amal", rating=5, text="great")
        Review.objects.create(product=self.product, user=second, author_name="Bimal", rating=4, text="good")
        product = Product.objects.get(slug="belt")
        self.assertEqual((product.rating, product.reviews), (5, 2))   # average 4.5 rounds up
