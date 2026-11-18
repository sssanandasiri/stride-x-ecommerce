import uuid

from django.db import models


class Payment(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("paid", "Paid"), ("failed", "Failed")]

    order = models.ForeignKey("orders.Order", related_name="payments", on_delete=models.CASCADE)
    method = models.CharField(max_length=10)             # cod / card / koko / mintpay / payz
    provider = models.CharField(max_length=20)           # which code handled it (cod / sandbox / ...)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    # Our own id for this payment attempt; what we hand to the provider.
    reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    provider_reference = models.CharField(max_length=100, blank=True)  # the provider's id, if any
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.order.reference} / {self.method} / {self.status}"
