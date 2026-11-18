from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


def check_password_strength(password, user=None):
    """Use Django's password rules (min length 8, not a common password...)."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"password": list(exc.messages)})


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=60)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Try signing in.")
        return value

    def validate(self, attrs):
        check_password_strength(
            attrs["password"], User(username=attrs["email"], email=attrs["email"], first_name=attrs["name"])
        )
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class UpdateMeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=60)


class ResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False)
