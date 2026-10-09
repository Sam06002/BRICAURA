"""Unit tests for the manual ingestion CLI and service layer."""

import io
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.ingest import main, prompt_for_lead_data, run_ingest
from app.models.raw_lead import LeadSource, LeadStatus
from app.services.ingestion import create_raw_lead, generate_lead_id, ingest_lead
from app.storage.base import RawLeadStorage
from app.storage.exceptions import StorageWriteError
from config.settings import Settings


class TestIngestionService(unittest.TestCase):
    """Test unit business logic for raw lead creation and validation."""

    def test_create_raw_lead_valid_input(self) -> None:
        """Verify create_raw_lead produces a valid RawLead with auto-generated metadata."""
        raw_text = "Looking for a 3BHK villa in Westside."
        lead = create_raw_lead(
            raw_text=raw_text,
            source=LeadSource.REDDIT,
            source_url="https://reddit.com/r/realestate/comments/999",
            author="john_doe",
            notes="Follow up tomorrow",
        )

        self.assertTrue(lead.lead_id.startswith("lead-"))
        self.assertEqual(lead.source, LeadSource.REDDIT)
        self.assertEqual(lead.source_url, "https://reddit.com/r/realestate/comments/999")
        self.assertEqual(lead.raw_text, raw_text)
        self.assertEqual(lead.author, "john_doe")
        self.assertEqual(lead.status, LeadStatus.NEW)
        self.assertEqual(lead.notes, "Follow up tomorrow")
        self.assertIsInstance(lead.collected_at, datetime)

    def test_generated_unique_id(self) -> None:
        """Verify lead ID generation creates distinct non-empty identifiers."""
        id1 = generate_lead_id()
        id2 = generate_lead_id()
        self.assertTrue(id1.startswith("lead-"))
        self.assertTrue(id2.startswith("lead-"))
        self.assertNotEqual(id1, id2)

    def test_generated_timestamp(self) -> None:
        """Verify generated timestamp is timezone-aware in UTC."""
        before = datetime.now(timezone.utc)
        lead = create_raw_lead(raw_text="Lead inquiry")
        after = datetime.now(timezone.utc)

        self.assertIsNotNone(lead.collected_at.tzinfo)
        self.assertTrue(before <= lead.collected_at <= after)

    def test_raw_text_preservation(self) -> None:
        """Verify raw text with spaces, newlines, and unicode symbols is strictly preserved."""
        exact_text = " \n  [URGENT] Looking for Penthouse 🏙️! \tBudget: $5k/mo\n\n "
        lead = create_raw_lead(raw_text=exact_text)
        self.assertEqual(lead.raw_text, exact_text)

    def test_missing_or_empty_raw_text(self) -> None:
        """Verify creating lead with empty raw text raises ValueError."""
        for empty_text in ["", "   ", "\n\t"]:
            with self.subTest(text=empty_text), self.assertRaises(ValueError):
                create_raw_lead(raw_text=empty_text)

    def test_invalid_source_raises_error(self) -> None:
        """Verify unsupported source raises ValueError."""
        with self.assertRaises(ValueError):
            create_raw_lead(raw_text="Inquiry", source="invalid_platform")

    def test_ingest_lead_delegates_to_storage(self) -> None:
        """Verify ingest_lead invokes the storage save method."""
        mock_storage = MagicMock(spec=RawLeadStorage)
        lead = create_raw_lead(raw_text="Sample lead")
        ingest_lead(lead, mock_storage)
        mock_storage.save.assert_called_once_with(lead)


class TestIngestCLI(unittest.TestCase):
    """Test CLI entry point and execution workflows."""

    def setUp(self) -> None:
        self.mock_storage = MagicMock(spec=RawLeadStorage)

    def test_run_ingest_valid_input(self) -> None:
        """Verify run_ingest successfully persists lead and returns exit code 0."""
        with patch("sys.stdout", new_callable=io.StringIO) as mock_out:
            exit_code = run_ingest(
                raw_text="Looking for rental property in Austin.",
                source="telegram",
                source_url="https://t.me/channel/123",
                author="telegram_user",
                notes="Priority client",
                storage=self.mock_storage,
            )

        self.assertEqual(exit_code, 0)
        self.mock_storage.save.assert_called_once()
        saved_lead = self.mock_storage.save.call_args[0][0]
        self.assertEqual(saved_lead.source, LeadSource.TELEGRAM)
        self.assertEqual(saved_lead.raw_text, "Looking for rental property in Austin.")
        self.assertIn("SUCCESS: Ingested lead", mock_out.getvalue())

    def test_run_ingest_missing_raw_text(self) -> None:
        """Verify run_ingest with empty raw text returns exit code 1 and outputs error."""
        with patch("sys.stderr", new_callable=io.StringIO) as mock_err:
            exit_code = run_ingest(
                raw_text="   ",
                storage=self.mock_storage,
            )

        self.assertEqual(exit_code, 1)
        self.mock_storage.save.assert_not_called()
        self.assertIn("Validation Error", mock_err.getvalue())

    def test_run_ingest_invalid_source(self) -> None:
        """Verify run_ingest with invalid source returns exit code 1."""
        with patch("sys.stderr", new_callable=io.StringIO) as mock_err:
            exit_code = run_ingest(
                raw_text="Valid text",
                source="unsupported_source",
                storage=self.mock_storage,
            )

        self.assertEqual(exit_code, 1)
        self.mock_storage.save.assert_not_called()
        self.assertIn("Validation Error", mock_err.getvalue())

    def test_run_ingest_persistence_failure(self) -> None:
        """Verify run_ingest handles storage errors cleanly."""
        self.mock_storage.save.side_effect = StorageWriteError("Google Sheets connection timeout")

        with patch("sys.stderr", new_callable=io.StringIO) as mock_err:
            exit_code = run_ingest(
                raw_text="Valid inquiry",
                storage=self.mock_storage,
            )

        self.assertEqual(exit_code, 1)
        self.assertIn("Storage Error", mock_err.getvalue())

    def test_run_ingest_missing_google_configuration(self) -> None:
        """Verify run_ingest handles unconfigured Google settings cleanly."""
        unconfigured_settings = Settings(google_sheets_spreadsheet_id=None)

        with patch("sys.stderr", new_callable=io.StringIO) as mock_err:
            exit_code = run_ingest(
                raw_text="Valid lead",
                settings=unconfigured_settings,
                storage=None,
            )

        self.assertEqual(exit_code, 1)
        self.assertIn("Storage Error", mock_err.getvalue())

    def test_cli_main_with_arguments(self) -> None:
        """Verify main() CLI routine executes with command-line flags."""
        args = [
            "--raw-text",
            "Buyer looking for commercial space.",
            "--source",
            "facebook",
            "--author",
            "fb_group_user",
            "--notes",
            "Commercial inquiry",
        ]

        with patch("app.ingest.GoogleSheetsStorage.from_settings") as mock_from_settings:
            mock_from_settings.return_value = self.mock_storage
            with patch("sys.stdout", new_callable=io.StringIO):
                exit_code = main(args)

        self.assertEqual(exit_code, 0)
        self.mock_storage.save.assert_called_once()
        saved_lead = self.mock_storage.save.call_args[0][0]
        self.assertEqual(saved_lead.source, LeadSource.FACEBOOK)
        self.assertEqual(saved_lead.author, "fb_group_user")

    def test_prompt_for_lead_data(self) -> None:
        """Verify interactive prompt correctly gathers inputs."""
        user_inputs = iter(["Property needed", "reddit", "https://reddit.com/r/1", "user1", "notes1"])
        with patch("builtins.input", lambda _: next(user_inputs)):
            data = prompt_for_lead_data()

        self.assertEqual(data["raw_text"], "Property needed")
        self.assertEqual(data["source"], "reddit")
        self.assertEqual(data["source_url"], "https://reddit.com/r/1")
        self.assertEqual(data["author"], "user1")
        self.assertEqual(data["notes"], "notes1")


if __name__ == "__main__":
    unittest.main()
