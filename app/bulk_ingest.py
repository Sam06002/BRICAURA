"""CLI entry point for bulk raw lead ingestion from CSV or JSON files."""

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from app.services.bulk_ingest import ingest_bulk_leads, load_records_from_file
from app.storage.base import RawLeadStorage
from app.storage.exceptions import StorageError
from app.storage.google_sheets import GoogleSheetsStorage
from config.settings import Settings, get_settings


def parse_args(args: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for bulk lead ingestion."""
    parser = argparse.ArgumentParser(
        description="Bulk ingest raw leads from CSV or JSON files into Google Sheets."
    )
    parser.add_argument(
        "file_path",
        type=str,
        help="Path to the .csv or .json file containing raw lead records.",
    )
    parser.add_argument(
        "--no-dedup",
        action="store_true",
        help="Disable duplicate detection and fingerprint filtering.",
    )
    return parser.parse_args(args)


def run_bulk_ingest(
    file_path: Path | str,
    deduplicate: bool = True,
    storage: RawLeadStorage | None = None,
    settings: Settings | None = None,
) -> int:
    """Execute bulk lead loading and persistence."""
    try:
        path = Path(file_path)
        if not path.is_file():
            print(f"Error: File not found at '{path}'", file=sys.stderr)
            return 1

        print(f"Loading records from '{path.name}'...")
        records = load_records_from_file(path)
        if not records:
            print("Warning: No records found in file.")
            return 0

        print(f"Loaded {len(records)} raw record(s). Processing...")

        if storage is None:
            active_settings = settings or get_settings()
            storage = GoogleSheetsStorage.from_settings(active_settings)

        result = ingest_bulk_leads(records, storage=storage, deduplicate=deduplicate)

        print("\n--- Bulk Ingestion Summary ---")
        print(f"Total Processed : {result.total_records}")
        print(f"Successfully Saved: {result.inserted_count}")
        print(f"Duplicates Skipped: {result.duplicate_count}")
        print(f"Failed / Invalid  : {result.failed_count}")

        if result.errors:
            print("\nErrors encountered:")
            for err in result.errors[:10]:
                print(f"  - {err}")
            if len(result.errors) > 10:
                print(f"  ... and {len(result.errors) - 10} more error(s)")

        return 0 if result.failed_count == 0 else 1

    except StorageError as exc:
        print(f"Storage Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


def main(args: Sequence[str] | None = None) -> int:
    """Main CLI execution entry point."""
    parsed = parse_args(args)
    return run_bulk_ingest(
        file_path=parsed.file_path,
        deduplicate=not parsed.no_dedup,
    )


if __name__ == "__main__":
    sys.exit(main())
