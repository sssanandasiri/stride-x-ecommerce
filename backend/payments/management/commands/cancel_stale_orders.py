from django.conf import settings
from django.core.management.base import BaseCommand

from payments.services import expire_stale_orders


class Command(BaseCommand):
    help = "Cancel unpaid online orders older than N minutes and restock their items."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=settings.PENDING_ORDER_TTL_MINUTES)

    def handle(self, *args, **options):
        count = expire_stale_orders(options["minutes"])
        self.stdout.write(self.style.SUCCESS(f"Cancelled {count} stale order(s)."))
