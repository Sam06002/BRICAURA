"""Integration tests for live Google Sheets persistence.

These tests interact with real Google Sheets API when explicitly enabled.
They are SKIPPED by default during normal offline test runs.

To run explicitly:
    RUN_LIVE_INTEGRATION_TESTS=1 python -m unittest tests/test_integration_google_sheets.py
"""

import os
import unittest
from datetime import datetime, timezone
from pathlib import Path

from app.models.raw_lead import LeadSource, LeadStatus, RawLead
from app.storage.google_sheets import GoogleSheetsStorage
from config.settings import get_settings


def is_live_integration_enabled() -> bool:
    """Check whether live integration testing is explicitly enabled via environment."""
    return os.getenv("RUN_LIVE_INTEGRATION_TESTS") == "1"


@unittest.skipUnless(
    is_live_integration_enabled(),
    "Live integration tests are skipped by default. Set RUN_LIVE_INTEGRATION_TESTS=1 with network access to run.",
)
class TestLiveGoogleSheetsIntegration(unittest.TestCase):
    """Live integration test suite communicating with actual Google Sheets backend."""

    def setUp(self) -> None:
        self.settings = get_settings()
        if not self.settings.google_sheets_spreadsheet_id:
            self.skipTest("GOOGLE_SHEETS_SPREADSHEET_ID is not configured.")

        # Check credentials
        has_file = (
            self.settings.google_service_account_file
            and Path(self.settings.google_service_account_file).is_file()
        )
        has_info = bool(self.settings.google_service_account_info)

        if not (has_file or has_info):
            self.skipTest("No valid Google service account credentials found.")

        self.storage = GoogleSheetsStorage.from_settings(self.settings)

    def test_live_initialize_and_save_lead(self) -> None:
        """Verify connecting to real Google Sheets, ensuring worksheet/headers, and inserting lead."""
        self.storage.initialize()
        self.assertIsNotNone(self.storage._worksheet)

        test_lead_id = f"integration-test-{int(datetime.now(timezone.utc).timestamp())}"
        test_lead = RawLead(
            lead_id=test_lead_id,
            source=LeadSource.MANUAL,
            source_url="https://example.com/live-test",
            raw_text="Live integration test payload: special symbols $&% and emoji 🚀",
            author="Integration Tester",
            collected_at=datetime.now(timezone.utc),
            status=LeadStatus.NEW,
            notes="Automated integration test run",
        )

        self.storage.save(test_lead)

        # Verify that the row was added to the worksheet
        all_values = self.storage._worksheet.get_all_values()
        matching_rows = [row for row in all_values if len(row) > 0 and row[0] == test_lead_id]
        self.assertEqual(len(matching_rows), 1)

        saved_row = matching_rows[0]
        self.assertEqual(saved_row[0], test_lead_id)
        self.assertEqual(saved_row[1], "manual")
        self.assertEqual(saved_row[2], "https://example.com/live-test")
        self.assertEqual(saved_row[3], "Live integration test payload: special symbols $&% and emoji 🚀")
        self.assertEqual(saved_row[4], "Integration Tester")
        self.assertEqual(saved_row[6], "new")
        self.assertEqual(saved_row[7], "Automated integration test run")


if __name__ == "__main__":
    unittest.main()
