"""Unit tests for the application entry point."""

import unittest
from unittest.mock import patch

from app.main import configure_logging, initialize_app, main
from config.settings import Settings


class TestMain(unittest.TestCase):
    """Test application initialization and main execution."""

    def test_configure_logging(self) -> None:
        """Verify logging configuration executes without errors across standard levels."""
        for level in ["DEBUG", "INFO", "WARNING", "ERROR"]:
            with self.subTest(level=level):
                configure_logging(level)

    def test_initialize_app(self) -> None:
        """Verify initialize_app runs with custom settings."""
        settings = Settings(app_env="test", app_name="Test App")
        with self.assertLogs("app", level="INFO") as log_context:
            initialize_app(settings)
            self.assertTrue(
                any("Initializing Test App (Env: test)" in message for message in log_context.output)
            )

    @patch("app.main.initialize_app")
    @patch("app.main.configure_logging")
    def test_main_success(self, mock_logging, mock_init) -> None:
        """Verify main() runs successfully and returns exit code 0."""
        exit_code = main()
        self.assertEqual(exit_code, 0)
        mock_logging.assert_called_once()
        mock_init.assert_called_once()


if __name__ == "__main__":
    unittest.main()
