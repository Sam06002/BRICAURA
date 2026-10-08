"""Application configuration management using environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    """Application runtime settings."""

    app_env: str = "development"
    app_name: str = "Real Estate Lead Management CRM"
    log_level: str = "INFO"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    google_sheets_spreadsheet_id: str | None = None
    google_sheets_worksheet_name: str = "RawLeads"
    google_service_account_file: str | None = None
    google_service_account_info: str | None = None


def parse_env_bool(value: str | None, default: bool = False) -> bool:
    """Parse a string value into a boolean."""
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_env_int(value: str | None, default: int) -> int:
    """Parse a string value into an integer, falling back to default on error."""
    if value is None:
        return default
    try:
        return int(value.strip())
    except ValueError:
        return default


def load_dotenv(dotenv_path: Path | str = ".env") -> None:
    """Load simple key=value pairs from a .env file if it exists without overriding existing env vars."""
    path = Path(dotenv_path)
    if not path.is_file():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = val


def get_settings(dotenv_path: Path | str | None = ".env") -> Settings:
    """Build and return immutable application Settings from environment variables."""
    if dotenv_path is not None:
        load_dotenv(dotenv_path)
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        app_name=os.getenv("APP_NAME", "Real Estate Lead Management CRM"),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        app_host=os.getenv("APP_HOST", "127.0.0.1"),
        app_port=parse_env_int(os.getenv("APP_PORT"), 8000),
        google_sheets_spreadsheet_id=os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID"),
        google_sheets_worksheet_name=os.getenv("GOOGLE_SHEETS_WORKSHEET_NAME", "RawLeads"),
        google_service_account_file=os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        google_service_account_info=os.getenv("GOOGLE_SERVICE_ACCOUNT_INFO"),
    )
