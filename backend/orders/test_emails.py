from unittest.mock import patch
from urllib.parse import urlparse

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from catalog.factories import SHIPPING, make_product, order_payload, staff_token
from orders.models import Order


@override_settings(SHOP_ADMIN_EMAIL="", SHOP_NAME="TestShop")
class OrderEmailTests(APITestCase):
    """During tests Django collects emails in `mail.outbox` instead of sending them."""

    def setUp(self):
        cache.clear()
        make_product("belt", price="2000", stock=20, category="belts")

    def place(self, method="cod", email="buyer@example.com", qty=2):
        payload = order_payload([{"id": "belt", "quantity": qty}], method)
        payload["shipping"] = {**SHIPPING, "email": email}
        # emails are sent "on commit"; this makes the test run those callbacks
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post("/api/orders/", payload, format="json")

    def staff_patch(self, reference, status):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {staff_token_value(self)}")
        return self.client.patch(f"/api/orders/{reference}/", {"status": status}, format="json")

    # ---- confirmation ----
    def test_cod_order_emails_the_customer(self):
        response = self.place("cod")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["buyer@example.com"])
        self.assertIn(response.data["id"], message.subject)
        self.assertIn("Test belt", message.body)
        self.assertIn("4000.00 LKR", message.body)
        self.assertIn("pay when your order arrives", message.body)
        self.assertIn(response.data["id"], message.alternatives[0][0])  # the HTML version

    def test_no_customer_email_means_no_email(self):
        self.place("cod", email="")
        self.assertEqual(len(mail.outbox), 0)

    def test_online_order_emails_only_after_payment(self):
        response = self.place("card")
        self.assertEqual(len(mail.outbox), 0)  # nothing yet: not paid

        pay_path = urlparse(response.data["paymentUrl"]).path
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(pay_path, {"action": "pay"})
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("payment received", mail.outbox[0].body)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(pay_path, {"action": "pay"})  # customer refreshes / clicks twice
        self.assertEqual(len(mail.outbox), 1)  # still just one

    def test_failed_payment_sends_no_confirmation(self):
        response = self.place("card")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(urlparse(response.data["paymentUrl"]).path, {"action": "fail"})
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(SHOP_ADMIN_EMAIL="owner@shop.test")
    def test_shop_owner_gets_a_new_order_notice(self):
        self.place("cod")
        self.assertEqual(len(mail.outbox), 2)
        recipients = {tuple(m.to) for m in mail.outbox}
        self.assertEqual(recipients, {("buyer@example.com",), ("owner@shop.test",)})
        owner_mail = next(m for m in mail.outbox if m.to == ["owner@shop.test"])
        self.assertTrue(owner_mail.subject.startswith("New order"))

    # ---- status updates ----
    def test_status_changes_email_the_customer_once_per_change(self):
        reference = self.place("cod").data["id"]
        mail.outbox.clear()

        self.staff_patch(reference, "shipped")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("on its way", mail.outbox[0].subject)

        self.staff_patch(reference, "shipped")      # same status again -> no new email
        self.assertEqual(len(mail.outbox), 1)

        self.staff_patch(reference, "delivered")
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("delivered", mail.outbox[1].subject)

    def test_cancelling_emails_the_customer(self):
        reference = self.place("cod").data["id"]
        mail.outbox.clear()
        self.staff_patch(reference, "cancelled")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("cancelled", mail.outbox[0].subject)

    # ---- safety ----
    def test_email_failure_never_breaks_checkout(self):
        with patch("orders.emails.EmailMultiAlternatives.send", side_effect=Exception("smtp down")):
            response = self.place("cod")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)


def staff_token_value(test_case):
    """Create the staff user once per test and reuse its token."""
    if not hasattr(test_case, "_token"):
        test_case._token = staff_token()
    return test_case._token
