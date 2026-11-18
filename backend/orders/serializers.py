from rest_framework import serializers

from .models import Order


class ShippingSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=80)


class OrderLineInputSerializer(serializers.Serializer):
    id = serializers.CharField()                      # product slug
    size = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class OrderCreateSerializer(serializers.Serializer):
    """What the browser is allowed to send. Note: NO prices in here, on purpose."""
    shipping = ShippingSerializer()
    paymentMethod = serializers.ChoiceField(choices=[c[0] for c in Order.PAYMENT_METHODS])
    items = OrderLineInputSerializer(many=True, allow_empty=False)


class OrderSerializer(serializers.ModelSerializer):
    """What we send back — same shape the React app already used."""
    id = serializers.CharField(source="reference", read_only=True)
    date = serializers.DateTimeField(source="created_at", read_only=True)
    paymentMethod = serializers.CharField(source="payment_method", read_only=True)
    shipping = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    paymentStatus = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "date", "status", "paymentMethod", "paymentStatus",
                  "shipping", "items", "subtotal"]
        read_only_fields = ["subtotal"]

    def validate_status(self, value):
        # Cancelling puts stock back; re-opening would need to take it out again.
        # Simplest safe rule: a cancelled order stays cancelled.
        if self.instance and self.instance.status == "cancelled" and value != "cancelled":
            raise serializers.ValidationError("A cancelled order can't be re-opened. Create a new order instead.")
        if value == "pending_payment":
            raise serializers.ValidationError("Orders can't be moved back to 'pending payment'.")
        return value

    def get_shipping(self, o):
        return {"fullName": o.full_name, "phone": o.phone, "email": o.email,
                "address": o.address, "city": o.city}

    def get_items(self, o):
        return [{"id": i.product_slug, "name": i.name, "size": i.size,
                 "quantity": i.quantity, "price": float(i.unit_price)} for i in o.items.all()]

    def get_paymentStatus(self, o):
        payment = o.payments.order_by("-id").first()
        return payment.status if payment else None
