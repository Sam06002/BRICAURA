"""Unit tests for lead deduplication and content fingerprinting."""

import unittest
from datetime import datetime, timezone

from app.models.raw_lead import LeadSource, RawLead
from app.services.deduplication import (
    DeduplicationFilter,
    compute_lead_fingerprint,
    normalize_text_for_fingerprint,
)


class TestDeduplication(unittest.TestCase):
    """Test fingerprint calculation and deduplication filtering."""

    def test_normalize_text_for_fingerprint(self) -> None:
        """Verify normalization removes extraneous spacing and lowercases text."""
        text1 = "  Looking for   a  2BHK  house \n\n in Austin.  "
        text2 = "looking for a 2bhk house in austin."
        self.assertEqual(
            normalize_text_for_fingerprint(text1),
            normalize_text_for_fingerprint(text2),
        )

    def test_compute_lead_fingerprint_deterministic(self) -> None:
        """Verify identical content yields identical fingerprints."""
        fp1 = compute_lead_fingerprint("reddit", "https://reddit.com/r/1", "Looking for 3BHK")
        fp2 = compute_lead_fingerprint("reddit", "https://reddit.com/r/1", "Looking for 3BHK")
        self.assertEqual(fp1, fp2)
        self.assertEqual(len(fp1), 64)  # Valid SHA-256

    def test_compute_lead_fingerprint_distinct(self) -> None:
        """Verify different content yields different fingerprints."""
        fp1 = compute_lead_fingerprint("reddit", "https://reddit.com/r/1", "Looking for 3BHK")
        fp2 = compute_lead_fingerprint("telegram", "https://reddit.com/r/1", "Looking for 3BHK")
        self.assertNotEqual(fp1, fp2)

    def test_deduplication_filter(self) -> None:
        """Verify DeduplicationFilter identifies duplicates correctly."""
        now = datetime.now(timezone.utc)
        lead1 = RawLead(
            lead_id="lead-1",
            source=LeadSource.REDDIT,
            source_url="https://reddit.com/r/1",
            raw_text="Looking for 2BHK flat",
            collected_at=now,
        )
        lead2_duplicate = RawLead(
            lead_id="lead-2",
            source=LeadSource.REDDIT,
            source_url="https://reddit.com/r/1",
            raw_text="  looking for   2bhk flat  ",
            collected_at=now,
        )
        lead3_distinct = RawLead(
            lead_id="lead-3",
            source=LeadSource.TELEGRAM,
            source_url="https://t.me/1",
            raw_text="Villa for sale",
            collected_at=now,
        )

        dedup = DeduplicationFilter()
        self.assertFalse(dedup.is_duplicate(lead1))
        dedup.register(lead1)

        self.assertTrue(dedup.is_duplicate(lead2_duplicate))
        self.assertFalse(dedup.is_duplicate(lead3_distinct))

        unique = dedup.filter_unique([lead1, lead2_duplicate, lead3_distinct])
        self.assertEqual(len(unique), 1)  # Only lead3_distinct is new
        self.assertEqual(unique[0].lead_id, "lead-3")


if __name__ == "__main__":
    unittest.main()
