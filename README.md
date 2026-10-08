# Real Estate Brokerage Lead Management CRM

An incremental lead aggregation and Customer Relationship Management (CRM) system designed for small real estate brokerages.

---

## 1. Project Purpose

The system provides an automated pipeline to:
- Aggregate permitted real estate and customer lead posts from multiple sources.
- Preserve original raw content for auditability and compliance.
- Extract structured property criteria and customer information.
- Normalize and deduplicate incoming lead records.
- Persist leads into a central database and/or Google Sheets.
- Match potential buyers/renters with relevant property listings.
- Track lead lifecycle status across the brokerage.
- Send targeted notifications and actionable alerts to agents.

---

## 2. Current Scope (Stage 1: Foundation)

This repository is currently at **Stage 1 (Foundation)**. The focus of this stage is establishing a clean, robust, and extensible Python project architecture with zero unnecessary complexity.

### What is Included in Stage 1:
- Clean module structure separating application logic, configuration, and automated tests.
- Environment variable configuration handling via Python standard library with `.env` loading support.
- Minimal application bootstrap and logging entry point (`app/main.py`).
- Automated test suite setup compatible with standard `unittest` and `pytest`.
- Development scaffolding (`.gitignore`, `.env.example`, `requirements.txt`).

### Intentionally Excluded Functionality in Stage 1:
To maintain strict incremental delivery, the following features are **intentionally omitted** at this stage and will be built in subsequent phases:
- Source connectors and scrapers (Reddit, Facebook, Telegram, etc.).
- AI / LLM extraction pipelines.
- Data normalization and deduplication engines.
- Database ORMs and Google Sheets API integrations.
- Customer-property matching algorithms.
- Notification dispatchers (email, SMS, webhooks).
- Web dashboards and UI interfaces.

---

## 3. Development Stages Roadmap

| Stage | Title | Description | Status |
|---|---|---|---|
| **Stage 1** | **Foundation** | Core repository structure, configuration management, entry point, test suite scaffolding. | **Current** |
| **Stage 2** | **Raw Ingestion & Storage** | Ingestion interfaces for permitted sources, raw payload persistence, source adapters. | *Planned* |
| **Stage 3** | **Extraction & Normalization** | Structured data extraction (properties, customer budgets, locations) and validation. | *Planned* |
| **Stage 4** | **Deduplication & CRM Persistence** | Duplicate detection, lead entity resolution, database and Google Sheets storage. | *Planned* |
| **Stage 5** | **Matching Engine & Status Tracking**| Buyer-property matching algorithms, lead lifecycle status workflows. | *Planned* |
| **Stage 6** | **Notifications & Alerts** | Agent dispatching, instant notifications, and outbound messaging. | *Planned* |

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
