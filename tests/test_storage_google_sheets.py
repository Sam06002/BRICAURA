"""Unit tests for the Google Sheets persistence layer and RawLead storage interface."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.models.raw_lead import LeadSource, LeadStatus, RawLead
from app.storage.base import RAW_LEAD_HEADERS, raw_lead_to_row
from app.storage.exceptions import (
    StorageAuthenticationError,
    StorageConfigError,
    StorageInitializationError,
    StorageWriteError,
)
from app.storage.google_sheets import GoogleSheetsStorage
from config.settings import Settings


class TestStorageBase(unittest.TestCase):
    """Test storage schema definitions and row serialization."""

    def setUp(self) -> None:
        self.sample_datetime = datetime(2026, 10, 8, 12, 30, 45, tzinfo=timezone.utc)
        self.sample_lead = RawLead(
            lead_id="lead-abc-001",
            source=LeadSource.REDDIT,
            source_url="https://reddit.com/r/realestate/comments/123",
            raw_text="  [RAW] Looking for 3BHK house in Austin!   \n$350k budget  ",
            author="home_seeker_99",
            collected_at=self.sample_datetime,
            status=LeadStatus.NEW,
            notes="High priority buyer",
        )

    def test_correct_column_ordering(self) -> None:
        """Verify worksheet headers match the required column schema in exact order."""
        expected_schema = (
            "lead_id",
            "source",
            "source_url",
            "raw_text",
            "author",
            "collected_at",
            "status",
            "notes",
        )
        self.assertEqual(RAW_LEAD_HEADERS, expected_schema)

    def test_correct_raw_lead_to_row_conversion(self) -> None:
        """Verify RawLead is converted to a row list matching the header sequence."""
        row = raw_lead_to_row(self.sample_lead)

        self.assertEqual(len(row), len(RAW_LEAD_HEADERS))
        self.assertEqual(row[0], "lead-abc-001")
        self.assertEqual(row[1], "reddit")
        self.assertEqual(row[2], "https://reddit.com/r/realestate/comments/123")
        # Strictly ensure raw_text is unmodified
        self.assertEqual(row[3], "  [RAW] Looking for 3BHK house in Austin!   \n$350k budget  ")
        self.assertEqual(row[4], "home_seeker_99")
        self.assertEqual(row[5], self.sample_datetime.isoformat())
        self.assertEqual(row[6], "new")
        self.assertEqual(row[7], "High priority buyer")

    def test_raw_lead_to_row_with_none_optionals(self) -> None:
        """Verify row conversion when optional fields are None or default empty."""
        minimal_lead = RawLead(
            lead_id="lead-manual-002",
            source=LeadSource.MANUAL,
            raw_text="Walk-in client inquiry",
            collected_at=self.sample_datetime,
        )
        row = raw_lead_to_row(minimal_lead)

        self.assertEqual(row[0], "lead-manual-002")
        self.assertEqual(row[1], "manual")
        self.assertEqual(row[2], "")  # source_url was None
        self.assertEqual(row[3], "Walk-in client inquiry")
        self.assertEqual(row[4], "")  # author was None
        self.assertEqual(row[5], self.sample_datetime.isoformat())
        self.assertEqual(row[6], "new")
        self.assertEqual(row[7], "")  # notes default empty


class TestGoogleSheetsStorage(unittest.TestCase):
    """Test GoogleSheetsStorage initialization, error handling, and row insertions."""

    def setUp(self) -> None:
        self.spreadsheet_id = "test-spreadsheet-id-12345"
        self.worksheet_name = "RawLeads"
        self.sample_lead = RawLead(
            lead_id="lead-test-01",
            source=LeadSource.TELEGRAM,
            raw_text="Villa for rent in suburbs",
            collected_at=datetime.now(timezone.utc),
        )

        # Mock dependencies
        self.mock_client = MagicMock()
        self.mock_spreadsheet = MagicMock()
        self.mock_worksheet = MagicMock()

        self.mock_client.open_by_key.return_value = self.mock_spreadsheet
        self.mock_spreadsheet.worksheet.return_value = self.mock_worksheet
        self.mock_worksheet.row_values.return_value = list(RAW_LEAD_HEADERS)

    def test_successful_insertion(self) -> None:
        """Verify successful lead insertion into Google Sheet."""
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            worksheet_name=self.worksheet_name,
            client=self.mock_client,
        )

        storage.save(self.sample_lead)

        self.mock_client.open_by_key.assert_called_once_with(self.spreadsheet_id)
        self.mock_spreadsheet.worksheet.assert_called_once_with(self.worksheet_name)
        self.mock_worksheet.append_row.assert_called_once_with(raw_lead_to_row(self.sample_lead))

    def test_missing_configuration(self) -> None:
        """Verify that missing or empty configuration parameters raise StorageConfigError."""
        # Empty spreadsheet ID
        with self.assertRaises(StorageConfigError):
            GoogleSheetsStorage(spreadsheet_id="", client=self.mock_client)

        # None spreadsheet ID
        with self.assertRaises(StorageConfigError):
            GoogleSheetsStorage(spreadsheet_id=None, client=self.mock_client)  # type: ignore[arg-type]

        # Empty worksheet name
        with self.assertRaises(StorageConfigError):
            GoogleSheetsStorage(
                spreadsheet_id=self.spreadsheet_id,
                worksheet_name="   ",
                client=self.mock_client,
            )

        # Settings factory missing spreadsheet ID
        settings = Settings(google_sheets_spreadsheet_id=None)
        with self.assertRaises(StorageConfigError):
            GoogleSheetsStorage.from_settings(settings)

    def test_authentication_credential_file_not_found(self) -> None:
        """Verify missing credential file raises StorageAuthenticationError."""
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            service_account_file="/path/to/non_existent_credentials.json",
        )
        with self.assertRaises(StorageAuthenticationError) as ctx:
            storage.initialize()
        self.assertIn("not found", str(ctx.exception))

    @patch("app.storage.google_sheets.gspread")
    def test_authentication_service_account_info_dict(self, mock_gspread) -> None:
        """Verify valid service account JSON dict connects via service_account_from_dict."""
        mock_gspread.service_account_from_dict.return_value = self.mock_client
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            service_account_info={"type": "service_account", "client_email": "test@google.com"},
        )
        storage.initialize()
        mock_gspread.service_account_from_dict.assert_called_once_with(
            {"type": "service_account", "client_email": "test@google.com"}
        )

    @patch("app.storage.google_sheets.gspread")
    def test_authentication_service_account_dict_failure(self, mock_gspread) -> None:
        """Verify invalid service account JSON raises StorageAuthenticationError."""
        mock_gspread.service_account_from_dict.side_effect = Exception("Invalid key")
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            service_account_info="invalid-json-string{",
        )
        with self.assertRaises(StorageAuthenticationError):
            storage.initialize()

    def test_client_open_spreadsheet_failure(self) -> None:
        """Verify failure when opening spreadsheet raises StorageInitializationError."""
        self.mock_client.open_by_key.side_effect = Exception("Permission denied or not found")
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            client=self.mock_client,
        )

        with self.assertRaises(StorageInitializationError):
            storage.initialize()

    def test_worksheet_initialization_when_sheet_and_headers_exist(self) -> None:
        """Verify headers are not appended if they already exist in the worksheet."""
        self.mock_worksheet.row_values.return_value = list(RAW_LEAD_HEADERS)
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            worksheet_name=self.worksheet_name,
            client=self.mock_client,
        )

        storage.initialize()

        self.mock_spreadsheet.worksheet.assert_called_once_with(self.worksheet_name)
        self.mock_worksheet.append_row.assert_not_called()

    def test_worksheet_initialization_when_headers_missing(self) -> None:
        """Verify headers are appended if the existing worksheet is empty."""
        self.mock_worksheet.row_values.return_value = []
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            worksheet_name=self.worksheet_name,
            client=self.mock_client,
        )

        storage.initialize()

        self.mock_worksheet.append_row.assert_called_once_with(list(RAW_LEAD_HEADERS))

    def test_worksheet_creation_when_not_found(self) -> None:
        """Verify new worksheet is created if it does not already exist."""
        # Simulate WorksheetNotFound or generic lookup failure
        self.mock_spreadsheet.worksheet.side_effect = Exception("Worksheet not found")
        new_worksheet = MagicMock()
        new_worksheet.row_values.return_value = []
        self.mock_spreadsheet.add_worksheet.return_value = new_worksheet

        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            worksheet_name="NewWorksheet",
            client=self.mock_client,
        )

        storage.initialize()

        self.mock_spreadsheet.add_worksheet.assert_called_once_with(
            title="NewWorksheet",
            rows=1000,
            cols=len(RAW_LEAD_HEADERS),
        )
        new_worksheet.append_row.assert_called_once_with(list(RAW_LEAD_HEADERS))

    def test_save_write_error(self) -> None:
        """Verify write failures during append_row raise StorageWriteError."""
        self.mock_worksheet.append_row.side_effect = Exception("Google API Quota Exceeded")
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            client=self.mock_client,
        )

        with self.assertRaises(StorageWriteError):
            storage.save(self.sample_lead)

    def test_save_invalid_lead_type(self) -> None:
        """Verify passing non-RawLead instance raises ValueError."""
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            client=self.mock_client,
        )
        with self.assertRaises(ValueError):
            storage.save({"lead_id": "123"})  # type: ignore[arg-type]

    def test_save_batch_success(self) -> None:
        """Verify saving multiple leads in batch."""
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            client=self.mock_client,
        )
        leads = [self.sample_lead, self.sample_lead]
        count = storage.save_batch(leads)
        self.assertEqual(count, 2)
        self.mock_worksheet.append_rows.assert_called_once()

    def test_get_existing_fingerprints(self) -> None:
        """Verify extracting fingerprints from existing worksheet rows."""
        self.mock_worksheet.get_all_values.return_value = [
            list(RAW_LEAD_HEADERS),
            ["lead-1", "reddit", "", "Looking for 2BHK", "", "2026-10-08", "new", ""],
        ]
        storage = GoogleSheetsStorage(
            spreadsheet_id=self.spreadsheet_id,
            client=self.mock_client,
        )
        fingerprints = storage.get_existing_fingerprints()
        self.assertEqual(len(fingerprints), 1)

    def test_from_settings_construction(self) -> None:
        """Verify GoogleSheetsStorage constructs correctly from Settings."""
        settings = Settings(
            google_sheets_spreadsheet_id="settings-sheet-id",
            google_sheets_worksheet_name="CustomLeads",
            google_service_account_file="/tmp/sa.json",
        )
        storage = GoogleSheetsStorage.from_settings(settings, client=self.mock_client)
        self.assertEqual(storage.spreadsheet_id, "settings-sheet-id")
        self.assertEqual(storage.worksheet_name, "CustomLeads")


if __name__ == "__main__":
    unittest.main()
