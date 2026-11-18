from django.shortcuts import get_object_or_404, render
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import emails
from .models import ContactMessage, Subscriber
from .serializers import ContactSerializer, SubscribeSerializer


class ContactView(APIView):
    """POST /api/contact/  -> saves the message and forwards it to the shop owner."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        reply = {"detail": "Thanks! We've got your message and will reply by email."}

        if data.get("hp_check"):  # honeypot filled in -> bot. Pretend it worked, save nothing.
            return Response(reply, status=status.HTTP_201_CREATED)

        message = ContactMessage.objects.create(
            name=data["name"], email=data["email"], subject=data.get("subject", ""), message=data["message"]
        )
        emails.notify_owner(message)
        return Response(reply, status=status.HTTP_201_CREATED)


class SubscribeView(APIView):
    """POST /api/newsletter/subscribe/  {email}"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "newsletter"

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        subscriber, created = Subscriber.objects.get_or_create(email=email)
        if created:
            emails.send_welcome(subscriber)
        elif not subscriber.is_active:       # they unsubscribed before and now came back
            subscriber.is_active = True
            subscriber.save(update_fields=["is_active"])
            emails.send_welcome(subscriber)

        # Same answer whether or not the address was already on the list, so nobody
        # can use this form to find out who is subscribed.
        return Response({"detail": "Thanks for subscribing! Check your inbox."})


def unsubscribe(request, token):
    """The link inside newsletter emails. GET shows a button; POST really unsubscribes
    (so email scanners that merely 'open' links can't unsubscribe people by accident)."""
    subscriber = get_object_or_404(Subscriber, token=token)
    done = False
    if request.method == "POST":
        subscriber.is_active = False
        subscriber.save(update_fields=["is_active"])
        done = True
    return render(request, "contact/unsubscribe.html", {"subscriber": subscriber, "done": done})
