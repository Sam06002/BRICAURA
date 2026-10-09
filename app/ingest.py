"""CLI entry point for manual raw lead ingestion."""

import argparse
import sys
from collections.abc import Sequence

from app.models.raw_lead import LeadSource
from app.services.ingestion import create_raw_lead, ingest_lead
from app.storage.base import RawLeadStorage
from app.storage.exceptions import StorageError
from app.storage.google_sheets import GoogleSheetsStorage
from config.settings import Settings, get_settings


def parse_args(args: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for manual lead ingestion."""
    parser = argparse.ArgumentParser(
        description="Manually ingest a raw lead into Google Sheets persistence."
    )
    parser.add_argument(
        "--raw-text",
        "-t",
        type=str,
        help="Raw unmodified lead text content.",
    )
    parser.add_argument(
        "--source",
        "-s",
        type=str,
        default=LeadSource.MANUAL.value,
        help=f"Source of the lead. Allowed: {[s.value for s in LeadSource]} (default: manual).",
    )
    parser.add_argument(
        "--source-url",
        "-u",
        type=str,
        default=None,
        help="Optional source URL where the lead post was found.",
    )
    parser.add_argument(
        "--author",
        "-a",
        type=str,
        default=None,
        help="Optional author or poster username.",
    )
    parser.add_argument(
        "--notes",
        "-n",
        type=str,
        default="",
        help="Optional internal notes.",
    )
    parser.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Force interactive prompt mode.",
    )
    return parser.parse_args(args)


def prompt_for_lead_data() -> dict[str, str | None]:
    """Interactively prompt user for lead fields from standard input."""
    print("--- Manual Lead Ingestion ---")
    raw_text = input("Raw text (required): ")
    source_input = input(f"Source (default: {LeadSource.MANUAL.value}): ").strip()
    source = source_input if source_input else LeadSource.MANUAL.value
    source_url_input = input("Source URL (optional): ").strip()
    source_url = source_url_input if source_url_input else None
    author_input = input("Author (optional): ").strip()
    author = author_input if author_input else None
    notes = input("Notes (optional): ")
    return {
        "raw_text": raw_text,
        "source": source,
        "source_url": source_url,
        "author": author,
        "notes": notes,
    }


def run_ingest(
    raw_text: str,
    source: str = LeadSource.MANUAL.value,
    source_url: str | None = None,
    author: str | None = None,
    notes: str = "",
    storage: RawLeadStorage | None = None,
    settings: Settings | None = None,
) -> int:
    """Create and persist a raw lead through the storage interface."""
    try:
        # 1. Validate and construct the domain model
        lead = create_raw_lead(
            raw_text=raw_text,
            source=source,
            source_url=source_url,
            author=author,
            notes=notes,
        )

        # 2. Resolve storage backend if not injected
        if storage is None:
            active_settings = settings or get_settings()
            storage = GoogleSheetsStorage.from_settings(active_settings)

        # 3. Save lead through storage interface
        ingest_lead(lead, storage)

        print(
            f"SUCCESS: Ingested lead '{lead.lead_id}' (Source: {lead.source}, Status: {lead.status}) successfully."
        )
        return 0

    except ValueError as exc:
        print(f"Validation Error: {exc}", file=sys.stderr)
        return 1
    except StorageError as exc:
        print(f"Storage Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected Error: {exc}", file=sys.stderr)
        return 1


def main(args: Sequence[str] | None = None) -> int:
    """Main CLI execution entry point."""
    parsed = parse_args(args)

    if parsed.interactive or not parsed.raw_text:
        if sys.stdin.isatty() or parsed.interactive:
            prompt_data = prompt_for_lead_data()
            return run_ingest(
                raw_text=prompt_data["raw_text"] or "",
                source=prompt_data["source"] or LeadSource.MANUAL.value,
                source_url=prompt_data["source_url"],
                author=prompt_data["author"],
                notes=prompt_data["notes"] or "",
            )
        print("Error: --raw-text is required when running non-interactively.", file=sys.stderr)
        return 1

    return run_ingest(
        raw_text=parsed.raw_text,
        source=parsed.source,
        source_url=parsed.source_url,
        author=parsed.author,
        notes=parsed.notes,
    )


if __name__ == "__main__":
    sys.exit(main())
