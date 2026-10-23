import json
from datetime import date
from pathlib import Path
from urllib.error import URLError

from django.core.management.base import BaseCommand, CommandError

from football.fpl import FplImportError, fetch_bootstrap, import_bootstrap


class Command(BaseCommand):
    help = (
        "Import current Premier League players and season totals from the Fantasy Premier "
        "League public API (one request). Replaces any previous FPL import."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--file", type=Path, help="Read a saved bootstrap-static JSON file instead of fetching."
        )
        parser.add_argument(
            "--save", type=Path, help="Also save the fetched JSON here for reproducibility."
        )
        parser.add_argument(
            "--as-of", help="Date the data reflects (YYYY-MM-DD). Defaults to today."
        )

    def handle(self, *args, **options):
        try:
            as_of = date.fromisoformat(options["as_of"]) if options["as_of"] else date.today()
        except ValueError as exc:
            raise CommandError("--as-of must be YYYY-MM-DD") from exc

        if options["file"]:
            try:
                data = json.loads(options["file"].read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise CommandError(f"Could not read {options['file']}: {exc}") from exc
        else:
            try:
                data = fetch_bootstrap()
            except (URLError, TimeoutError, json.JSONDecodeError) as exc:
                raise CommandError(f"Could not fetch FPL data: {exc}") from exc
            if options["save"]:
                options["save"].write_text(json.dumps(data), encoding="utf-8")

        try:
            result, skipped, season = import_bootstrap(data, as_of)
        except FplImportError as exc:
            raise CommandError(f"Import failed, nothing was written: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {season} Premier League data: {result.clubs} clubs, "
                f"{result.players} players ({skipped} non-player or removed entries skipped)."
            )
        )
