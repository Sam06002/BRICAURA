"""Main entry point for the Real Estate Lead Management CRM foundation."""

import logging
import sys
from typing import NoReturn

from config.settings import Settings, get_settings


def configure_logging(log_level: str) -> None:
    """Configure structured console logging based on settings."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


def initialize_app(settings: Settings) -> None:
    """Initialize application context and log startup details."""
    logger = logging.getLogger("app")
    logger.info("Initializing %s (Env: %s)", settings.app_name, settings.app_env)
    logger.info("Foundation stage active: ready for incremental module additions.")


def main() -> int:
    """Application main execution routine."""
    settings = get_settings()
    configure_logging(settings.log_level)
    initialize_app(settings)
    return 0


if __name__ == "__main__":
    sys.exit(main())
