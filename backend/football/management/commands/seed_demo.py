from django.core.management.base import BaseCommand

from football.demo import DEMO_SEED, build_demo_dataset


class Command(BaseCommand):
    help = (
        "Generate the fictional demo dataset (replacing any previous demo data). "
        "Real data sources are left untouched."
    )

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=DEMO_SEED)

    def handle(self, *args, **options):
        summary = build_demo_dataset(seed=options["seed"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Demo dataset ready: {summary.clubs} clubs, {summary.players} players, "
                f"{summary.seasons} seasons, {summary.missing_metric_values} metric values "
                "intentionally missing. All data is fictional."
            )
        )
