import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from catalog.factories import make_product, order_payload

User = get_user_model()
REGISTER = {"name": "Nimal Perera", "email": "nimal@example.com", "password": "Sneakers2026!"}


class AccountTests(APITestCase):
    def setUp(self):
        cache.clear()

    def register(self, **overrides):
        return self.client.post("/api/account/register/", {**REGISTER, **overrides}, format="json")

    def sign_in(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    # ---- register / login ----
    def test_register_creates_a_customer_and_returns_a_token(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="nimal@example.com")
        self.assertFalse(user.is_staff)                       # customers never get admin rights
        self.assertTrue(user.check_password(REGISTER["password"]))
        self.assertEqual(response.data["token"], Token.objects.get(user=user).key)
        self.assertEqual(response.data["user"]["name"], "Nimal Perera")

    def test_weak_or_duplicate_registrations_are_rejected(self):
        self.assertEqual(self.register(password="password").status_code, 400)  # too common
        self.assertEqual(self.register(password="short").status_code, 400)
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(self.register(email="NIMAL@example.com").status_code, 400)  # same email, any case

    def test_login_works_with_correct_password_only(self):
        self.register()
        ok = self.client.post("/api/account/login/", {"email": "Nimal@Example.com", "password": REGISTER["password"]}, format="json")
        self.assertEqual(ok.status_code, 200)
        bad = self.client.post("/api/account/login/", {"email": "nimal@example.com", "password": "wrong-password"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_me_needs_a_token_and_logout_kills_it(self):
        token = self.register().data["token"]
        self.assertEqual(self.client.get("/api/account/me/").status_code, 401)
        self.sign_in(token)
        self.assertEqual(self.client.get("/api/account/me/").data["email"], "nimal@example.com")
        self.assertEqual(self.client.post("/api/account/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/account/me/").status_code, 401)  # old token is dead

    def test_a_customer_token_cannot_use_admin_endpoints(self):
        self.sign_in(self.register().data["token"])
        self.assertEqual(self.client.get("/api/orders/").status_code, 403)
        self.assertEqual(self.client.post("/api/products/reset/").status_code, 403)

    def test_login_attempts_are_rate_limited(self):
        codes = [
            self.client.post("/api/account/login/", {"email": "a@b.com", "password": "x" * 9}, format="json").status_code
            for _ in range(21)
        ]
        self.assertEqual(codes[-1], 429)

    # ---- orders ----
    def test_orders_placed_while_signed_in_appear_in_my_orders_only(self):
        make_product("belt", price="1000", stock=20, category="belts")
        token = self.register().data["token"]

        self.sign_in(token)
        mine = self.client.post("/api/orders/", order_payload([{"id": "belt", "quantity": 1}]), format="json")
        self.client.credentials()  # sign out -> guest order
        guest = self.client.post("/api/orders/", order_payload([{"id": "belt", "quantity": 2}]), format="json")
        self.assertEqual(mine.status_code, 201)
        self.assertEqual(guest.status_code, 201)

        self.sign_in(token)
        listed = self.client.get("/api/account/orders/")
        self.assertEqual([o["id"] for o in listed.data], [mine.data["id"]])  # not the guest order

    def test_me_remembers_the_last_shipping_details(self):
        make_product("belt", stock=5, category="belts")
        self.sign_in(self.register().data["token"])
        self.client.post("/api/orders/", order_payload([{"id": "belt", "quantity": 1}]), format="json")
        self.assertEqual(self.client.get("/api/account/me/").data["lastShipping"]["city"], "Colombo")

    # ---- password reset ----
    def test_password_reset_full_flow(self):
        old_token = self.register().data["token"]
        self.client.post("/api/account/password-reset/", {"email": "nimal@example.com"}, format="json")
        self.assertEqual(len(mail.outbox), 1)
        uid, token = re.search(r"uid=([^&\s]+)&token=([^\s]+)", mail.outbox[0].body).groups()

        weak = self.client.post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "password"}, format="json")
        self.assertEqual(weak.status_code, 400)

        done = self.client.post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "BrandNewPass2026!"}, format="json")
        self.assertEqual(done.status_code, 200)
        self.assertTrue(User.objects.get().check_password("BrandNewPass2026!"))
        self.assertFalse(Token.objects.filter(key=old_token).exists())   # signed out everywhere

        reuse = self.client.post("/api/account/password-reset/confirm/", {"uid": uid, "token": token, "password": "AnotherPass2026!"}, format="json")
        self.assertEqual(reuse.status_code, 400)  # the link works only once

    def test_reset_request_does_not_reveal_whether_an_account_exists(self):
        self.register()
        known = self.client.post("/api/account/password-reset/", {"email": "nimal@example.com"}, format="json")
        unknown = self.client.post("/api/account/password-reset/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)  # only the real account got an email

    def test_garbage_reset_links_are_rejected(self):
        response = self.client.post("/api/account/password-reset/confirm/", {"uid": "zzz", "token": "nope", "password": "BrandNewPass2026!"}, format="json")
        self.assertEqual(response.status_code, 400)
