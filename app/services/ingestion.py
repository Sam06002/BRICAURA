"""Service layer for raw lead creation and ingestion."""

import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from app.models.raw_lead import LeadSource, LeadStatus, RawLead
from app.storage.base import RawLeadStorage


def generate_lead_id() -> str:
    """Generate a unique identifier for a raw lead."""
    return f"lead-{uuid.uuid4().hex[:12]}"


def create_raw_lead(
    raw_text: str,
    source: str | LeadSource = LeadSource.MANUAL,
    source_url: str | None = None,
    author: str | None = None,
    notes: str = "",
    lead_id_factory: Callable[[], str] = generate_lead_id,
    timestamp_factory: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> RawLead:
    """Create a validated RawLead instance with auto-generated ID and UTC timestamp.

    The raw_text content is strictly preserved as-is.
    """
    clean_url = source_url.strip() if isinstance(source_url, str) and source_url.strip() else None
    clean_author = author.strip() if isinstance(author, str) and author.strip() else None
    clean_notes = notes if isinstance(notes, str) else ""

    return RawLead(
        lead_id=lead_id_factory(),
        source=source,
        source_url=clean_url,
        raw_text=raw_text,
        author=clean_author,
        collected_at=timestamp_factory(),
        status=LeadStatus.NEW,
        notes=clean_notes,
    )


def ingest_lead(lead: RawLead, storage: RawLeadStorage) -> None:
    """Persist a validated RawLead domain model through the storage interface."""
    storage.save(lead)
