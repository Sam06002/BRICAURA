"""Deduplication and content fingerprinting utilities for raw leads."""

import hashlib
import re
from collections.abc import Sequence

from app.models.raw_lead import LeadSource, RawLead


def normalize_text_for_fingerprint(text: str) -> str:
    """Normalize text by lowercasing and collapsing whitespace to detect semantic duplicates."""
    collapsed = re.sub(r"\s+", " ", text.strip().lower())
    return collapsed


def compute_lead_fingerprint(source: str, source_url: str | None, raw_text: str) -> str:
    """Compute a deterministic SHA-256 fingerprint from source, URL, and raw text.

    Used to identify duplicate leads across different collection intervals.
    """
    normalized_source = source.strip().lower()
    normalized_url = source_url.strip().lower() if source_url else ""
    normalized_text = normalize_text_for_fingerprint(raw_text)

    payload = f"{normalized_source}|{normalized_url}|{normalized_text}".encode()
    return hashlib.sha256(payload).hexdigest()


class DeduplicationFilter:
    """In-memory and storage-backed deduplication filter."""

    def __init__(self, existing_fingerprints: set[str] | None = None) -> None:
        self.seen_fingerprints: set[str] = set(existing_fingerprints or [])

    def is_duplicate(self, lead: RawLead) -> bool:
        """Check whether a lead's fingerprint has already been recorded."""
        source_val = lead.source.value if isinstance(lead.source, LeadSource) else str(lead.source)
        fingerprint = compute_lead_fingerprint(source_val, lead.source_url, lead.raw_text)
        return fingerprint in self.seen_fingerprints

    def register(self, lead: RawLead) -> str:
        """Register a lead and return its computed fingerprint."""
        source_val = lead.source.value if isinstance(lead.source, LeadSource) else str(lead.source)
        fingerprint = compute_lead_fingerprint(source_val, lead.source_url, lead.raw_text)
        self.seen_fingerprints.add(fingerprint)
        return fingerprint

    def filter_unique(self, leads: Sequence[RawLead]) -> list[RawLead]:
        """Filter out duplicates from a sequence of leads, registering new ones."""
        unique_leads: list[RawLead] = []
        for lead in leads:
            if not self.is_duplicate(lead):
                self.register(lead)
                unique_leads.append(lead)
        return unique_leads
