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

---

## 3. Development Roadmap

| Stage | Title | Description | Status |
|---|---|---|---|
| **Stage 1** | **Foundation** | Core repository structure, configuration management, entry point, test suite scaffolding. | **Complete** |
| **Stage 2** | **Raw Ingestion & Storage** | Google Sheets persistence interface, single and bulk lead ingestion, deduplication. | **Complete** |
| **Stage 3** | **Structured Lead Classification** | Rule-based extraction separating lead type, transaction type, flatmate intent, bedrooms, and budgets. | **Active** |
| **Stage 4** | **Source Connectors & Feed Listeners** | Automated connectors for permitted community and message feeds. | *Planned* |
| **Stage 5** | **Lead Lifecycle & Maintenance** | Tracking lead freshness, archival, and status management. | *Planned* |

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

Execute the application entry point:

```bash
python3 -m app.main
```

---

```

---

## 6. Manual Lead Ingestion

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

## 7. Bulk Lead Ingestion & Deduplication

Ingest batches of leads from `.csv` or `.json` files into Google Sheets with automatic duplicate detection:

```bash
python3 -m app.bulk_ingest path/to/leads.csv
```

To bypass deduplication:
```bash
python3 -m app.bulk_ingest path/to/leads.json --no-dedup
```

---

## 8. Structured Lead Extraction

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

## 9. Running Tests

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

## 10. Project Structure

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
│   │   └── ingestion.py  # create_raw_lead and single lead ingestion
│   └── storage/          # Persistence abstraction layer
│       ├── __init__.py   # Storage exports
│       ├── base.py       # RawLeadStorage interface & raw_lead_to_row serializer
│       ├── exceptions.py # Storage exception hierarchy
│       └── google_sheets.py # GoogleSheetsStorage implementation
├── config/               # Configuration management package
│   ├── __init__.py       # Config package exports
│   └── settings.py       # Environment variable loader and Settings dataclass
└── tests/                # Test suite package
    ├── __init__.py       # Tests package marker
    ├── test_bulk_ingest.py # Unit tests for bulk ingestion & file parsing
    ├── test_config.py    # Unit tests for settings and environment parsing
    ├── test_deduplication.py # Unit tests for SHA-256 fingerprinting
    ├── test_extraction.py # Unit tests for rule-based lead extraction
    ├── test_ingest.py    # Unit tests for manual ingestion CLI & service layer
    ├── test_integration_google_sheets.py # Live Google Sheets integration tests
    ├── test_main.py      # Unit tests for application entry point
    ├── test_raw_lead.py  # Unit tests for RawLead domain model validations
    └── test_storage_google_sheets.py # Unit tests for Google Sheets storage layer
```
