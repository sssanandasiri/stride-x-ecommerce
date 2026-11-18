from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from orders import emails
from orders.models import Order
from orders.services import restock_order

from .models import Payment
from .providers import get_provider


@transaction.atomic
def start_payment(order):
    """Create the Payment row and ask the provider how to proceed."""
    provider = get_provider(order.payment_method)
    payment = Payment.objects.create(
        order=order, method=order.payment_method, provider=provider.name, amount=order.subtotal
    )
    redirect_url = provider.initiate(payment)

    if order.payment_method == "cod":
        # COD orders are confirmed right away; the payment stays "pending"
        # until the courier collects the cash.
        order.status = "confirmed"
        order.save(update_fields=["status"])
        # on_commit = "only send once the database has really saved the order"
        transaction.on_commit(lambda: emails.send_order_confirmation(order))
    return payment, redirect_url


@transaction.atomic
def mark_paid(payment):
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == "paid":  # providers may notify us twice; stay idempotent
        return payment
    payment.status = "paid"
    payment.paid_at = timezone.now()
    payment.save(update_fields=["status", "paid_at"])
    payment.order.status = "confirmed"
    payment.order.save(update_fields=["status"])
    transaction.on_commit(lambda: emails.send_order_confirmation(payment.order))
    return payment


@transaction.atomic
def mark_failed(payment):
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == "paid":
        return payment
    payment.status = "failed"
    payment.save(update_fields=["status"])
    payment.order.status = "cancelled"
    payment.order.save(update_fields=["status"])
    restock_order(payment.order)  # give the shoes back to the shelf
    return payment


def expire_stale_orders(minutes):
    """
    Cancel online orders that were never paid within `minutes`, and put their
    stock back. Cash-on-delivery orders are never touched (they're 'confirmed').
    Returns how many orders were cancelled.
    """
    cutoff = timezone.now() - timedelta(minutes=minutes)
    stale = Order.objects.filter(status="pending_payment", created_at__lt=cutoff)
    cancelled = 0
    for order in stale:
        payment = order.payments.filter(status="pending").first()
        if payment:
            mark_failed(payment)           # payment failed + order cancelled + restock
        else:                              # defensive: pending order with no payment row
            order.status = "cancelled"
            order.save(update_fields=["status"])
            restock_order(order)
        cancelled += 1
    return cancelled
