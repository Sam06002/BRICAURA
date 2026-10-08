"""Storage interface and data mapping specifications for RawLead persistence."""

from abc import ABC, abstractmethod
from typing import Sequence

from app.models.raw_lead import LeadSource, LeadStatus, RawLead

# Strictly ordered worksheet column schema as required by specification
RAW_LEAD_HEADERS: tuple[str, ...] = (
    "lead_id",
    "source",
    "source_url",
    "raw_text",
    "author",
    "collected_at",
    "status",
    "notes",
)


def raw_lead_to_row(lead: RawLead) -> list[str]:
    """Convert a RawLead domain model into an ordered row matching RAW_LEAD_HEADERS.

    The raw_text content is extracted strictly unmodified.
    """
    return [
        lead.lead_id,
        lead.source.value if isinstance(lead.source, LeadSource) else str(lead.source),
        lead.source_url if lead.source_url is not None else "",
        lead.raw_text,
        lead.author if lead.author is not None else "",
        lead.collected_at.isoformat(),
        lead.status.value if isinstance(lead.status, LeadStatus) else str(lead.status),
        lead.notes if lead.notes is not None else "",
    ]


class RawLeadStorage(ABC):
    """Abstract interface for storing raw lead records.

    Isolates domain logic from specific backend implementations (e.g. Google Sheets).
    """

    @abstractmethod
    def initialize(self) -> None:
        """Initialize the storage target (validate connectivity and setup headers/schema)."""
        pass

    @abstractmethod
    def save(self, lead: RawLead) -> None:
        """Persist a single RawLead domain instance."""
        pass

    @abstractmethod
    def save_batch(self, leads: Sequence[RawLead]) -> int:
        """Persist a collection of RawLead instances in batch. Returns number of saved records."""
        pass

    @abstractmethod
    def get_existing_fingerprints(self) -> set[str]:
        """Fetch pre-existing lead fingerprints from storage to prevent duplicates."""
        pass
