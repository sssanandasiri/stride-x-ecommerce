from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from orders.serializers import OrderSerializer

from . import emails
from .serializers import (
    LoginSerializer, RegisterSerializer, ResetConfirmSerializer, ResetRequestSerializer,
    UpdateMeSerializer, check_password_strength,
)

User = get_user_model()


def me_data(user):
    """What the React app needs to know about the signed-in customer."""
    last = user.orders.order_by("-created_at").first()
    last_shipping = None
    if last:  # lets checkout pre-fill the form with where they ordered last time
        last_shipping = {"fullName": last.full_name, "phone": last.phone, "email": last.email,
                         "address": last.address, "city": last.city}
    return {"id": user.pk, "name": user.first_name or user.email, "email": user.email, "lastShipping": last_shipping}


class AuthThrottledView(APIView):
    """Login/register/reset are rate-limited so nobody can guess passwords by trying thousands."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(AuthThrottledView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.create_user(
            username=data["email"], email=data["email"], password=data["password"], first_name=data["name"]
        )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": me_data(user)}, status=status.HTTP_201_CREATED)


class LoginView(AuthThrottledView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None or not user.check_password(serializer.validated_data["password"]):
            return Response({"detail": "Incorrect email or password."}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": me_data(user)})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()  # the old token stops working immediately
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(me_data(request.user))

    def patch(self, request):
        serializer = UpdateMeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.first_name = serializer.validated_data["name"]
        request.user.save(update_fields=["first_name"])
        return Response(me_data(request.user))


class MyOrdersView(APIView):
    """A customer sees ONLY their own orders (filtered by the signed-in user)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = request.user.orders.prefetch_related("items", "payments")
        return Response(OrderSerializer(orders, many=True).data)


class PasswordResetRequestView(AuthThrottledView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            emails.send_password_reset(user)
        # Same answer either way, so this form can't be used to discover who has an account.
        return Response({"detail": "If that email has an account, we've sent a link to reset the password."})


class PasswordResetConfirmView(AuthThrottledView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data["uid"])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response({"detail": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        check_password_strength(data["password"], user)
        user.set_password(data["password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()  # sign the account out everywhere
        return Response({"detail": "Password updated. You can sign in now."})
