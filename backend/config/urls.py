from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from .auth import StaffLoginView

urlpatterns = [
    path("admin/", admin.site.urls),                         # Django's built-in admin
    path("api/auth/login/", StaffLoginView.as_view()),       # staff (shop admin) login
    path("api/account/", include("accounts.urls")),          # customer accounts
    path("api/", include("reviews.urls")),                   # /api/products/<id>/reviews/
    path("api/", include("catalog.urls")),                   # /api/products/
    path("api/", include("orders.urls")),                    # /api/orders/
    path("api/chat/", include("chat.urls")),                 # /api/chat/
    path("", include("contact.urls")),                       # contact form, newsletter
    path("", include("payments.urls")),                      # /pay/... and /api/payments/...
]

# While developing, Django itself serves uploaded photos from /media/.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
