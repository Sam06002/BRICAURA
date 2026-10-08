"""Deterministic rule-based extractor using regex and real estate domain heuristics."""

import re
from datetime import datetime, timezone

from app.extraction.base import LeadExtractor
from app.models.extracted_lead import (
    Budget,
    ExtractedLead,
    LeadIntent,
    Location,
    PropertyType,
)
from app.models.raw_lead import RawLead

# Regular expression patterns
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
BEDROOM_PATTERN = re.compile(r"\b(\d+)\s*(?:bhk|bed|bedroom|bedrooms|br)\b", re.IGNORECASE)
BATHROOM_PATTERN = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:bath|bathroom|bathrooms|ba)\b", re.IGNORECASE)
BUDGET_RANGE_PATTERN = re.compile(
    r"(?:budget|price|between)\s*[:\$]?\s*(\d+(?:,\d+)*(?:\.\d+)?k?)\s*(?:-|to)\s*\$?(\d+(?:,\d+)*(?:\.\d+)?k?)",
    re.IGNORECASE,
)
BUDGET_SINGLE_PATTERN = re.compile(
    r"(?:\$|budget\s*(?:of|is|:)?\s*\$?)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand)?(?:\s*(?:/mo|per month|monthly|\/month))?",
    re.IGNORECASE,
)


def _parse_number_with_k(val_str: str) -> float:
    """Parse number strings like '350k' or '2,500' into a float."""
    cleaned = val_str.replace(",", "").strip().lower()
    if cleaned.endswith("k"):
        return float(cleaned[:-1]) * 1000
    return float(cleaned)


class RuleBasedExtractor(LeadExtractor):
    """Extracts structured real estate parameters using regex patterns and domain heuristics."""

    def extract_intent(self, text: str) -> LeadIntent:
        """Infer customer intent (buy, rent, sell, lease)."""
        lower = text.lower()
        if any(term in lower for term in ["for rent", "renting", "to rent", "lease", "/mo", "per month", "tenant"]):
            return LeadIntent.RENT
        if any(term in lower for term in ["for sale", "selling", "selling my"]):
            return LeadIntent.SELL
        if any(term in lower for term in ["buy", "buying", "purchase", "looking for", "need a", "want to buy"]):
            return LeadIntent.BUY
        return LeadIntent.UNKNOWN

    def extract_property_type(self, text: str) -> PropertyType:
        """Infer property type from keywords."""
        lower = text.lower()
        if "studio" in lower:
            return PropertyType.STUDIO
        if "villa" in lower or "mansion" in lower:
            return PropertyType.VILLA
        if any(term in lower for term in ["commercial", "office space", "retail", "shop", "warehouse"]):
            return PropertyType.COMMERCIAL
        if any(term in lower for term in ["apartment", "condo", "condominium", "flat", "bhk"]):
            return PropertyType.APARTMENT
        if any(term in lower for term in ["townhouse", "house", "single family", "home"]):
            return PropertyType.HOUSE
        if any(term in lower for term in ["land", "plot", "lot", "acre"]):
            return PropertyType.LAND
        return PropertyType.UNKNOWN

    def extract_bedrooms(self, text: str) -> int | None:
        """Extract number of bedrooms from raw text."""
        match = BEDROOM_PATTERN.search(text)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass
        return None

    def extract_bathrooms(self, text: str) -> float | None:
        """Extract number of bathrooms from raw text."""
        match = BATHROOM_PATTERN.search(text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None

    def extract_budget(self, text: str) -> Budget | None:
        """Extract price range or single budget constraint."""
        lower = text.lower()
        is_monthly = any(term in lower for term in ["/mo", "per month", "monthly", "rent", "lease"])
        period = "month" if is_monthly else "total"

        # Check for range: "$2000 - $2500" or "budget 300k to 400k"
        range_match = BUDGET_RANGE_PATTERN.search(text)
        if range_match:
            try:
                min_p = _parse_number_with_k(range_match.group(1))
                max_p = _parse_number_with_k(range_match.group(2))
                return Budget(min_price=min_p, max_price=max_p, currency="USD", period=period)
            except ValueError:
                pass

        # Check for single amount: "$2500" or "$350k"
        single_match = BUDGET_SINGLE_PATTERN.search(text)
        if single_match:
            try:
                raw_num = single_match.group(1)
                is_k = bool(single_match.group(2))
                amount = float(raw_num.replace(",", ""))
                if is_k:
                    amount *= 1000
                return Budget(min_price=None, max_price=amount, currency="USD", period=period)
            except ValueError:
                pass

        return None

    def extract_contact_info(self, text: str) -> tuple[str | None, str | None]:
        """Extract contact email and phone number if present."""
        email_match = EMAIL_PATTERN.search(text)
        phone_match = PHONE_PATTERN.search(text)
        email = email_match.group(0) if email_match else None
        phone = phone_match.group(0) if phone_match else None
        return email, phone

    def extract(self, raw_lead: RawLead) -> ExtractedLead:
        """Extract all structured fields from a RawLead instance."""
        text = raw_lead.raw_text
        intent = self.extract_intent(text)
        property_type = self.extract_property_type(text)
        bedrooms = self.extract_bedrooms(text)
        bathrooms = self.extract_bathrooms(text)
        budget = self.extract_budget(text)
        email, phone = self.extract_contact_info(text)

        # Compute confidence score based on how many attributes were extracted
        extracted_fields_count = sum(
            [
                intent != LeadIntent.UNKNOWN,
                property_type != PropertyType.UNKNOWN,
                bedrooms is not None,
                bathrooms is not None,
                budget is not None,
                email is not None or phone is not None,
            ]
        )
        confidence = round(min(1.0, extracted_fields_count / 4.0), 2)

        return ExtractedLead(
            lead_id=raw_lead.lead_id,
            intent=intent,
            property_type=property_type,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            budget=budget,
            location=None,  # Rule-based location parsing will be enhanced in future stages
            contact_email=email,
            contact_phone=phone,
            confidence_score=confidence,
            extracted_at=datetime.now(timezone.utc),
        )
