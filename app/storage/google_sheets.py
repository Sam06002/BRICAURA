"""Google Sheets implementation of the RawLeadStorage interface."""

import json
import logging
from pathlib import Path
from typing import Any

from app.models.raw_lead import RawLead
from app.storage.base import RAW_LEAD_HEADERS, RawLeadStorage, raw_lead_to_row
from app.storage.exceptions import (
    StorageAuthenticationError,
    StorageConfigError,
    StorageInitializationError,
    StorageWriteError,
)
from config.settings import Settings

logger = logging.getLogger(__name__)

# Safely import gspread with fallback types if gspread is not yet installed in runtime
try:
    import gspread  # type: ignore
    from gspread.exceptions import GSpreadException, WorksheetNotFound  # type: ignore
except ImportError:  # pragma: no cover
    gspread = None  # type: ignore[assignment]
    WorksheetNotFound = Exception  # type: ignore[assignment,misc]
    GSpreadException = Exception  # type: ignore[assignment,misc]


class GoogleSheetsStorage(RawLeadStorage):
    """Persists RawLead records into a configured Google Spreadsheet worksheet."""

    def __init__(
        self,
        spreadsheet_id: str,
        worksheet_name: str = "RawLeads",
        service_account_file: str | Path | None = None,
        service_account_info: dict[str, Any] | str | None = None,
        client: Any = None,
    ) -> None:
        """Initialize Google Sheets storage configuration and optional injected client."""
        if not spreadsheet_id or not str(spreadsheet_id).strip():
            raise StorageConfigError("GOOGLE_SHEETS_SPREADSHEET_ID is required and cannot be empty.")
        if not worksheet_name or not str(worksheet_name).strip():
            raise StorageConfigError("GOOGLE_SHEETS_WORKSHEET_NAME cannot be empty.")

        self.spreadsheet_id = str(spreadsheet_id).strip()
        self.worksheet_name = str(worksheet_name).strip()
        self.service_account_file = Path(service_account_file) if service_account_file else None
        self.service_account_info = service_account_info

        self._client: Any = client
        self._worksheet: Any = None

    @classmethod
    def from_settings(cls, settings: Settings, client: Any = None) -> "GoogleSheetsStorage":
        """Construct GoogleSheetsStorage using application Settings."""
        if not settings.google_sheets_spreadsheet_id:
            raise StorageConfigError(
                "GOOGLE_SHEETS_SPREADSHEET_ID is not configured in application settings."
            )
        return cls(
            spreadsheet_id=settings.google_sheets_spreadsheet_id,
            worksheet_name=settings.google_sheets_worksheet_name,
            service_account_file=settings.google_service_account_file,
            service_account_info=settings.google_service_account_info,
            client=client,
        )

    def _get_client(self) -> Any:
        """Authenticate and return the Google Sheets client."""
        if self._client is not None:
            return self._client

        if self.service_account_file and not self.service_account_file.is_file():
            raise StorageAuthenticationError(
                f"Google service account credential file not found at: {self.service_account_file}"
            )

        if gspread is None:
            raise StorageAuthenticationError(
                "gspread library is not installed. Install dependencies from requirements.txt."
            )

        try:
            if self.service_account_info:
                info_dict = (
                    json.loads(self.service_account_info)
                    if isinstance(self.service_account_info, str)
                    else self.service_account_info
                )
                self._client = gspread.service_account_from_dict(info_dict)
            elif self.service_account_file:
                self._client = gspread.service_account(filename=str(self.service_account_file))
            else:
                # Attempt default service account discovery (e.g. GOOGLE_APPLICATION_CREDENTIALS)
                self._client = gspread.service_account()
            return self._client
        except StorageAuthenticationError:
            raise
        except Exception as exc:
            raise StorageAuthenticationError(
                f"Failed to authenticate with Google Sheets API: {exc}"
            ) from exc

    def initialize(self) -> None:
        """Connect to Google Spreadsheet, open/create the worksheet, and verify headers."""
        client = self._get_client()

        try:
            spreadsheet = client.open_by_key(self.spreadsheet_id)
        except Exception as exc:
            raise StorageInitializationError(
                f"Failed to open Google Spreadsheet with ID '{self.spreadsheet_id}': {exc}"
            ) from exc

        try:
            try:
                worksheet = spreadsheet.worksheet(self.worksheet_name)
            except Exception:  # noqa: BLE001
                logger.info("Worksheet '%s' not found. Creating worksheet...", self.worksheet_name)
                worksheet = spreadsheet.add_worksheet(
                    title=self.worksheet_name,
                    rows=1000,
                    cols=len(RAW_LEAD_HEADERS),
                )

            # Check and initialize headers if table is empty
            existing_headers = worksheet.row_values(1)
            if not existing_headers:
                logger.info("Initializing headers on worksheet '%s'", self.worksheet_name)
                worksheet.append_row(list(RAW_LEAD_HEADERS))

            self._worksheet = worksheet
        except Exception as exc:
            if isinstance(exc, StorageInitializationError):
                raise
            raise StorageInitializationError(
                f"Failed to initialize worksheet '{self.worksheet_name}': {exc}"
            ) from exc

    def save(self, lead: RawLead) -> None:
        """Append a RawLead to the configured Google Sheet worksheet."""
        if not isinstance(lead, RawLead):
            raise ValueError(f"Expected RawLead instance, got {type(lead).__name__}")  # noqa: TRY004

        if self._worksheet is None:
            self.initialize()

        if self._worksheet is None:
            raise StorageInitializationError("Worksheet failed to initialize.")

        row_data = raw_lead_to_row(lead)
        try:
            self._worksheet.append_row(row_data)
            logger.debug("Successfully saved lead_id '%s' to Google Sheets.", lead.lead_id)
        except Exception as exc:
            raise StorageWriteError(
                f"Failed to append RawLead '{lead.lead_id}' to Google Sheets: {exc}"
            ) from exc

    def save_batch(self, leads: Any) -> int:
        """Append multiple RawLead instances to Google Sheets in a single batch operation."""
        if not leads:
            return 0

        for lead in leads:
            if not isinstance(lead, RawLead):
                raise ValueError(f"Expected RawLead instance, got {type(lead).__name__}")  # noqa: TRY004

        if self._worksheet is None:
            self.initialize()

        if self._worksheet is None:
            raise StorageInitializationError("Worksheet failed to initialize.")

        rows_data = [raw_lead_to_row(lead) for lead in leads]
        try:
            self._worksheet.append_rows(rows_data)
            logger.debug("Successfully saved %d leads in batch to Google Sheets.", len(rows_data))
            return len(rows_data)
        except Exception as exc:
            raise StorageWriteError(
                f"Failed to batch append {len(rows_data)} leads to Google Sheets: {exc}"
            ) from exc

    def get_existing_fingerprints(self) -> set[str]:
        """Read all existing lead rows and return computed SHA-256 fingerprints."""
        from app.services.deduplication import compute_lead_fingerprint

        if self._worksheet is None:
            self.initialize()

        if self._worksheet is None:
            raise StorageInitializationError("Worksheet failed to initialize.")

        try:
            all_values = self._worksheet.get_all_values()
            if len(all_values) <= 1:
                return set()

            fingerprints: set[str] = set()
            for row in all_values[1:]:
                if len(row) >= 4:
                    source = row[1]
                    source_url = row[2] if row[2] else None
                    raw_text = row[3]
                    if raw_text:
                        fp = compute_lead_fingerprint(source, source_url, raw_text)
                        fingerprints.add(fp)
            return fingerprints
        except Exception as exc:
            raise StorageInitializationError(
                f"Failed to retrieve existing fingerprints from Google Sheets: {exc}"
            ) from exc
