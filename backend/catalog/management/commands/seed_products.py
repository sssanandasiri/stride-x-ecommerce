from django.core.management.base import BaseCommand

from catalog.seed import load_seed


class Command(BaseCommand):
    help = "Load the starting product catalog into the database."

    def add_arguments(self, parser):
        parser.add_argument("--wipe", action="store_true", help="delete all products first")

    def handle(self, *args, **options):
        count = load_seed(wipe=options["wipe"])
        self.stdout.write(self.style.SUCCESS(f"Loaded {count} products."))
