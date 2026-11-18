from django.urls import path

from . import views

urlpatterns = [
    path("api/contact/", views.ContactView.as_view()),
    path("api/newsletter/subscribe/", views.SubscribeView.as_view()),
    path("newsletter/unsubscribe/<str:token>/", views.unsubscribe),
]
