"""
Admin login for the React /admin page.

DRF ships a ready-made "send username+password, get a token back" view.
We subclass it only to (1) refuse non-staff users and (2) say who logged in.
The React app stores the token and sends it as:  Authorization: Token <token>
"""
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response


class StaffLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if not user.is_staff:
            return Response({"detail": "This account is not allowed to use the admin."},
                            status=status.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username})
