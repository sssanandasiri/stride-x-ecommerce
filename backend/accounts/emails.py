import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

log = logging.getLogger(__name__)


def send_password_reset(user):
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        body = (
            f"Hi {user.first_name or 'there'},\n\n"
            f"Someone asked to reset the password for your {settings.SHOP_NAME} account.\n"
            f"Choose a new password here (the link works for 1 hour):\n{link}\n\n"
            "If this wasn't you, you can ignore this email. Your password stays the same.\n"
        )
        EmailMessage(f"Reset your {settings.SHOP_NAME} password", body, settings.DEFAULT_FROM_EMAIL, [user.email]).send()
    except Exception:
        log.exception("Could not send password reset email to user %s", user.pk)
