"""Domain models for structured real estate lead parameters extracted from raw content."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum


class LeadIntent(StrEnum):
    """Customer intent classification."""

    BUY = "buy"
    RENT = "rent"
    SELL = "sell"
    LEASE = "lease"
    UNKNOWN = "unknown"


class PropertyType(StrEnum):
    """Classified property type category."""

    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    STUDIO = "studio"
    COMMERCIAL = "commercial"
    LAND = "land"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Budget:
    """Structured budget / price range."""

    min_price: float | None = None
    max_price: float | None = None
    currency: str = "USD"
    period: str = "total"  # "month" for rentals or "total" for purchase


@dataclass(frozen=True)
class Location:
    """Structured location details."""

    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None


@dataclass
class ExtractedLead:
    """Structured property and customer requirements extracted from a RawLead."""

    lead_id: str
    intent: LeadIntent = LeadIntent.UNKNOWN
    property_type: PropertyType = PropertyType.UNKNOWN
    bedrooms: int | None = None
    bathrooms: float | None = None
    budget: Budget | None = None
    location: Location | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    confidence_score: float = 0.0
    extracted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        if not self.lead_id or not str(self.lead_id).strip():
            raise ValueError("lead_id must be a non-empty string referencing a RawLead.")
        if not (0.0 <= self.confidence_score <= 1.0):
            raise ValueError("confidence_score must be between 0.0 and 1.0.")
