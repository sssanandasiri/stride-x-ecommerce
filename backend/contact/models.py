import secrets

from django.db import models


def make_token():
    """Random secret used in each subscriber's personal unsubscribe link."""
    return secrets.token_urlsafe(24)


class ContactMessage(models.Model):
    """A message sent through the website's contact form."""
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=150, blank=True)
    message = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False, help_text="Tick once you've replied.")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name}: {self.subject or self.message[:40]}"


class Subscriber(models.Model):
    """Someone who signed up for the newsletter."""
    email = models.EmailField(unique=True)
    token = models.CharField(max_length=40, unique=True, default=make_token, editable=False)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-subscribed_at"]

    def __str__(self):
        return self.email
