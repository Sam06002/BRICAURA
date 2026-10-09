"""Deterministic rule-based extractor using regex and real estate domain heuristics."""

import re
from datetime import datetime, timezone

from app.extraction.base import LeadExtractor
from app.models.extracted_lead import (
     Budget,
     ExtractedLead,
     FlatmateIntent,
     LeadIntent,
     LeadType,
     PropertyType,
     TransactionType,
 )
from app.models.raw_lead import RawLead

# Regular expression patterns
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
BEDROOM_PATTERN = re.compile(r"\b(\d+)\s*(?:bhk|bed|bedroom|bedrooms|br)\b", re.IGNORECASE)
BATHROOM_PATTERN = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:bath|bathroom|bathrooms|ba)\b", re.IGNORECASE)
BUDGET_RANGE_PATTERN = re.compile(
    r"(?:budget|price|between)\s*[:\$₹]?\s*(\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?)\s*(?:-|to)\s*[\$₹]?(\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?)",
    re.IGNORECASE,
)
BUDGET_SINGLE_PATTERN = re.compile(
    r"(?:[\$₹]|(?:budget|rent|price)\s*(?:of|is|:)?\s*[\$₹]?\s*)(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|l|lakh|lac|cr|crore)?(?:\s*(?:/mo|per month|monthly|\/month))?"
    r"|\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|l|lakh|lac|cr|crore)\b(?:\s*(?:/mo|per month|monthly|\/month))?",
    re.IGNORECASE,
)


def _parse_real_estate_number(val_str: str) -> float:
    """Parse number strings like '350k', '25k', '80L', or '2,500' into a float."""
    cleaned = val_str.replace(",", "").strip().lower()
    if cleaned.endswith(("k", "thousand")):
        num_part = re.sub(r"[^\d.]", "", cleaned)
        return float(num_part) * 1_000
    if cleaned.endswith(("l", "lakh", "lac")):
        num_part = re.sub(r"[^\d.]", "", cleaned)
        return float(num_part) * 100_000
    if cleaned.endswith(("cr", "crore")):
        num_part = re.sub(r"[^\d.]", "", cleaned)
        return float(num_part) * 10_000_000
    return float(cleaned)


class RuleBasedExtractor(LeadExtractor):
    """Extracts structured real estate parameters using regex patterns and domain heuristics."""

    def extract_lead_type(self, text: str) -> LeadType:
        """Infer lead category: customer, property, or flatmate."""
        lower = text.lower()
        if any(term in lower for term in ["flatmate", "roommate", "room available", "looking for flatmate", "need flatmate"]):
            return LeadType.FLATMATE
        if any(term in lower for term in ["looking for", "need a", "want to buy", "looking to buy", "budget", "need 2bhk", "required", "seeking"]):
            return LeadType.CUSTOMER
        if any(term in lower for term in ["for rent", "for sale", "available for rent", "furnished apartment in", "ready to move", "selling"]):
            return LeadType.PROPERTY
        return LeadType.UNKNOWN

    def extract_transaction_type(self, text: str) -> TransactionType:
        """Infer transaction type: rent vs buy/sale."""
        lower = text.lower()
        if any(term in lower for term in ["for rent", "renting", "to rent", "rent", "lease", "/mo", "per month", "tenant"]):
            return TransactionType.RENT
        if any(term in lower for term in ["for sale", "selling", "buy", "buying", "purchase", "sale"]):
            return TransactionType.BUY_SALE
        return TransactionType.UNKNOWN

    def extract_flatmate_intent(self, text: str) -> FlatmateIntent | None:
        """Infer flatmate specific intent: looking_for_flatmate vs offering_room."""
        lower = text.lower()
        if any(term in lower for term in ["room available", "have one room", "have a room", "offering room"]):
            return FlatmateIntent.OFFERING_ROOM
        if any(term in lower for term in ["looking for flatmate", "looking for a flatmate", "need flatmate", "seeking flatmate"]):
            return FlatmateIntent.LOOKING_FOR_FLATMATE
        return None

    def extract_intent(self, text: str) -> LeadIntent:
        """Legacy intent classification (retained for backward compatibility)."""
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
        currency = "INR" if any(term in lower for term in ["lakh", "lac", "cr", "crore", "₹", "rs", "inr"]) else "USD"

        # Check for range: "$2000 - $2500" or "budget 300k to 400k"
        range_match = BUDGET_RANGE_PATTERN.search(text)
        if range_match:
            try:
                min_p = _parse_real_estate_number(range_match.group(1))
                max_p = _parse_real_estate_number(range_match.group(2))
                return Budget(min_price=min_p, max_price=max_p, currency=currency, period=period)
            except ValueError:
                pass

        # Check for single amount: "$2500", "25k", "80L", "23k/month"
        single_match = BUDGET_SINGLE_PATTERN.search(text)
        if single_match:
            try:
                raw_num = single_match.group(1) or single_match.group(3)
                suffix = single_match.group(2) or single_match.group(4) or ""
                if suffix.lower() in ("l", "lakh", "lac", "cr", "crore") or any(
                    term in lower for term in ["lakh", "lac", "cr", "crore", "₹", "rs", "inr"]
                ):
                    currency = "INR"

                amount_str = f"{raw_num}{suffix}"
                amount = _parse_real_estate_number(amount_str)
                return Budget(min_price=None, max_price=amount, currency=currency, period=period)
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
        lead_type = self.extract_lead_type(text)
        transaction_type = self.extract_transaction_type(text)
        flatmate_intent = self.extract_flatmate_intent(text)
        intent = self.extract_intent(text)
        property_type = self.extract_property_type(text)
        bedrooms = self.extract_bedrooms(text)
        bathrooms = self.extract_bathrooms(text)
        budget = self.extract_budget(text)
        email, phone = self.extract_contact_info(text)

        # Compute confidence score based on how many attributes were extracted
        extracted_fields_count = sum(
            [
                lead_type != LeadType.UNKNOWN,
                transaction_type != TransactionType.UNKNOWN,
                property_type != PropertyType.UNKNOWN,
                bedrooms is not None,
                budget is not None,
                email is not None or phone is not None,
            ]
        )
        confidence = round(min(1.0, extracted_fields_count / 4.0), 2)

        return ExtractedLead(
            lead_id=raw_lead.lead_id,
            lead_type=lead_type,
            transaction_type=transaction_type,
            flatmate_intent=flatmate_intent,
            intent=intent,
            property_type=property_type,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            budget=budget,
            location=None,
            contact_email=email,
            contact_phone=phone,
            confidence_score=confidence,
            extracted_at=datetime.now(timezone.utc),
        )
