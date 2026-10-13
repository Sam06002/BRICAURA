"""Facebook lead collection foundation: normalized models, collector interface, and fixture implementation."""

import json
from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models.raw_lead import LeadSource, RawLead
from app.services.bulk_ingest import BulkIngestResult, ingest_bulk_leads
from app.services.ingestion import create_raw_lead
from app.storage.base import RawLeadStorage

DEFAULT_FIXTURE_PATH = Path("data/fixtures/facebook_property_posts.json")


def _parse_timestamp(raw_val: Any) -> datetime:
    """Safely parse ISO timestamp string or numeric timestamp into UTC datetime."""
    if isinstance(raw_val, datetime):
        return raw_val if raw_val.tzinfo else raw_val.replace(tzinfo=timezone.utc)
    if isinstance(raw_val, (int, float)):
        return datetime.fromtimestamp(raw_val, tz=timezone.utc)
    if isinstance(raw_val, str) and raw_val.strip():
        clean_str = raw_val.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(clean_str)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class FacebookPost:
    """Normalized Facebook lead post collected from a permitted or fixture source.

    Attributes:
        text: Raw unmodified post text content.
        collected_at: UTC timestamp when the record was collected.
        source_url: Direct canonical URL to the post (if available).
        author: Legitimate author/poster display name (None when anonymous, unavailable, or restricted).
        post_id: Source-specific unique post identifier (optional).
    """

    text: str
    collected_at: datetime
    source_url: str | None = None
    author: str | None = None
    post_id: str | None = None

    @property
    def is_valid(self) -> bool:
        """Check if post contains non-empty text required for raw lead ingestion."""
        return bool(self.text and self.text.strip())

    def to_raw_lead(self) -> RawLead:
        """Convert normalized Facebook post into a BRICAURA RawLead domain model.

        Raises:
            ValueError: If post text is empty or invalid per RawLead constraints.
        """
        collected_time = self.collected_at
        return create_raw_lead(
            raw_text=self.text,
            source=LeadSource.FACEBOOK,
            source_url=self.source_url,
            author=self.author,
            timestamp_factory=lambda: collected_time,
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary representation matching batch pipeline ingest records."""
        return {
            "raw_text": self.text,
            "source": LeadSource.FACEBOOK.value,
            "source_url": self.source_url,
            "author": self.author,
            "collected_at": self.collected_at.isoformat(),
            "source_post_id": self.post_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FacebookPost":
        """Construct a FacebookPost from a dictionary."""
        raw_text = (
            data.get("text")
            or data.get("raw_text")
            or data.get("message")
            or data.get("content")
            or ""
        )
        source_url = data.get("source_url") or data.get("permalink_url") or data.get("url")
        author = data.get("author") or data.get("user") or data.get("poster")
        # Ensure author is only populated when legitimately available as a non-empty string
        clean_author = str(author).strip() if author and str(author).strip() else None

        collected_at = _parse_timestamp(
            data.get("collected_at") or data.get("created_time") or data.get("posted_at")
        )
        post_id = data.get("post_id") or data.get("id") or None

        return cls(
            text=raw_text,
            source_url=str(source_url).strip() if source_url else None,
            author=clean_author,
            collected_at=collected_at,
            post_id=str(post_id).strip() if post_id else None,
        )


class FacebookCollector(ABC):
    """Abstract interface for Facebook lead collection.

    Defines contract for collecting normalized posts without dictating network or storage specifics.
    """

    @abstractmethod
    def collect(self) -> list[FacebookPost]:
        """Collect normalized Facebook posts from the source.

        Returns:
            A list of normalized FacebookPost instances.
        """

    def collect_as_raw_leads(self, *, skip_invalid: bool = False) -> list[RawLead]:
        """Collect and convert normalized posts to validated RawLead instances.

        Args:
            skip_invalid: If True, skip posts with empty or invalid text. If False,
                          invalid posts will raise ValueError during RawLead validation.

        Returns:
            A list of validated RawLead domain model instances with LeadSource.FACEBOOK.
        """
        raw_leads: list[RawLead] = []
        for post in self.collect():
            if not post.is_valid and skip_invalid:
                continue
            raw_leads.append(post.to_raw_lead())
        return raw_leads

    def ingest_into_storage(
        self,
        storage: RawLeadStorage,
        *,
        deduplicate: bool = True,
        skip_invalid: bool = True,
    ) -> BulkIngestResult:
        """Collect posts and persist them into the provided storage backend through the ingestion pipeline.

        Args:
            storage: Destination storage implementation (e.g. GoogleSheetsStorage).
            deduplicate: If True, filter out duplicate posts using SHA-256 fingerprinting.
            skip_invalid: If True, skip posts without valid text content.

        Returns:
            BulkIngestResult summarizing total, inserted, duplicate, and failed counts.
        """
        posts = self.collect()
        records: list[dict[str, Any]] = []
        for post in posts:
            if not post.is_valid and skip_invalid:
                continue
            records.append(post.to_dict())

        return ingest_bulk_leads(records, storage=storage, deduplicate=deduplicate)


class FixtureFacebookCollector(FacebookCollector):
    """Zero-network, fixture-based Facebook collector for development, testing, and CI.

    Operates purely on local JSON fixtures or in-memory sample records.
    Never makes network requests or requires Facebook API credentials.
    """

    def __init__(
        self,
        fixture_data: Sequence[dict[str, Any] | FacebookPost] | None = None,
        fixture_path: Path | str | None = None,
    ) -> None:
        """Initialize the fixture collector.

        Args:
            fixture_data: Optional explicit sequence of dictionaries or FacebookPost instances.
            fixture_path: Optional path to a JSON fixture file. Defaults to
                          data/fixtures/facebook_property_posts.json if exists.
        """
        self._fixture_data = fixture_data
        self._fixture_path = Path(fixture_path) if fixture_path else DEFAULT_FIXTURE_PATH

    def collect(self) -> list[FacebookPost]:
        """Load and return normalized posts from in-memory data or fixture file."""
        if self._fixture_data is not None:
            posts: list[FacebookPost] = []
            for item in self._fixture_data:
                if isinstance(item, FacebookPost):
                    posts.append(item)
                elif isinstance(item, dict):
                    posts.append(FacebookPost.from_dict(item))
            return posts

        if self._fixture_path.is_file():
            with self._fixture_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return [FacebookPost.from_dict(item) for item in data if isinstance(item, dict)]
            if isinstance(data, dict):
                return [FacebookPost.from_dict(data)]

        return []
