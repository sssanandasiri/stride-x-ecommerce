from django.conf import settings


class BaseProvider:
    name = "base"

    def initiate(self, payment):
        raise NotImplementedError

    def handle_webhook(self, request):
        raise NotImplementedError


class CashOnDelivery(BaseProvider):
    name = "cod"

    def initiate(self, payment):
        return None  # nothing to pay online; money is collected at the door


class SandboxProvider(BaseProvider):
    name = "sandbox"

    def initiate(self, payment):
        return f"{settings.BACKEND_URL}/pay/sandbox/{payment.reference}/"


class LiveProvider(BaseProvider):
    """
    SKELETON for a real gateway. To integrate Koko/Mintpay/PayZ/a card gateway:
      1. Get merchant credentials; put them in .env (never in React code).
      2. initiate(): call the provider's "create payment" API with
         payment.amount, payment.reference, and success/cancel URLs; return the
         hosted-checkout URL they give you.
      3. handle_webhook(): VERIFY the provider's signature (otherwise anyone
         could fake a "paid" message), then return (reference, True/False).
    """
    name = "live"

    def initiate(self, payment):
        raise NotImplementedError(f"Live payments for '{payment.method}' are not implemented yet.")

    def handle_webhook(self, request):
        raise NotImplementedError


# Register real providers here as you build them, e.g. {"koko": KokoProvider()}
LIVE_PROVIDERS = {}


ALL_METHODS = ["cod", "card", "koko", "mintpay", "payz"]


def available_methods():
    """Payment methods that can really be used right now."""
    if settings.PAYMENT_MODE == "sandbox":
        return list(ALL_METHODS)
    return ["cod"] + [m for m in ALL_METHODS if m in LIVE_PROVIDERS]


def get_provider(method):
    if method == "cod":
        return CashOnDelivery()
    if settings.PAYMENT_MODE == "sandbox":
        return SandboxProvider()
    return LIVE_PROVIDERS.get(method, LiveProvider())
