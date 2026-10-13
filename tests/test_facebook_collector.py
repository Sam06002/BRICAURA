"""Unit tests for Facebook collector foundation, normalized output, and pipeline integration."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.extraction.rules import RuleBasedExtractor
from app.models.extracted_lead import LeadType, PropertyType, TransactionType
from app.models.raw_lead import LeadSource, LeadStatus
from app.services.deduplication import DeduplicationFilter
from app.services.facebook_collector import (
    FacebookCollector,
    FacebookPost,
    FixtureFacebookCollector,
)
from app.storage.base import RAW_LEAD_HEADERS, RawLeadStorage, raw_lead_to_row
from config.facebook import FacebookCollectorConfig, get_facebook_config


class TestFacebookCollectorFoundation(unittest.TestCase):
    """Test suite for Facebook collector interface, fixture loading, and ingestion integration."""

    def setUp(self) -> None:
        self.collector = FixtureFacebookCollector()
        self.mock_storage = MagicMock(spec=RawLeadStorage)
        self.mock_storage.get_existing_fingerprints.return_value = set()
        self.mock_storage.save_batch.side_effect = lambda leads: len(leads)

    def test_collector_interface_contract(self) -> None:
        """Verify FixtureFacebookCollector implements the FacebookCollector ABC."""
        self.assertIsInstance(self.collector, FacebookCollector)
        posts = self.collector.collect()
        self.assertIsInstance(posts, list)
        self.assertGreater(len(posts), 0)
        for post in posts:
            self.assertIsInstance(post, FacebookPost)

    def test_normalized_collector_output_structure(self) -> None:
        """Verify FacebookPost schema includes text, source URL, author, and timestamp."""
        sample = self.collector.collect()[0]
        self.assertIsInstance(sample.text, str)
        self.assertTrue(sample.text.strip())
        self.assertTrue(sample.source_url is None or sample.source_url.startswith("https://"))
        self.assertIsInstance(sample.collected_at, datetime)
        self.assertIsNotNone(sample.collected_at.tzinfo)

    def test_source_attribution_to_facebook(self) -> None:
        """Verify all collected leads are attributed strictly to LeadSource.FACEBOOK."""
        raw_leads = self.collector.collect_as_raw_leads(skip_invalid=True)
        self.assertGreater(len(raw_leads), 0)
        for lead in raw_leads:
            self.assertEqual(lead.source, LeadSource.FACEBOOK)
            self.assertEqual(str(lead.source), "facebook")
            self.assertEqual(lead.status, LeadStatus.NEW)

    def test_author_only_when_legitimately_available(self) -> None:
        """Verify author name is populated when present, and None for anonymous posts."""
        posts = self.collector.collect()

        # Post 101 has legitimate author "Rohan Sharma"
        named_post = next((p for p in posts if p.post_id == "fb-post-101"), None)
        self.assertIsNotNone(named_post)
        assert named_post is not None
        self.assertEqual(named_post.author, "Rohan Sharma")
        raw_named = named_post.to_raw_lead()
        self.assertEqual(raw_named.author, "Rohan Sharma")

        # Post 105 represents an anonymous/unattributed group post
        anon_post = next((p for p in posts if p.post_id == "fb-post-105"), None)
        self.assertIsNotNone(anon_post)
        assert anon_post is not None
        self.assertIsNone(anon_post.author)
        raw_anon = anon_post.to_raw_lead()
        self.assertIsNone(raw_anon.author)

    def test_missing_or_empty_text_handling(self) -> None:
        """Verify posts with missing or empty text are flagged and rejected by RawLead."""
        empty_post = FacebookPost(
            text="   ",
            collected_at=datetime.now(timezone.utc),
            source_url="https://www.facebook.com/groups/re/posts/1/",
            author="Poster",
        )
        self.assertFalse(empty_post.is_valid)

        # Attempting to convert empty post to RawLead raises ValueError per domain model
        with self.assertRaises(ValueError):
            empty_post.to_raw_lead()

        # collect_as_raw_leads with skip_invalid=True omits invalid posts cleanly
        collector = FixtureFacebookCollector(fixture_data=[empty_post])
        self.assertEqual(len(collector.collect_as_raw_leads(skip_invalid=True)), 0)

    def test_strict_preservation_of_raw_text(self) -> None:
        """Verify multiline formatting, emojis, quotes, and newlines are strictly preserved."""
        posts = self.collector.collect()
        multiline_post = next((p for p in posts if p.post_id == "fb-post-106"), None)
        self.assertIsNotNone(multiline_post)
        assert multiline_post is not None

        raw_lead = multiline_post.to_raw_lead()
        self.assertEqual(raw_lead.raw_text, multiline_post.text)
        self.assertIn("🏡", raw_lead.raw_text)
        self.assertIn("✨", raw_lead.raw_text)
        self.assertIn("💰", raw_lead.raw_text)
        self.assertIn("\n", raw_lead.raw_text)
        self.assertEqual(
            raw_lead.source_url,
            "https://www.facebook.com/groups/ahmedabadluxuryliving/posts/60609012345678906/",
        )

    def test_duplicate_posts_detection(self) -> None:
        """Verify SHA-256 fingerprint deduplication filter detects identical Facebook posts."""
        posts = self.collector.collect()
        valid_post = next(p for p in posts if p.is_valid)

        lead_1 = valid_post.to_raw_lead()
        lead_2 = valid_post.to_raw_lead()  # identical content, different generated ID

        dedup_filter = DeduplicationFilter()
        self.assertFalse(dedup_filter.is_duplicate(lead_1))
        dedup_filter.register(lead_1)
        self.assertTrue(dedup_filter.is_duplicate(lead_2))

        batch_filter = DeduplicationFilter()
        unique = batch_filter.filter_unique([lead_1, lead_2])
        self.assertEqual(len(unique), 1)
        self.assertEqual(unique[0].lead_id, lead_1.lead_id)

    def test_pipeline_integration_with_storage_abstraction(self) -> None:
        """Verify fixture Facebook posts pass through ingestion and Google Sheets storage row serialization."""
        result = self.collector.ingest_into_storage(self.mock_storage, deduplicate=True)

        self.assertGreater(result.total_records, 0)
        self.assertGreater(result.inserted_count, 0)
        self.mock_storage.save_batch.assert_called_once()

        saved_leads = self.mock_storage.save_batch.call_args[0][0]
        for lead in saved_leads:
            self.assertEqual(lead.source, LeadSource.FACEBOOK)
            # Verify serialization matching RAW_LEAD_HEADERS contract
            row = raw_lead_to_row(lead)
            self.assertEqual(len(row), len(RAW_LEAD_HEADERS))
            self.assertEqual(row[0], lead.lead_id)
            self.assertEqual(row[1], "facebook")
            self.assertEqual(row[3], lead.raw_text)

    def test_extractor_compatibility(self) -> None:
        """Verify Facebook RawLead instances can be parsed by RuleBasedExtractor into ExtractedLead."""
        posts = self.collector.collect()
        rent_post = next(p for p in posts if p.post_id == "fb-post-103")
        lead = rent_post.to_raw_lead()

        extractor = RuleBasedExtractor()
        extracted = extractor.extract(lead)

        self.assertEqual(extracted.lead_id, lead.lead_id)
        self.assertEqual(extracted.transaction_type, TransactionType.RENT)
        self.assertEqual(extracted.property_type, PropertyType.APARTMENT)
        self.assertEqual(extracted.bedrooms, 3)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.max_price, 35000.0)

        # Flatmate post check
        flatmate_post = next(p for p in posts if p.post_id == "fb-post-104")
        flatmate_lead = flatmate_post.to_raw_lead()
        extracted_flatmate = extractor.extract(flatmate_lead)
        self.assertEqual(extracted_flatmate.lead_type, LeadType.FLATMATE)

    def test_facebook_config_separated_from_google_credentials(self) -> None:
        """Verify FacebookCollectorConfig is completely decoupled from Google Sheets settings."""
        cfg = get_facebook_config()
        self.assertIsInstance(cfg, FacebookCollectorConfig)
        self.assertFalse(hasattr(cfg, "google_sheets_spreadsheet_id"))
        self.assertFalse(hasattr(cfg, "google_service_account_file"))
        self.assertFalse(hasattr(cfg, "google_service_account_info"))

    def test_offline_zero_network_guarantee(self) -> None:
        """Verify FixtureFacebookCollector executes without network requests or socket calls."""
        with patch("urllib.request.urlopen", side_effect=AssertionError("Network call attempted!")):
            collector = FixtureFacebookCollector()
            posts = collector.collect()
            self.assertGreater(len(posts), 0)


if __name__ == "__main__":
    unittest.main()
