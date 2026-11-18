from rest_framework import permissions, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from payments.models import Payment
from payments.providers import available_methods
from payments.services import start_payment

from . import emails, services
from .models import Order
from .serializers import OrderCreateSerializer, OrderSerializer


class OrderListCreateView(ListCreateAPIView):
    """
    POST /api/orders/  -> anyone can place an order (checkout)
    GET  /api/orders/  -> staff only (admin page's "Recent orders")
    """
    queryset = Order.objects.prefetch_related("items", "payments")
    serializer_class = OrderSerializer
    pagination_class = None
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def create(self, request, *args, **kwargs):
        input_ser = OrderCreateSerializer(data=request.data)
        input_ser.is_valid(raise_exception=True)
        data = input_ser.validated_data

        if data["paymentMethod"] not in available_methods():
            return Response({"detail": "That payment method isn't available yet. Please choose another."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = request.user if request.user.is_authenticated else None
            order = services.create_order(data["shipping"], data["paymentMethod"], data["items"], customer)
        except services.OrderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payment, redirect_url = start_payment(order)
        body = OrderSerializer(order).data
        body["paymentUrl"] = redirect_url  # None for cash on delivery
        return Response(body, status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveUpdateAPIView):
    """
    GET   /api/orders/<reference>/  -> anyone with the (unguessable) reference
    PATCH /api/orders/<reference>/  -> staff only, e.g. {"status": "shipped"}
    """
    queryset = Order.objects.prefetch_related("items", "payments")
    serializer_class = OrderSerializer
    lookup_field = "reference"
    http_method_names = ["get", "patch", "head", "options"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        order = serializer.save()
        if order.status == "cancelled":
            services.restock_order(order)
            # an unpaid payment on a cancelled order is dead; (refunds of PAID orders are manual)
            Payment.objects.filter(order=order, status="pending").update(status="failed")
        if order.status != previous_status:
            emails.send_status_update(order)
