"""
Run with:  python manage.py test
Each test starts with an empty database, so tests can't affect each other.
"""
from django.core.cache import cache
from rest_framework.test import APITestCase

from catalog.factories import make_product, order_payload, staff_token
from catalog.models import Product, ProductSize
from orders.models import Order


class OrderTests(APITestCase):
    def setUp(self):
        cache.clear()  # the rate limiter remembers requests between tests otherwise

    def place(self, items, method="cod"):
        return self.client.post("/api/orders/", order_payload(items, method), format="json")

    def test_cod_order_is_confirmed_and_reduces_stock(self):
        make_product("belt", price="2000", stock=10, category="belts")
        response = self.place([{"id": "belt", "quantity": 3}])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "confirmed")
        self.assertIsNone(response.data["paymentUrl"])
        self.assertEqual(Product.objects.get(slug="belt").stock, 7)

    def test_sized_product_reduces_only_that_size(self):
        make_product("dunk", sizes={"40": 5, "41": 5})
        self.place([{"id": "dunk", "size": "41", "quantity": 2}])
        self.assertEqual(ProductSize.objects.get(product__slug="dunk", size="41").stock, 3)
        self.assertEqual(ProductSize.objects.get(product__slug="dunk", size="40").stock, 5)

    def test_sized_product_requires_a_size(self):
        make_product("dunk", sizes={"40": 5})
        response = self.place([{"id": "dunk", "quantity": 1}])
        self.assertEqual(response.status_code, 400)

    def test_cannot_order_more_than_stock(self):
        make_product("belt", stock=2, category="belts")
        response = self.place([{"id": "belt", "quantity": 3}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.get(slug="belt").stock, 2)  # untouched
        self.assertEqual(Order.objects.count(), 0)                  # nothing saved

    def test_unknown_product_is_rejected(self):
        response = self.place([{"id": "does-not-exist", "quantity": 1}])
        self.assertEqual(response.status_code, 400)

    def test_server_ignores_prices_sent_by_the_browser(self):
        make_product("belt", price="2000", sale_price="1500", stock=10, category="belts")
        payload = order_payload([{"id": "belt", "quantity": 2, "price": 1}])  # cheating attempt
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(float(response.data["subtotal"]), 3000.0)  # 2 x sale price 1500

    def test_duplicate_lines_are_merged(self):
        make_product("belt", price="1000", stock=10, category="belts")
        response = self.place([{"id": "belt", "quantity": 1}, {"id": "belt", "quantity": 2}])
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 3)

    def test_failed_order_does_not_leave_partial_stock_changes(self):
        make_product("belt", stock=5, category="belts")
        make_product("wallet", stock=0, category="wallets")
        response = self.place([{"id": "belt", "quantity": 2}, {"id": "wallet", "quantity": 1}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.get(slug="belt").stock, 5)  # rolled back

    def test_order_list_is_staff_only(self):
        self.assertEqual(self.client.get("/api/orders/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {staff_token()}")
        self.assertEqual(self.client.get("/api/orders/").status_code, 200)

    def test_staff_cancel_restocks_and_order_cannot_be_reopened(self):
        make_product("belt", stock=10, category="belts")
        ref = self.place([{"id": "belt", "quantity": 4}]).data["id"]
        self.assertEqual(Product.objects.get(slug="belt").stock, 6)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {staff_token()}")
        cancel = self.client.patch(f"/api/orders/{ref}/", {"status": "cancelled"}, format="json")
        self.assertEqual(cancel.status_code, 200)
        self.assertEqual(Product.objects.get(slug="belt").stock, 10)

        reopen = self.client.patch(f"/api/orders/{ref}/", {"status": "shipped"}, format="json")
        self.assertEqual(reopen.status_code, 400)

    def test_customers_cannot_change_order_status(self):
        make_product("belt", stock=10, category="belts")
        ref = self.place([{"id": "belt", "quantity": 1}]).data["id"]
        response = self.client.patch(f"/api/orders/{ref}/", {"status": "delivered"}, format="json")
        self.assertEqual(response.status_code, 401)
