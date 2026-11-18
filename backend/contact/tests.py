from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from contact.models import ContactMessage, Subscriber

VALID = {"name": "Nimal", "email": "nimal@example.com", "subject": "Sizing", "message": "Do the Dunks run small?"}


@override_settings(SHOP_ADMIN_EMAIL="owner@shop.test")
class ContactFormTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_message_is_saved_and_forwarded_to_the_owner(self):
        response = self.client.post("/api/contact/", VALID, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner@shop.test"])
        self.assertEqual(mail.outbox[0].reply_to, ["nimal@example.com"])  # Reply -> straight to the customer
        self.assertIn("Do the Dunks run small?", mail.outbox[0].body)

    def test_invalid_input_is_rejected(self):
        self.assertEqual(self.client.post("/api/contact/", {**VALID, "email": "nope"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/contact/", {**VALID, "message": ""}, format="json").status_code, 400)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_honeypot_hides_bots_from_us(self):
        response = self.client.post("/api/contact/", {**VALID, "hp_check": "http://spam.example"}, format="json")
        self.assertEqual(response.status_code, 201)       # the bot thinks it worked...
        self.assertEqual(ContactMessage.objects.count(), 0)  # ...but nothing was saved
        self.assertEqual(len(mail.outbox), 0)

    def test_newlines_in_subject_cannot_inject_email_headers(self):
        payload = {**VALID, "subject": "Hi\nBcc: victim@example.com"}
        self.assertEqual(self.client.post("/api/contact/", payload, format="json").status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn("\n", mail.outbox[0].subject)

    def test_form_is_rate_limited(self):
        statuses = [self.client.post("/api/contact/", VALID, format="json").status_code for _ in range(6)]
        self.assertEqual(statuses[:5], [201] * 5)
        self.assertEqual(statuses[5], 429)


class NewsletterTests(APITestCase):
    def setUp(self):
        cache.clear()

    def subscribe(self, email="fan@example.com"):
        return self.client.post("/api/newsletter/subscribe/", {"email": email}, format="json")

    def test_subscribing_saves_the_email_and_sends_a_welcome_with_unsubscribe_link(self):
        self.assertEqual(self.subscribe().status_code, 200)
        subscriber = Subscriber.objects.get()
        self.assertTrue(subscriber.is_active)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(f"/newsletter/unsubscribe/{subscriber.token}/", mail.outbox[0].body)

    def test_emails_are_lowercased_and_never_duplicated(self):
        first = self.subscribe("Fan@Example.COM")
        second = self.subscribe("fan@example.com")
        self.assertEqual(Subscriber.objects.count(), 1)
        self.assertEqual(Subscriber.objects.get().email, "fan@example.com")
        self.assertEqual(first.data, second.data)  # same answer -> can't probe who is subscribed
        self.assertEqual(len(mail.outbox), 1)      # welcome sent only once

    def test_invalid_email_is_rejected(self):
        self.assertEqual(self.subscribe("not-an-email").status_code, 400)
        self.assertEqual(Subscriber.objects.count(), 0)

    def test_unsubscribe_needs_a_post_not_just_opening_the_link(self):
        self.subscribe()
        token = Subscriber.objects.get().token
        self.assertEqual(self.client.get(f"/newsletter/unsubscribe/{token}/").status_code, 200)
        self.assertTrue(Subscriber.objects.get().is_active)        # a GET changes nothing

        self.client.post(f"/newsletter/unsubscribe/{token}/")
        self.assertFalse(Subscriber.objects.get().is_active)

    def test_resubscribing_reactivates_and_welcomes_again(self):
        self.subscribe()
        token = Subscriber.objects.get().token
        self.client.post(f"/newsletter/unsubscribe/{token}/")
        mail.outbox.clear()

        self.subscribe()
        self.assertTrue(Subscriber.objects.get().is_active)
        self.assertEqual(len(mail.outbox), 1)

    def test_unknown_unsubscribe_token_is_404(self):
        self.assertEqual(self.client.get("/newsletter/unsubscribe/not-a-real-token/").status_code, 404)
