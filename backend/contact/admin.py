import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import ContactMessage, Subscriber


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "email", "subject", "handled")
    list_filter = ("handled",)
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = ("name", "email", "subject", "message", "created_at")
    actions = ["mark_handled"]

    @admin.action(description="Mark selected messages as handled")
    def mark_handled(self, request, queryset):
        queryset.update(handled=True)


def _csv_safe(value):
    # Stops spreadsheet apps from running a cell that starts with = + - @ as a formula.
    return "'" + value if value[:1] in ("=", "+", "-", "@") else value


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "subscribed_at")
    list_filter = ("is_active",)
    search_fields = ("email",)
    readonly_fields = ("subscribed_at",)
    actions = ["export_csv"]

    @admin.action(description="Export selected subscribers as CSV")
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="subscribers.csv"'
        writer = csv.writer(response)
        writer.writerow(["email", "active", "subscribed_at"])
        for s in queryset:
            writer.writerow([_csv_safe(s.email), s.is_active, s.subscribed_at.isoformat()])
        return response
