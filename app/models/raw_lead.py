"""Domain models for lead aggregation and ingestion."""

import urllib.parse
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class LeadSource(StrEnum):
    """Controlled enumeration of supported external lead sources."""

    REDDIT = "reddit"
    TELEGRAM = "telegram"
    FACEBOOK = "facebook"
    MANUAL = "manual"


class LeadStatus(StrEnum):
    """Controlled enumeration of lead lifecycle processing states."""

    NEW = "new"
    PROCESSED = "processed"
    REJECTED = "rejected"


def _is_valid_url(url: str) -> bool:
    """Validate that a URL string has a valid http/https scheme and netloc."""
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except (ValueError, AttributeError):
        return False


@dataclass
class RawLead:
    """Represents an unmodified raw lead collected from an external source.

    The raw content (`raw_text`) is preserved exactly as received and must never
    be modified, parsed, or normalized at this stage.
    """

    lead_id: str
    source: LeadSource | str
    raw_text: str
    collected_at: datetime
    source_url: str | None = None
    author: str | None = None
    status: LeadStatus | str = LeadStatus.NEW
    notes: str | None = ""

    def __post_init__(self) -> None:
        """Validate all field constraints upon instantiation."""
        # 1. Validate lead_id
        if not isinstance(self.lead_id, str) or not self.lead_id.strip():
            raise ValueError("lead_id must be a non-empty string.")

        # 2. Validate and normalize source enum
        if isinstance(self.source, str):
            try:
                self.source = LeadSource(self.source)
            except ValueError:
                raise ValueError(
                    f"Invalid source '{self.source}'. Allowed sources: {[s.value for s in LeadSource]}."
                )
        elif not isinstance(self.source, LeadSource):
            raise ValueError(  # noqa: TRY004
                f"Invalid source type. Expected LeadSource or str, got {type(self.source).__name__}."
            )

        # 3. Validate raw_text (strictly preserve original string unmodified)
        if not isinstance(self.raw_text, str) or not self.raw_text.strip():
            raise ValueError("raw_text must be a non-empty string.")

        # 4. Validate collected_at timestamp
        if not isinstance(self.collected_at, datetime):
            raise ValueError("collected_at must be an instance of datetime.")  # noqa: TRY004

        # 5. Validate source_url if provided
        if self.source_url is not None:
            if not isinstance(self.source_url, str):
                raise ValueError("source_url must be a string or None.")
            if self.source_url != "" and not _is_valid_url(self.source_url):
                raise ValueError(f"Invalid source_url '{self.source_url}'. Must be a valid HTTP/HTTPS URL.")

        # 6. Validate author if provided
        if self.author is not None and not isinstance(self.author, str):
            raise ValueError("author must be a string or None.")

        # 7. Validate and normalize status enum
        if isinstance(self.status, str):
            try:
                self.status = LeadStatus(self.status)
            except ValueError:
                raise ValueError(
                    f"Invalid status '{self.status}'. Allowed statuses: {[s.value for s in LeadStatus]}."
                )
        elif not isinstance(self.status, LeadStatus):
            raise ValueError(  # noqa: TRY004
                f"Invalid status type. Expected LeadStatus or str, got {type(self.status).__name__}."
            )

        # 8. Validate notes
        if self.notes is None:
            self.notes = ""
        elif not isinstance(self.notes, str):
            raise ValueError("notes must be a string.")
