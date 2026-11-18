"""Emails for the contact form and newsletter. Like orders/emails.py, they never raise."""
import logging

from django.conf import settings
from django.core.mail import EmailMessage

log = logging.getLogger(__name__)


def _one_line(text):
    # Newlines in a subject line would let someone inject extra email headers.
    return " ".join(str(text).split())


def notify_owner(contact_message):
    """Forward a contact-form message to the shop owner. Reply goes straight to the customer."""
    if not settings.SHOP_ADMIN_EMAIL:
        return
    try:
        subject = _one_line(f"Contact form: {contact_message.subject or 'New message'}")[:150]
        body = (
            f"From: {contact_message.name} <{contact_message.email}>\n\n"
            f"{contact_message.message}\n\n"
            "-- Sent from the website contact form. Hit Reply to answer the customer."
        )
        EmailMessage(
            subject, body, settings.DEFAULT_FROM_EMAIL, [settings.SHOP_ADMIN_EMAIL],
            reply_to=[contact_message.email],
        ).send()
    except Exception:
        log.exception("Could not forward contact message %s", contact_message.pk)


def send_welcome(subscriber):
    try:
        link = f"{settings.BACKEND_URL}/newsletter/unsubscribe/{subscriber.token}/"
        body = (
            f"Thanks for subscribing to {settings.SHOP_NAME}!\n\n"
            "We'll email you about new drops and offers. No spam.\n\n"
            f"Changed your mind? Unsubscribe any time: {link}\n"
        )
        EmailMessage(
            f"Welcome to {settings.SHOP_NAME}", body, settings.DEFAULT_FROM_EMAIL, [subscriber.email],
            headers={"List-Unsubscribe": f"<{link}>"},
        ).send()
    except Exception:
        log.exception("Could not send welcome email to %s", subscriber.email)
