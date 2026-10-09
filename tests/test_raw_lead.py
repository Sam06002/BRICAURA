"""Unit tests for the RawLead domain model and its validations."""

import unittest
from datetime import datetime, timezone

from app.models.raw_lead import LeadSource, LeadStatus, RawLead


class TestRawLead(unittest.TestCase):
    """Test suite for RawLead domain model instantiation and field validations."""

    def setUp(self) -> None:
        """Set up standard valid test fixtures."""
        self.valid_lead_id = "lead-12345"
        self.valid_source = LeadSource.REDDIT
        self.valid_url = "https://reddit.com/r/realestate/comments/abc123"
        self.valid_raw_text = "  Looking for a 2BHK apartment in downtown! Budget $2000.  \nContact me: test@example.com"
        self.valid_author = "user_realtor_42"
        self.valid_collected_at = datetime.now(timezone.utc)
        self.valid_status = LeadStatus.NEW
        self.valid_notes = "Imported from evening feed"

    def test_valid_lead_instantiation_with_all_fields(self) -> None:
        """Verify successful instantiation with all fields populated."""
        lead = RawLead(
            lead_id=self.valid_lead_id,
            source=self.valid_source,
            source_url=self.valid_url,
            raw_text=self.valid_raw_text,
            author=self.valid_author,
            collected_at=self.valid_collected_at,
            status=self.valid_status,
            notes=self.valid_notes,
        )

        self.assertEqual(lead.lead_id, self.valid_lead_id)
        self.assertEqual(lead.source, LeadSource.REDDIT)
        self.assertEqual(lead.source_url, self.valid_url)
        # Crucial rule: raw_text must be preserved exactly as-is
        self.assertEqual(lead.raw_text, self.valid_raw_text)
        self.assertEqual(lead.author, self.valid_author)
        self.assertEqual(lead.collected_at, self.valid_collected_at)
        self.assertEqual(lead.status, LeadStatus.NEW)
        self.assertEqual(lead.notes, self.valid_notes)

    def test_valid_lead_defaults(self) -> None:
        """Verify instantiation with default optional values."""
        lead = RawLead(
            lead_id=self.valid_lead_id,
            source="manual",
            raw_text="Manual phone inquiry from John Doe",
            collected_at=self.valid_collected_at,
        )

        self.assertEqual(lead.source, LeadSource.MANUAL)
        self.assertEqual(lead.status, LeadStatus.NEW)
        self.assertIsNone(lead.source_url)
        self.assertIsNone(lead.author)
        self.assertEqual(lead.notes, "")

    def test_all_supported_lead_sources(self) -> None:
        """Verify that all defined LeadSource values and strings are accepted."""
        for source_val in ["reddit", "telegram", "facebook", "manual"]:
            with self.subTest(source=source_val):
                lead = RawLead(
                    lead_id="test-id",
                    source=source_val,
                    raw_text="Inquiry content",
                    collected_at=self.valid_collected_at,
                )
                self.assertEqual(lead.source, LeadSource(source_val))

    def test_all_supported_lead_statuses(self) -> None:
        """Verify that all defined LeadStatus values and strings are accepted."""
        for status_val in ["new", "processed", "rejected"]:
            with self.subTest(status=status_val):
                lead = RawLead(
                    lead_id="test-id",
                    source=LeadSource.MANUAL,
                    raw_text="Inquiry content",
                    collected_at=self.valid_collected_at,
                    status=status_val,
                )
                self.assertEqual(lead.status, LeadStatus(status_val))

    def test_missing_or_empty_lead_id(self) -> None:
        """Verify that missing, empty, or whitespace-only lead_id raises ValueError."""
        invalid_lead_ids = ["", "   ", None, 12345]
        for invalid_id in invalid_lead_ids:
            with self.subTest(lead_id=invalid_id), self.assertRaises(ValueError):
                RawLead(
                    lead_id=invalid_id,  # type: ignore[arg-type]
                    source=LeadSource.MANUAL,
                    raw_text="Valid content",
                    collected_at=self.valid_collected_at,
                )

    def test_invalid_source(self) -> None:
        """Verify that unsupported or invalid source types raise ValueError."""
        invalid_sources = ["twitter", "linkedin", "tiktok", "", 123, None]
        for invalid_source in invalid_sources:
            with self.subTest(source=invalid_source), self.assertRaises(ValueError):
                RawLead(
                    lead_id=self.valid_lead_id,
                    source=invalid_source,  # type: ignore[arg-type]
                    raw_text="Valid content",
                    collected_at=self.valid_collected_at,
                )

    def test_invalid_status(self) -> None:
        """Verify that unsupported or invalid status values raise ValueError."""
        invalid_statuses = ["pending", "archived", "deleted", "", 42]
        for invalid_status in invalid_statuses:
            with self.subTest(status=invalid_status), self.assertRaises(ValueError):
                RawLead(
                    lead_id=self.valid_lead_id,
                    source=LeadSource.MANUAL,
                    raw_text="Valid content",
                    collected_at=self.valid_collected_at,
                    status=invalid_status,  # type: ignore[arg-type]
                )

    def test_empty_or_whitespace_raw_text(self) -> None:
        """Verify that empty or whitespace-only raw_text raises ValueError."""
        invalid_raw_texts = ["", "   ", "\t\n  ", None, 100]
        for invalid_text in invalid_raw_texts:
            with self.subTest(raw_text=invalid_text), self.assertRaises(ValueError):
                RawLead(
                    lead_id=self.valid_lead_id,
                    source=LeadSource.MANUAL,
                    raw_text=invalid_text,  # type: ignore[arg-type]
                    collected_at=self.valid_collected_at,
                )

    def test_raw_text_immutability_and_preservation(self) -> None:
        """Verify raw_text is never trimmed, modified, or classified."""
        exact_raw = "\n\n  [RAW UNMODIFIED LEAD] Property with special chars: <html> & emojis 🏠🔑  \n"
        lead = RawLead(
            lead_id=self.valid_lead_id,
            source=LeadSource.TELEGRAM,
            raw_text=exact_raw,
            collected_at=self.valid_collected_at,
        )
        self.assertEqual(lead.raw_text, exact_raw)

    def test_invalid_source_url(self) -> None:
        """Verify invalid URLs raise ValueError when source_url is provided."""
        invalid_urls = [
            "not-a-url",
            "ftp://example.com/file",
            "http://",
            "https://",
            "just text without domain",
            "httpp://typo.com",
            12345,
        ]
        for invalid_url in invalid_urls:
            with self.subTest(source_url=invalid_url), self.assertRaises(ValueError):
                RawLead(
                    lead_id=self.valid_lead_id,
                    source=LeadSource.REDDIT,
                    source_url=invalid_url,  # type: ignore[arg-type]
                    raw_text="Valid text",
                    collected_at=self.valid_collected_at,
                )

    def test_valid_source_urls(self) -> None:
        """Verify valid HTTP and HTTPS URLs are accepted."""
        valid_urls = [
            "https://reddit.com/r/realestate/comments/123",
            "http://t.me/channel_name/456",
            "https://facebook.com/groups/realestate/posts/789",
            None,
            "",
        ]
        for valid_url in valid_urls:
            with self.subTest(source_url=valid_url):
                lead = RawLead(
                    lead_id=self.valid_lead_id,
                    source=LeadSource.REDDIT,
                    source_url=valid_url,
                    raw_text="Valid text",
                    collected_at=self.valid_collected_at,
                )
                self.assertEqual(lead.source_url, valid_url)

    def test_invalid_collected_at(self) -> None:
        """Verify that invalid collected_at type raises ValueError."""
        invalid_timestamps = ["2026-10-08T18:00:00Z", 1700000000, None]
        for invalid_ts in invalid_timestamps:
            with self.subTest(collected_at=invalid_ts), self.assertRaises(ValueError):
                RawLead(
                    lead_id=self.valid_lead_id,
                    source=LeadSource.MANUAL,
                    raw_text="Valid text",
                    collected_at=invalid_ts,  # type: ignore[arg-type]
                )

    def test_invalid_author_type(self) -> None:
        """Verify that non-string non-None author raises ValueError."""
        with self.assertRaises(ValueError):
            RawLead(
                lead_id=self.valid_lead_id,
                source=LeadSource.MANUAL,
                raw_text="Valid text",
                collected_at=self.valid_collected_at,
                author=12345,  # type: ignore[arg-type]
            )

    def test_invalid_notes_type(self) -> None:
        """Verify that non-string notes raises ValueError."""
        with self.assertRaises(ValueError):
            RawLead(
                lead_id=self.valid_lead_id,
                source=LeadSource.MANUAL,
                raw_text="Valid text",
                collected_at=self.valid_collected_at,
                notes=12345,  # type: ignore[arg-type]
            )


if __name__ == "__main__":
    unittest.main()
