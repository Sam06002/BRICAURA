# BRICAURA - Real Estate Brokerage Lead Management System

An incremental lead aggregation and management system for real estate brokerages.

---

## 1. Project Purpose

BRICAURA has a single core purpose: **Collect and maintain real-estate leads from permitted sources.**

The system captures and manages three primary lead categories:
1. **CUSTOMER**:
   - Person looking to rent a property
   - Person looking to buy a property
2. **PROPERTY**:
   - Owner/agent posting a property for rent
   - Owner/agent posting a property for sale
3. **FLATMATE**:
   - Person looking for a flatmate
   - Person offering a room / looking for a flatmate

The system strictly preserves the original raw post content for auditability while extracting structured metadata.

> [!NOTE]
> **Explicit Scope Boundary**: BRICAURA is solely responsible for lead collection, categorization, and maintenance. Customer-property matching, recommendation ranking, and automated matching workflows are explicitly out of scope.

---

## 2. Current Scope

The system provides:
- Clean module structure separating application logic, domain models, extraction, configuration, and tests.
- Preserved raw lead model (`RawLead`) and structured extraction model (`ExtractedLead`).
- Clear separation of **Lead Type** (`customer`, `property`, `flatmate`), **Transaction Type** (`rent`, `buy/sale`), and **Flatmate Intent** (`looking_for_flatmate`, `offering_room`).
- Environment variable configuration handling via Python standard library with `.env` support.
- Abstract storage interface (`RawLeadStorage`) with Google Sheets persistence (`GoogleSheetsStorage`).
- Single manual CLI ingestion (`python -m app.ingest`) and bulk ingestion (`python -m app.bulk_ingest`).
- Content fingerprinting & deduplication (`DeduplicationFilter`).
- Local web review queue for collected leads, with editable extracted fields and reviewed-lead export to Google Sheets.
- Authorized Reddit search and Telegram group history adapters; Facebook collection stays disabled until an approved API path is available.

---

## 3. Development Roadmap

| Stage | Title | Description | Status |
|---|---|---|---|
| **Stage 1** | **Foundation** | Core repository structure, configuration management, entry point, test suite scaffolding. | **Complete** |
| **Stage 2** | **Raw Ingestion & Storage** | Google Sheets persistence interface, single and bulk lead ingestion, deduplication. | **Complete** |
| **Stage 3** | **Structured Lead Classification** | Rule-based extraction separating lead type, transaction type, flatmate intent, bedrooms, and budgets. | **Active** |
| **Stage 4** | **Source Connectors & Feed Listeners** | Authorized Reddit search and configured Telegram group history are available; Facebook group API access remains to be resolved. | **In progress** |
| **Stage 5** | **Lead Lifecycle & Maintenance** | Local review queue and Google Sheets export are available; freshness and archival workflows remain planned. | **In progress** |

---

## 4. Setup Instructions

### Prerequisites
- Python 3.12 or newer
- `pip` package manager

### Installation

1. **Clone or navigate to the repository directory:**
   ```bash
   cd /path/to/repository
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
   *(On Windows: `.venv\Scripts\activate`)*

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *For running developer tools (e.g. pytest):*
   ```bash
   pip install -r requirements-dev.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to adjust runtime parameters (such as `APP_ENV` and `LOG_LEVEL`) as desired.

---

## 5. Running the Application

Start the local lead review web app:

```bash
python3 -m app.web
```

Then open `http://127.0.0.1:8000`. The app collects authorized Reddit and Telegram posts into a local SQLite review queue. Select a source and city, review or edit the extracted fields, and export selected rows to the `ReviewedLeads` Google Sheets worksheet. The original post text remains unchanged.

### Source setup

- **Reddit:** Set `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` for an app authorized to use Reddit's API. Searches cover recent posts mentioning Ahmedabad/Amdavad or Gandhinagar/GIFT City.
- **Telegram:** Set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and a comma-separated `TELEGRAM_GROUPS` list. Run `python3 -m app.telegram_login` once to authorize the user session. The account must be able to access the configured groups; a collection checks each group's 500 most recent messages.
- **Facebook:** Meta removed the Groups API. BRICAURA includes a fixture-based Facebook collector foundation (`FixtureFacebookCollector`) for deterministic, zero-network development and CI testing. For authorized live Page feeds, set `META_ACCESS_TOKEN` and comma-separated `FACEBOOK_PAGE_IDS`. See [Facebook Collector Foundation & Live API Access](#facebook-collector-foundation--live-api-access) below.
- **Google Sheets:** Configure the spreadsheet ID and service account credentials as for the existing CLI. Share the spreadsheet with the service account. Reviewed posts are appended to the configured `GOOGLE_SHEETS_REVIEWED_WORKSHEET_NAME` tab (default `ReviewedLeads`).

The web app is intended for local use and has no login layer. Keep it bound to localhost unless authentication and deployment protections are added.

The existing startup/logging entry point remains available:

```bash
python3 -m app.main
```

---

## 6. Facebook Collector Foundation & Live API Access

BRICAURA includes a minimal, extensible Facebook lead-collection foundation integrated into the existing ingestion pipeline.

### Collector Interface & Fixture Testing
- **Abstract Interface (`FacebookCollector`)**: Defined in [app/services/facebook_collector.py](file:///home/odoo/Downloads/Projects/Brokerage/app/services/facebook_collector.py). Exposes `collect() -> list[FacebookPost]`, `collect_as_raw_leads()`, and `ingest_into_storage(storage)`.
- **Normalized Output (`FacebookPost`)**: Contains post text, canonical source URL, collection timestamp, and author display name (strictly populated only when legitimately available; `None` for anonymous member posts).
- **Fixture Collector (`FixtureFacebookCollector`)**: Reads local sample property listings from [data/fixtures/facebook_property_posts.json](file:///home/odoo/Downloads/Projects/Brokerage/data/fixtures/facebook_property_posts.json) without making any network requests or requiring Facebook API credentials.
- **Pipeline Integration**: Fixture posts convert directly to validated `RawLead` instances with `LeadSource.FACEBOOK`, pass through `DeduplicationFilter` (SHA-256 fingerprinting), extract structured metadata via `RuleBasedExtractor`, and serialize cleanly to Google Sheets rows via `RawLeadStorage`.

### Distinction Between Fixture Testing and Live API Access

| Dimension | Fixture Testing (Current Foundation) | Authorized Live Collection (Future Production) |
|---|---|---|
| **Network Requests** | **None (100% offline)** | HTTPS calls to Meta Graph API |
| **Credentials Required** | **None** | `META_ACCESS_TOKEN` with verified permissions |
| **Source Target** | [data/fixtures/facebook_property_posts.json](file:///home/odoo/Downloads/Projects/Brokerage/data/fixtures/facebook_property_posts.json) | Permitted Meta Pages / Webhooks |
| **Compliance & Safety** | Zero risk of rate limits, blocks, or ToS issues | Adheres to Meta Platform Terms |

### Prerequisites for Live Facebook Collection

1. **Meta Groups API Deprecation**:
   - In Graph API v19.0 (April 2024), Meta completely deprecated and removed the Facebook Groups API (`/{group-id}/feed`). Third-party applications cannot read Facebook Group feeds via API.
   - [Meta Graph API v19.0 Changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) documents this permanent deprecation.
2. **Prohibition of Unauthorized Scraping**:
   - Automated scraping of Facebook Groups using headless browsers (Puppeteer/Playwright/Selenium), session cookies, or reverse-engineered private endpoints violates Meta's Terms of Service (§3.2.3) and risks IP and account bans. BRICAURA strictly prohibits unauthorized scraping.
3. **What Remains Necessary for Authorized Live Collection**:
   - **Meta Developer Account & App Review**: Register a Meta app and complete Business Verification.
   - **Permitted Page Feeds**: If monitoring managed real estate Pages or Partner Pages, obtain `pages_read_engagement` or `Page Public Content Access` permissions.
   - **Environment Configuration**: Set `META_ACCESS_TOKEN` and `FACEBOOK_PAGE_IDS` in `.env` (kept isolated from storage credentials via [config/facebook.py](file:///home/odoo/Downloads/Projects/Brokerage/config/facebook.py)).
   - **Lead Ads / Webhooks**: For direct customer inquiries, configure Meta Lead Ads webhooks delivering leads directly into `RawLeadStorage`.
   - **Admin Data Exports**: Alternatively, group administrators may export group activity via Meta's "Download Your Information" feature and ingest the resulting data using `python3 -m app.bulk_ingest`.

---

## 7. Manual Lead Ingestion

Ingest raw leads into the configured Google Sheet storage:

**Interactive mode:**
```bash
python3 -m app.ingest --interactive
```

**Non-interactive mode:**
```bash
python3 -m app.ingest --raw-text "Looking for 2BHK rental near downtown, budget \$1800/mo." --source manual --author "Agent Sarah" --notes "Follow up on Monday"
```

---

## 8. Bulk Lead Ingestion & Deduplication

Ingest batches of leads from `.csv` or `.json` files into Google Sheets with automatic duplicate detection:

```bash
python3 -m app.bulk_ingest path/to/leads.csv
```

To bypass deduplication:
```bash
python3 -m app.bulk_ingest path/to/leads.json --no-dedup
```

---

## 9. Structured Lead Extraction

Extract structured parameters (intent, property type, bedrooms, bathrooms, budget, contact details) from raw leads:

```python
from app.extraction.rules import RuleBasedExtractor

extractor = RuleBasedExtractor()
extracted_lead = extractor.extract(raw_lead)

print(f"Intent: {extracted_lead.intent.value}")
print(f"Property Type: {extracted_lead.property_type.value}")
print(f"Bedrooms: {extracted_lead.bedrooms}")
print(f"Budget: {extracted_lead.budget}")
```

---

## 10. Running Tests

Run the full automated test suite using Python's built-in `unittest` runner:

```bash
python3 -m unittest discover -s tests -v
```

Or via `pytest` (if installed from `requirements-dev.txt`):

```bash
pytest
```

To explicitly run live Google Sheets integration tests (requires network & credentials):
```bash
RUN_LIVE_INTEGRATION_TESTS=1 python3 -m unittest tests/test_integration_google_sheets.py -v
```

---

## 11. Project Structure

```text
.
├── .env.example          # Sample environment configuration template
├── .gitignore            # Git exclusion rules for Python artifacts & local envs
├── README.md             # Project documentation and roadmap
├── requirements.txt      # Core production dependencies
├── requirements-dev.txt  # Optional development dependencies (pytest)
├── app/                  # Application source package
│   ├── __init__.py       # Package marker and version metadata
│   ├── bulk_ingest.py    # Bulk file ingestion CLI command
│   ├── ingest.py         # Manual single lead ingestion CLI command
│   ├── main.py           # Application entry point and startup routines
│   ├── web.py             # Local web interface API and collection queue
│   ├── telegram_login.py  # Telegram user session authorization helper
│   ├── extraction/       # Structured lead parameter extraction
│   │   ├── __init__.py   # Extraction package exports
│   │   ├── base.py       # LeadExtractor interface
│   │   └── rules.py      # RuleBasedExtractor regex & heuristics engine
│   ├── models/           # Domain data models package
│   │   ├── __init__.py   # Domain model exports
│   │   ├── extracted_lead.py # ExtractedLead, LeadIntent, PropertyType, Budget
│   │   └── raw_lead.py   # RawLead entity, LeadSource and LeadStatus enums
│   ├── services/         # Business logic & lead creation services
│   │   ├── __init__.py   # Services package exports
│   │   ├── bulk_ingest.py # CSV/JSON parsing and batch persistence
│   │   ├── deduplication.py # SHA-256 fingerprinting & duplicate filtering
│   │   ├── facebook_collector.py # FacebookCollector ABC & FixtureFacebookCollector
│   │   ├── ingestion.py  # create_raw_lead and single lead ingestion
│   │   └── social_sources.py # Authorized Reddit and Telegram source connectors
│   └── storage/          # Persistence abstraction layer
│       ├── __init__.py   # Storage exports
│       ├── base.py       # RawLeadStorage interface & raw_lead_to_row serializer
│       ├── exceptions.py # Storage exception hierarchy
│       └── google_sheets.py # GoogleSheetsStorage implementation
├── config/               # Configuration management package
│   ├── __init__.py       # Config package exports
│   ├── facebook.py       # FacebookCollectorConfig (separate from Google credentials)
│   └── settings.py       # Environment variable loader and Settings dataclass
├── data/                 # Local data and fixtures
│   ├── bricaura.sqlite3  # Local review queue SQLite database
│   └── fixtures/         # Offline lead fixtures
│       └── facebook_property_posts.json # Sample Facebook property posts
└── tests/                # Test suite package
    ├── __init__.py       # Tests package marker
    ├── test_bulk_ingest.py # Unit tests for bulk ingestion & file parsing
    ├── test_config.py    # Unit tests for settings and environment parsing
    ├── test_deduplication.py # Unit tests for SHA-256 fingerprinting
    ├── test_extraction.py # Unit tests for rule-based lead extraction
    ├── test_facebook_collector.py # Unit tests for Facebook collector & pipeline integration
    ├── test_ingest.py    # Unit tests for manual ingestion CLI & service layer
    ├── test_integration_google_sheets.py # Live Google Sheets integration tests
    ├── test_main.py      # Unit tests for application entry point
    ├── test_raw_lead.py  # Unit tests for RawLead domain model validations
    └── test_storage_google_sheets.py # Unit tests for Google Sheets storage layer
```
