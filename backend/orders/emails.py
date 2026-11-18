"""
Order emails.

Golden rule: an email problem must NEVER break checkout. Every send is wrapped
in try/except and only logged. (If the mail server is down, the customer still
gets their order.)

Emails go out in three situations:
  * order confirmed  -> customer gets a receipt, the shop owner gets a notice
  * order shipped / delivered / cancelled (changed by staff) -> customer update
"""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

log = logging.getLogger(__name__)

STATUS_SUBJECTS = {
    "shipped": "Your order {ref} is on its way",
    "delivered": "Your order {ref} was delivered",
    "cancelled": "Your order {ref} was cancelled",
}


def _context(order):
    items = [
        {
            "name": i.name,
            "size": i.size,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "line_total": i.unit_price * i.quantity,
        }
        for i in order.items.all()
    ]
    payment = order.payments.order_by("-id").first()
    return {
        "order": order,
        "items": items,
        "shop_name": settings.SHOP_NAME,
        "order_url": f"{settings.FRONTEND_URL}/order-confirmation?order={order.reference}",
        "paid": bool(payment and payment.status == "paid"),
        "method_label": order.get_payment_method_display(),
        "status": order.status,
    }


def _send(subject, template, context, to, html=True):
    try:
        text = render_to_string(f"orders/emails/{template}.txt", context)
        message = EmailMultiAlternatives(
            subject,
            text,
            settings.DEFAULT_FROM_EMAIL,
            to,
            reply_to=[settings.SHOP_ADMIN_EMAIL] if settings.SHOP_ADMIN_EMAIL else None,
        )
        if html:
            message.attach_alternative(render_to_string(f"orders/emails/{template}.html", context), "text/html")
        message.send()
    except Exception:
        log.exception("Could not send email %r to %s", subject, to)


def send_order_confirmation(order):
    """Receipt for the customer (if they gave an email) + a heads-up for the shop owner."""
    context = _context(order)
    if order.email:
        _send(f"{settings.SHOP_NAME} order {order.reference} confirmed", "order_confirmation", context, [order.email])
    if settings.SHOP_ADMIN_EMAIL:
        _send(
            f"New order {order.reference} - {order.subtotal} LKR",
            "new_order_admin",
            context,
            [settings.SHOP_ADMIN_EMAIL],
            html=False,
        )


def send_status_update(order):
    """Tell the customer their order moved to shipped / delivered / cancelled."""
    subject = STATUS_SUBJECTS.get(order.status)
    if order.email and subject:
        _send(subject.format(ref=order.reference), "order_status", _context(order), [order.email])
