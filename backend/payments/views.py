from django.conf import settings
from django.http import Http404, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services
from .models import Payment
from .providers import LIVE_PROVIDERS, available_methods


def _back_to_shop(order, outcome):
    url = f"{settings.FRONTEND_URL}/order-confirmation?order={order.reference}&payment={outcome}"
    return HttpResponseRedirect(url)


def sandbox_pay(request, reference):
    """A fake 'bank page'. Only exists while PAYMENT_MODE=sandbox."""
    if settings.PAYMENT_MODE != "sandbox":
        raise Http404()
    payment = get_object_or_404(Payment, reference=reference)

    if payment.status != "pending":
        return _back_to_shop(payment.order, payment.status)

    if request.method == "POST":
        if request.POST.get("action") == "pay":
            services.mark_paid(payment)
            return _back_to_shop(payment.order, "paid")
        services.mark_failed(payment)
        return _back_to_shop(payment.order, "failed")

    return render(request, "payments/sandbox.html", {"payment": payment})


@csrf_exempt  # providers can't send our CSRF token; we verify their signature instead
def webhook(request, provider_name):
    """Where a real gateway tells us 'payment X succeeded/failed'."""
    provider = LIVE_PROVIDERS.get(provider_name)
    if provider is None:
        raise Http404()
    reference, succeeded = provider.handle_webhook(request)  # must verify signature inside
    payment = get_object_or_404(Payment, reference=reference)
    (services.mark_paid if succeeded else services.mark_failed)(payment)
    return JsonResponse({"ok": True})


@api_view(["GET"])
def payment_methods(request):
    """The checkout page asks this so it only offers methods that really work."""
    return Response({"methods": available_methods()})
