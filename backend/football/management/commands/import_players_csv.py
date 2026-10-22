from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from football.importers import CsvImportError, SourceInfo, import_csv


class Command(BaseCommand):
    help = (
        "Import clubs, players and season statistics from a CSV file you are licensed to use. "
        "Re-importing with the same --source-slug replaces that source's data."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=Path)
        parser.add_argument("--source-slug", required=True)
        parser.add_argument("--source-name", required=True)
        parser.add_argument("--as-of", required=True, help="Date the data reflects (YYYY-MM-DD).")
        parser.add_argument(
            "--licence", required=True, help="Licence or usage terms that permit this use."
        )
        parser.add_argument("--url", default="")
        parser.add_argument("--notes", default="")
        parser.add_argument("--competition", default="Premier League")
        parser.add_argument(
            "--demo", action="store_true", help="Mark the imported data as demo (not real)."
        )

    def handle(self, *args, **options):
        path: Path = options["csv_path"]
        if not path.is_file():
            raise CommandError(f"File not found: {path}")
        try:
            as_of = date.fromisoformat(options["as_of"])
        except ValueError as exc:
            raise CommandError("--as-of must be YYYY-MM-DD") from exc
        if options["source_slug"] == "demo":
            raise CommandError("The 'demo' source slug is reserved for seed_demo.")

        info = SourceInfo(
            slug=options["source_slug"],
            name=options["source_name"],
            as_of=as_of,
            licence=options["licence"],
            url=options["url"],
            notes=options["notes"],
            is_demo=options["demo"],
        )
        try:
            result = import_csv(path, info, default_competition=options["competition"])
        except CsvImportError as exc:
            raise CommandError(f"Import failed, nothing was written: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {result.clubs} clubs, {result.players} players and "
                f"{result.seasons} season rows into '{info.slug}'."
            )
        )
