"""Unit tests for bulk lead ingestion parsing and execution."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from app.bulk_ingest import run_bulk_ingest
from app.services.bulk_ingest import (
    ingest_bulk_leads,
    parse_records_from_csv,
    parse_records_from_json,
)
from app.storage.base import RawLeadStorage


class TestBulkIngest(unittest.TestCase):
    """Test suite for bulk file parsing and batch persistence."""

    def setUp(self) -> None:
        self.mock_storage = MagicMock(spec=RawLeadStorage)
        self.mock_storage.get_existing_fingerprints.return_value = set()
        self.mock_storage.save_batch.side_effect = lambda leads: len(leads)

    def test_parse_records_from_csv(self) -> None:
        """Verify CSV parsing extracts records properly."""
        csv_content = (
            "raw_text,source,source_url,author,notes\n"
            "Looking for 2BHK,reddit,https://reddit.com/r/1,user1,note1\n"
            "Need commercial office,telegram,,user2,note2\n"
        )
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            f.write(csv_content)
            tmp_path = Path(f.name)

        try:
            records = parse_records_from_csv(tmp_path)
            self.assertEqual(len(records), 2)
            self.assertEqual(records[0]["raw_text"], "Looking for 2BHK")
            self.assertEqual(records[0]["source"], "reddit")
            self.assertEqual(records[1]["source"], "telegram")
            self.assertIsNone(records[1]["source_url"])
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_parse_records_from_json(self) -> None:
        """Verify JSON parsing extracts records properly."""
        json_data = [
            {
                "raw_text": "Villa for rent in suburbs",
                "source": "facebook",
                "author": "fb_agent",
            },
            {
                "raw_text": "Penthouse needed ASAP",
                "source": "manual",
                "notes": "VIP client",
            },
        ]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(json_data, f)
            tmp_path = Path(f.name)

        try:
            records = parse_records_from_json(tmp_path)
            self.assertEqual(len(records), 2)
            self.assertEqual(records[0]["raw_text"], "Villa for rent in suburbs")
            self.assertEqual(records[0]["source"], "facebook")
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_ingest_bulk_leads_with_deduplication(self) -> None:
        """Verify duplicate records are filtered out during bulk ingestion."""
        records = [
            {"raw_text": "Looking for 3BHK flat", "source": "reddit"},
            {"raw_text": "  looking for   3bhk flat  ", "source": "reddit"},  # Duplicate
            {"raw_text": "Land for sale", "source": "manual"},  # Unique
        ]

        result = ingest_bulk_leads(records, self.mock_storage, deduplicate=True)
        self.assertEqual(result.total_records, 3)
        self.assertEqual(result.inserted_count, 2)
        self.assertEqual(result.duplicate_count, 1)
        self.assertEqual(result.failed_count, 0)
        self.mock_storage.save_batch.assert_called_once()

    def test_run_bulk_ingest_cli_routine(self) -> None:
        """Verify run_bulk_ingest CLI routine parses file and executes batch save."""
        records = [{"raw_text": "Client inquiry for 1BHK", "source": "manual"}]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(records, f)
            tmp_path = Path(f.name)

        try:
            exit_code = run_bulk_ingest(tmp_path, storage=self.mock_storage)
            self.assertEqual(exit_code, 0)
            self.mock_storage.save_batch.assert_called_once()
        finally:
            tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
