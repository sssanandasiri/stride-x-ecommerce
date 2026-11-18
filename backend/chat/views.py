import logging

from django.conf import settings
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import fallback

log = logging.getLogger(__name__)


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=500)
    history = serializers.ListField(child=serializers.DictField(), required=False, default=list, max_length=20)


class ChatView(APIView):
    """POST /api/chat/  {message, history}  ->  {text, products}"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat"

    def post(self, request):
        ser = ChatInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        message, history = ser.validated_data["message"], ser.validated_data["history"]

        if settings.ANTHROPIC_API_KEY:
            try:
                from .llm import ask_claude  # imported here so the app still runs without the SDK/key
                return Response(ask_claude(message, history))
            except Exception:
                log.exception("LLM chat failed, using keyword fallback")
        return Response(fallback.reply(message))
