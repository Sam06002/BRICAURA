"""Bulk lead ingestion and parsing services for CSV and JSON data sources."""

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from app.models.raw_lead import RawLead
from app.services.deduplication import DeduplicationFilter
from app.services.ingestion import create_raw_lead
from app.storage.base import RawLeadStorage


@dataclass(frozen=True)
class BulkIngestResult:
    """Summary of a batch ingestion operation."""

    total_records: int
    inserted_count: int
    duplicate_count: int
    failed_count: int
    errors: list[str] = field(default_factory=list)


def parse_records_from_csv(file_path: Path | str) -> list[dict[str, Any]]:
    """Parse raw lead records from a CSV file."""
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"CSV file not found: {path}")

    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return []

        for row in reader:
            # Look for common column name variations
            raw_text = (
                row.get("raw_text")
                or row.get("text")
                or row.get("content")
                or row.get("body")
                or ""
            )
            source = row.get("source") or "manual"
            source_url = row.get("source_url") or row.get("url") or None
            author = row.get("author") or row.get("user") or row.get("sender") or None
            notes = row.get("notes") or row.get("comment") or ""

            records.append(
                {
                    "raw_text": raw_text,
                    "source": source,
                    "source_url": source_url,
                    "author": author,
                    "notes": notes,
                }
            )
    return records


def parse_records_from_json(file_path: Path | str) -> list[dict[str, Any]]:
    """Parse raw lead records from a JSON file (array of objects or single object)."""
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"JSON file not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        data = [data]
    elif not isinstance(data, list):
        raise ValueError("JSON content must be an array of lead objects or a single lead object.")

    records: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        raw_text = item.get("raw_text") or item.get("text") or item.get("content") or ""
        source = item.get("source") or "manual"
        source_url = item.get("source_url") or item.get("url")
        author = item.get("author") or item.get("user")
        notes = item.get("notes") or ""

        records.append(
            {
                "raw_text": raw_text,
                "source": source,
                "source_url": source_url,
                "author": author,
                "notes": notes,
            }
        )
    return records


def load_records_from_file(file_path: Path | str) -> list[dict[str, Any]]:
    """Automatically detect format and load records from a CSV or JSON file."""
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".csv":
        return parse_records_from_csv(path)
    elif ext == ".json":
        return parse_records_from_json(path)
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: .csv, .json")


def ingest_bulk_leads(
    records: Sequence[dict[str, Any]],
    storage: RawLeadStorage,
    deduplicate: bool = True,
) -> BulkIngestResult:
    """Validate, deduplicate, and batch persist raw leads."""
    if not records:
        return BulkIngestResult(
            total_records=0,
            inserted_count=0,
            duplicate_count=0,
            failed_count=0,
            errors=[],
        )

    # Initialize deduplication filter with existing records from storage
    existing_fps: set[str] = set()
    if deduplicate:
        try:
            existing_fps = storage.get_existing_fingerprints()
        except Exception:
            existing_fps = set()

    dedup_filter = DeduplicationFilter(existing_fps)

    valid_leads: list[RawLead] = []
    duplicate_count = 0
    errors: list[str] = []

    for idx, item in enumerate(records, start=1):
        try:
            lead = create_raw_lead(
                raw_text=item.get("raw_text", ""),
                source=item.get("source", "manual"),
                source_url=item.get("source_url"),
                author=item.get("author"),
                notes=item.get("notes", ""),
            )

            if deduplicate and dedup_filter.is_duplicate(lead):
                duplicate_count += 1
                continue

            if deduplicate:
                dedup_filter.register(lead)

            valid_leads.append(lead)

        except Exception as exc:
            errors.append(f"Row {idx}: {exc}")

    inserted_count = 0
    if valid_leads:
        inserted_count = storage.save_batch(valid_leads)

    return BulkIngestResult(
        total_records=len(records),
        inserted_count=inserted_count,
        duplicate_count=duplicate_count,
        failed_count=len(errors),
        errors=errors,
    )
