"""Local web interface for collecting, reviewing, and exporting property leads."""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
import types
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.extraction.rules import RuleBasedExtractor
from app.models.extracted_lead import Budget, Location
from app.models.raw_lead import LeadSource
from app.services.deduplication import compute_lead_fingerprint
from app.services.ingestion import create_raw_lead
from app.services.social_sources import (
    check_connection,
    collect_from_source,
    is_relevant_post,
    source_readiness,
)
from app.storage.google_sheets import GoogleSheetsStorage
from config.settings import get_settings

logger = logging.getLogger(__name__)
APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "web_static"
DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "bricaura.sqlite3"
DB_PATH = Path(os.getenv("BRICAURA_DATABASE_PATH", str(DEFAULT_DB)))
DB_LOCK = threading.Lock()
EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix="bricaura-collect")
COLLECTORS = {"reddit", "facebook", "telegram"}
EDITABLE_FIELDS = {
    "lead_type", "transaction_type", "flatmate_intent", "property_type", "bedrooms", "bathrooms",
    "budget_min", "budget_max", "currency", "budget_period", "city", "neighborhood", "state",
    "contact_phone", "contact_email", "author", "notes", "source_url",
}

app = FastAPI(title="BRICAURA Lead Review", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CollectRequest(BaseModel):
    sources: list[str] = Field(min_length=1)
    cities: list[str] = Field(min_length=1)


class LeadUpdate(BaseModel):
    fields: dict[str, Any]


class ExportRequest(BaseModel):
    lead_ids: list[str] = Field(min_length=1)


class ConnectionCheckRequest(BaseModel):
    source: str


class _ClosingConnection(sqlite3.Connection):
    def __exit__(  # pyright: ignore[reportIncompatibleMethodOverride]
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: types.TracebackType | None,
    ) -> bool:
        try:
            return bool(super().__exit__(exc_type, exc_value, traceback))
        finally:
            self.close()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20, factory=_ClosingConnection)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    with DB_LOCK, _connect() as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""CREATE TABLE IF NOT EXISTS collection_runs (
            run_id TEXT PRIMARY KEY, status TEXT NOT NULL, sources TEXT NOT NULL,
            cities TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
            found_count INTEGER NOT NULL DEFAULT 0, errors TEXT NOT NULL DEFAULT '[]'
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS review_leads (
            lead_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE,
            data TEXT NOT NULL, reviewed INTEGER NOT NULL DEFAULT 0,
            exported INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
            FOREIGN KEY(run_id) REFERENCES collection_runs(run_id)
        )""")


@app.on_event("startup")
def startup() -> None:
    _init_db()


def _serialize_extracted(raw: Any, city: str, post: dict[str, Any]) -> dict[str, Any]:
    extracted = RuleBasedExtractor().extract(raw)
    text = raw.raw_text.lower()
    chosen_city = "Ahmedabad" if any(token in text for token in ("ahmedabad", "amdavad")) else (
        "Gandhinagar" if any(token in text for token in ("gandhinagar", "gift city")) else city
    )
    location = extracted.location or Location(city=chosen_city, state="Gujarat")
    if not location.city:
        location = Location(neighborhood=location.neighborhood, city=chosen_city, state="Gujarat")
    budget = extracted.budget or Budget(currency="INR", period="month" if "rent" in text else "total")
    return {
        "lead_id": raw.lead_id,
        "source": raw.source.value,
        "source_url": raw.source_url or "",
        "raw_text": raw.raw_text,
        "author": raw.author or "",
        "notes": raw.notes,
        "collected_at": raw.collected_at.isoformat(),
        "posted_at": post.get("posted_at"),
        "lead_type": extracted.lead_type.value,
        "transaction_type": extracted.transaction_type.value,
        "flatmate_intent": extracted.flatmate_intent.value if extracted.flatmate_intent else "",
        "property_type": extracted.property_type.value,
        "bedrooms": extracted.bedrooms,
        "bathrooms": extracted.bathrooms,
        "budget_min": budget.min_price,
        "budget_max": budget.max_price,
        "currency": "USD" if "$" in text else "INR",
        "budget_period": budget.period,
        "city": location.city or chosen_city,
        "neighborhood": location.neighborhood or "",
        "state": location.state or "Gujarat",
        "contact_phone": extracted.contact_phone or "",
        "contact_email": extracted.contact_email or "",
        "confidence_score": extracted.confidence_score,
        "reviewed": False,
        "exported": False,
    }


def _run_collection(run_id: str, sources: list[str], cities: list[str]) -> None:
    errors: list[dict[str, str]] = []
    found = 0
    with DB_LOCK, _connect() as conn:
        conn.execute("UPDATE collection_runs SET status='running' WHERE run_id=?", (run_id,))
    for source in sources:
        for city in cities:
            try:
                posts = collect_from_source(source, city)
                for post in posts:
                    try:
                        if not is_relevant_post(post.get("raw_text", ""), city):
                            continue
                        raw = create_raw_lead(
                            raw_text=post.get("raw_text", ""), source=LeadSource(source),
                            source_url=post.get("source_url"), author=post.get("author"),
                        )
                        data = _serialize_extracted(raw, city, post)
                        fingerprint = compute_lead_fingerprint(source, raw.source_url, raw.raw_text)
                        with DB_LOCK, _connect() as conn:
                            result = conn.execute(
                                "INSERT OR IGNORE INTO review_leads "
                                "(lead_id,run_id,fingerprint,data,created_at) VALUES (?,?,?,?,?)",
                                (raw.lead_id, run_id, fingerprint, json.dumps(data), datetime.now(timezone.utc).isoformat()),
                            )
                            found += result.rowcount
                    except Exception as exc:  # noqa: BLE001
                        errors.append({"source": source, "city": city, "message": f"Could not process a post: {exc}"})
            except Exception as exc:  # noqa: BLE001
                errors.append({"source": source, "city": city, "message": str(exc)})
    final_status = "completed_with_errors" if errors else "completed"
    with DB_LOCK, _connect() as conn:
        conn.execute(
            "UPDATE collection_runs SET status=?, finished_at=?, found_count=?, errors=? WHERE run_id=?",
            (final_status, datetime.now(timezone.utc).isoformat(), found, json.dumps(errors), run_id),
        )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/status")
def status() -> dict[str, Any]:
    _init_db()
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM review_leads").fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM review_leads WHERE exported=0").fetchone()[0]
        needs_review = conn.execute(
            "SELECT COUNT(*) FROM review_leads WHERE exported=0 AND reviewed=0"
        ).fetchone()[0]
    return {
        "sources": source_readiness(),
        "lead_count": total,
        "pending_count": pending,
        "needs_review_count": needs_review,
    }


@app.post("/api/collect", status_code=202)
def collect(request: CollectRequest) -> dict[str, str]:
    sources = list(dict.fromkeys(request.sources))
    cities = list(dict.fromkeys(request.cities))
    if set(sources) - COLLECTORS:
        raise HTTPException(status_code=422, detail="Choose Reddit, Facebook, or Telegram.")
    if set(cities) - {"Ahmedabad", "Gandhinagar"}:
        raise HTTPException(status_code=422, detail="Choose Ahmedabad or Gandhinagar.")
    _init_db()
    run_id = str(uuid.uuid4())
    with DB_LOCK, _connect() as conn:
        conn.execute(
            "INSERT INTO collection_runs(run_id,status,sources,cities,started_at) VALUES (?,?,?,?,?)",
            (run_id, "queued", json.dumps(sources), json.dumps(cities), datetime.now(timezone.utc).isoformat()),
        )
    EXECUTOR.submit(_run_collection, run_id, sources, cities)
    return {"run_id": run_id, "status": "queued"}


@app.post("/api/connections/check")
def check_source_connection(request: ConnectionCheckRequest) -> dict[str, Any]:
    if request.source not in COLLECTORS:
        raise HTTPException(status_code=422, detail="Choose Reddit, Facebook, or Telegram.")
    try:
        message = check_connection(request.source)
        return {"source": request.source, "connected": True, "message": message}
    except Exception as exc:  # noqa: BLE001
        return {"source": request.source, "connected": False, "message": str(exc)}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    _init_db()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM collection_runs WHERE run_id=?", (run_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Collection run not found.")
    return {**dict(row), "sources": json.loads(row["sources"]), "cities": json.loads(row["cities"]), "errors": json.loads(row["errors"])}


@app.get("/api/leads")
def list_leads() -> dict[str, Any]:
    _init_db()
    with _connect() as conn:
        rows = conn.execute("SELECT data FROM review_leads ORDER BY created_at DESC").fetchall()
    return {"leads": [json.loads(row["data"]) for row in rows]}


@app.patch("/api/leads/{lead_id}")
def update_lead(lead_id: str, update: LeadUpdate) -> dict[str, Any]:
    unknown = set(update.fields) - EDITABLE_FIELDS
    if unknown:
        raise HTTPException(status_code=422, detail=f"Fields cannot be edited: {', '.join(sorted(unknown))}")
    _init_db()
    with DB_LOCK, _connect() as conn:
        row = conn.execute("SELECT data FROM review_leads WHERE lead_id=?", (lead_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Lead not found.")
        data = json.loads(row["data"])
        data.update(update.fields)
        data["reviewed"] = True
        conn.execute("UPDATE review_leads SET data=?, reviewed=1 WHERE lead_id=?", (json.dumps(data), lead_id))
    return data


@app.post("/api/export")
def export_leads(request: ExportRequest) -> dict[str, Any]:
    _init_db()
    placeholders = ",".join("?" for _ in request.lead_ids)
    with _connect() as conn:
        rows = conn.execute(
            f"SELECT lead_id,data FROM review_leads WHERE lead_id IN ({placeholders}) AND exported=0",
            request.lead_ids,
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=400, detail="No selected, unexported leads were found.")
    records = [json.loads(row["data"]) for row in rows]
    try:
        settings = get_settings()
        storage = GoogleSheetsStorage.from_settings(settings)
        count = storage.save_reviewed_batch(records)
    except Exception as exc:
        logger.exception("Google Sheets export failed")
        raise HTTPException(status_code=502, detail=f"Google Sheets export failed: {exc}") from exc
    exported_ids = [row["lead_id"] for row in rows]
    with DB_LOCK, _connect() as conn:
        for lead_id in exported_ids:
            row = conn.execute("SELECT data FROM review_leads WHERE lead_id=?", (lead_id,)).fetchone()
            data = json.loads(row["data"])
            data["exported"] = True
            conn.execute("UPDATE review_leads SET exported=1,data=? WHERE lead_id=?", (json.dumps(data), lead_id))
    return {"exported_count": count}


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.web:app", host=settings.app_host, port=settings.app_port, reload=False)
