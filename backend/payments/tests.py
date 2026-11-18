from datetime import timedelta
from urllib.parse import urlparse

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.factories import make_product, order_payload
from catalog.models import ProductSize
from orders.models import Order
from payments import services
from payments.models import Payment


class PaymentTests(APITestCase):
    def setUp(self):
        cache.clear()
        make_product("dunk", price="7500", sizes={"40": 5})

    def place(self, method="card", qty=2):
        payload = order_payload([{"id": "dunk", "size": "40", "quantity": qty}], method)
        return self.client.post("/api/orders/", payload, format="json")

    def stock(self):
        return ProductSize.objects.get(product__slug="dunk", size="40").stock

    # ---- creating payments ----
    def test_cod_creates_pending_payment_and_no_redirect(self):
        response = self.place("cod")
        self.assertIsNone(response.data["paymentUrl"])
        self.assertEqual(Payment.objects.get().status, "pending")
        self.assertEqual(response.data["status"], "confirmed")

    def test_card_in_sandbox_waits_for_payment(self):
        response = self.place("card")
        self.assertEqual(response.data["status"], "pending_payment")
        self.assertIn("/pay/sandbox/", response.data["paymentUrl"])
        self.assertEqual(self.stock(), 3)  # reserved while the customer pays

    # ---- sandbox outcomes ----
    def test_sandbox_success_marks_paid_and_confirms_order(self):
        url = self.place("card").data["paymentUrl"]
        response = self.client.post(urlparse(url).path, {"action": "pay"})
        self.assertEqual(response.status_code, 302)
        self.assertIn("payment=paid", response["Location"])
        self.assertEqual(Payment.objects.get().status, "paid")
        self.assertEqual(Order.objects.get().status, "confirmed")

    def test_sandbox_failure_cancels_order_and_restocks(self):
        url = self.place("card").data["paymentUrl"]
        self.client.post(urlparse(url).path, {"action": "fail"})
        self.assertEqual(Order.objects.get().status, "cancelled")
        self.assertEqual(self.stock(), 5)

    # ---- safety rules ----
    def test_marking_paid_twice_is_harmless(self):
        self.place("card")
        payment = Payment.objects.get()
        services.mark_paid(payment)
        services.mark_paid(payment)
        self.assertEqual(Payment.objects.get().status, "paid")

    def test_stock_is_only_restored_once(self):
        self.place("card")
        payment = Payment.objects.get()
        services.mark_failed(payment)
        services.mark_failed(payment)
        self.assertEqual(self.stock(), 5)  # not 7

    def test_a_paid_payment_cannot_be_failed_later(self):
        self.place("card")
        payment = Payment.objects.get()
        services.mark_paid(payment)
        services.mark_failed(payment)
        self.assertEqual(Payment.objects.get().status, "paid")
        self.assertEqual(Order.objects.get().status, "confirmed")

    @override_settings(PAYMENT_MODE="live")
    def test_sandbox_page_is_disabled_outside_sandbox_mode(self):
        import uuid
        self.assertEqual(self.client.get(f"/pay/sandbox/{uuid.uuid4()}/").status_code, 404)

    @override_settings(PAYMENT_MODE="live")
    def test_live_mode_rejects_unbuilt_online_methods_but_allows_cod(self):
        self.assertEqual(self.place("card").status_code, 400)
        self.assertEqual(self.place("cod").status_code, 201)
        self.assertEqual(self.client.get("/api/payment-methods/").data["methods"], ["cod"])

    # ---- stale order cleanup ----
    def test_expire_stale_orders_cancels_only_old_unpaid_online_orders(self):
        old_ref = self.place("card", qty=1).data["id"]
        fresh_ref = self.place("card", qty=1).data["id"]
        cod_ref = self.place("cod", qty=1).data["id"]
        Order.objects.filter(reference__in=[old_ref, cod_ref]).update(
            created_at=timezone.now() - timedelta(hours=2)
        )
        stock_before = self.stock()  # 5 - 3 = 2

        cancelled = services.expire_stale_orders(30)

        self.assertEqual(cancelled, 1)
        self.assertEqual(Order.objects.get(reference=old_ref).status, "cancelled")
        self.assertEqual(Order.objects.get(reference=fresh_ref).status, "pending_payment")
        self.assertEqual(Order.objects.get(reference=cod_ref).status, "confirmed")
        self.assertEqual(self.stock(), stock_before + 1)
