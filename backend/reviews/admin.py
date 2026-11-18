from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("created_at", "product", "author_name", "rating", "is_visible")
    list_filter = ("is_visible", "rating")
    search_fields = ("product__name", "author_name", "text")
    readonly_fields = ("product", "user", "author_name", "rating", "text", "created_at")
    actions = ["hide_reviews", "show_reviews"]

    # We loop and save() (instead of queryset.update) so the product's star rating is recalculated.
    @admin.action(description="Hide selected reviews")
    def hide_reviews(self, request, queryset):
        for review in queryset:
            review.is_visible = False
            review.save()

    @admin.action(description="Show selected reviews")
    def show_reviews(self, request, queryset):
        for review in queryset:
            review.is_visible = True
            review.save()
