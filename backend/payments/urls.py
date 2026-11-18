from django.urls import path

from . import views

urlpatterns = [
    path("api/payment-methods/", views.payment_methods),
    path("pay/sandbox/<uuid:reference>/", views.sandbox_pay),
    path("api/payments/webhook/<str:provider_name>/", views.webhook),
]
