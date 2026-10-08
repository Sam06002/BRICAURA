"""Unit tests for configuration parsing and settings management."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from config.settings import (
    Settings,
    get_settings,
    load_dotenv,
    parse_env_bool,
    parse_env_int,
)


class TestConfig(unittest.TestCase):
    """Test configuration loading and helper functions."""

    def test_default_settings(self) -> None:
        """Verify default settings values when no environment variables are set."""
        with patch.dict(os.environ, {}, clear=True):
            settings = get_settings(dotenv_path=None)
            self.assertEqual(settings.app_env, "development")
            self.assertEqual(settings.app_name, "Real Estate Lead Management CRM")
            self.assertEqual(settings.log_level, "INFO")
            self.assertEqual(settings.app_host, "127.0.0.1")
            self.assertEqual(settings.app_port, 8000)
            self.assertIsNone(settings.google_sheets_spreadsheet_id)
            self.assertEqual(settings.google_sheets_worksheet_name, "RawLeads")
            self.assertIsNone(settings.google_service_account_file)
            self.assertIsNone(settings.google_service_account_info)

    def test_custom_environment_variables(self) -> None:
        """Verify settings populate accurately from custom environment variables."""
        custom_env = {
            "APP_ENV": "production",
            "APP_NAME": "Custom Broker CRM",
            "LOG_LEVEL": "debug",
            "APP_HOST": "0.0.0.0",
            "APP_PORT": "9090",
            "GOOGLE_SHEETS_SPREADSHEET_ID": "sheet-xyz-99",
            "GOOGLE_SHEETS_WORKSHEET_NAME": "IngestedRaw",
            "GOOGLE_SERVICE_ACCOUNT_FILE": "/secrets/google.json",
        }
        with patch.dict(os.environ, custom_env, clear=True):
            settings = get_settings(dotenv_path=None)
            self.assertEqual(settings.app_env, "production")
            self.assertEqual(settings.app_name, "Custom Broker CRM")
            self.assertEqual(settings.log_level, "DEBUG")
            self.assertEqual(settings.app_host, "0.0.0.0")
            self.assertEqual(settings.app_port, 9090)
            self.assertEqual(settings.google_sheets_spreadsheet_id, "sheet-xyz-99")
            self.assertEqual(settings.google_sheets_worksheet_name, "IngestedRaw")
            self.assertEqual(settings.google_service_account_file, "/secrets/google.json")

    def test_parse_env_bool(self) -> None:
        """Verify boolean parsing logic."""
        self.assertTrue(parse_env_bool("true"))
        self.assertTrue(parse_env_bool("1"))
        self.assertTrue(parse_env_bool("YES"))
        self.assertTrue(parse_env_bool("on"))
        self.assertFalse(parse_env_bool("false"))
        self.assertFalse(parse_env_bool("0"))
        self.assertFalse(parse_env_bool("no"))
        self.assertFalse(parse_env_bool(None, default=False))
        self.assertTrue(parse_env_bool(None, default=True))

    def test_parse_env_int(self) -> None:
        """Verify integer parsing and fallback on invalid input."""
        self.assertEqual(parse_env_int("1234", 8000), 1234)
        self.assertEqual(parse_env_int("invalid", 8000), 8000)
        self.assertEqual(parse_env_int(None, 8000), 8000)

    def test_load_dotenv(self) -> None:
        """Verify loading environment key-values from a .env file."""
        with tempfile.NamedTemporaryFile("w", delete=False) as tmp:
            tmp.write("# Comment line\n")
            tmp.write("APP_ENV=staging\n")
            tmp.write("APP_PORT=8080\n")
            tmp.write("IGNORED_EMPTY=\n")
            tmp_path = Path(tmp.name)

        try:
            with patch.dict(os.environ, {}, clear=True):
                load_dotenv(tmp_path)
                self.assertEqual(os.environ.get("APP_ENV"), "staging")
                self.assertEqual(os.environ.get("APP_PORT"), "8080")
        finally:
            tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
