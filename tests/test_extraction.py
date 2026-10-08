"""Unit tests for structured parameter extraction and rule-based parsing."""

import unittest
from datetime import datetime, timezone

from app.extraction.rules import RuleBasedExtractor
from app.models.extracted_lead import ExtractedLead, LeadIntent, PropertyType
from app.models.raw_lead import LeadSource, RawLead


class TestExtraction(unittest.TestCase):
    """Test suite for ExtractedLead model and RuleBasedExtractor heuristics."""

    def setUp(self) -> None:
        self.extractor = RuleBasedExtractor()

    def test_extracted_lead_validation(self) -> None:
        """Verify ExtractedLead constraints and defaults."""
        lead = ExtractedLead(
            lead_id="lead-100",
            intent=LeadIntent.BUY,
            property_type=PropertyType.APARTMENT,
            bedrooms=2,
            confidence_score=0.75,
        )
        self.assertEqual(lead.lead_id, "lead-100")
        self.assertEqual(lead.intent, LeadIntent.BUY)
        self.assertEqual(lead.confidence_score, 0.75)

        # Invalid confidence score
        with self.assertRaises(ValueError):
            ExtractedLead(lead_id="lead-101", confidence_score=1.5)

    def test_extract_rental_apartment_intent_and_details(self) -> None:
        """Verify extracting rental intent, bedrooms, monthly budget, and contact info."""
        raw_lead = RawLead(
            lead_id="lead-sample-1",
            source=LeadSource.REDDIT,
            raw_text="Looking for a 2BHK apartment for rent in Downtown! Budget $2,200/mo. Contact: alex@example.com",
            collected_at=datetime.now(timezone.utc),
        )

        extracted = self.extractor.extract(raw_lead)

        self.assertEqual(extracted.lead_id, "lead-sample-1")
        self.assertEqual(extracted.intent, LeadIntent.RENT)
        self.assertEqual(extracted.property_type, PropertyType.APARTMENT)
        self.assertEqual(extracted.bedrooms, 2)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.max_price, 2200.0)
        self.assertEqual(extracted.budget.period, "month")
        self.assertEqual(extracted.contact_email, "alex@example.com")
        self.assertGreaterEqual(extracted.confidence_score, 0.75)

    def test_extract_purchase_villa_with_budget_range(self) -> None:
        """Verify extracting purchase intent, villa property, and price range."""
        raw_lead = RawLead(
            lead_id="lead-sample-2",
            source=LeadSource.TELEGRAM,
            raw_text="Want to buy a 4 bed 3 bath luxury villa. Budget between 500k to 750k. Call 555-123-4567",
            collected_at=datetime.now(timezone.utc),
        )

        extracted = self.extractor.extract(raw_lead)

        self.assertEqual(extracted.intent, LeadIntent.BUY)
        self.assertEqual(extracted.property_type, PropertyType.VILLA)
        self.assertEqual(extracted.bedrooms, 4)
        self.assertEqual(extracted.bathrooms, 3.0)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.min_price, 500000.0)
        self.assertEqual(extracted.budget.max_price, 750000.0)
        self.assertEqual(extracted.budget.period, "total")
        self.assertEqual(extracted.contact_phone, "555-123-4567")

    def test_extract_commercial_property(self) -> None:
        """Verify commercial office property type extraction."""
        raw_lead = RawLead(
            lead_id="lead-sample-3",
            source=LeadSource.FACEBOOK,
            raw_text="Need commercial office space for tech startup. Budget $5000/mo.",
            collected_at=datetime.now(timezone.utc),
        )

        extracted = self.extractor.extract(raw_lead)
        self.assertEqual(extracted.property_type, PropertyType.COMMERCIAL)

    def test_extract_customer_rent_lead(self) -> None:
        """Verify Customer rent lead: 'Looking for 2BHK in Satellite, budget 25k, rent.'"""
        raw_lead = RawLead(
            lead_id="lead-cust-rent-1",
            source=LeadSource.MANUAL,
            raw_text="Looking for 2BHK in Satellite, budget 25k, rent.",
            collected_at=datetime.now(timezone.utc),
        )
        extracted = self.extractor.extract(raw_lead)
        self.assertEqual(extracted.lead_type.value, "customer")
        self.assertEqual(extracted.transaction_type.value, "rent")
        self.assertEqual(extracted.bedrooms, 2)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.max_price, 25000.0)

    def test_extract_property_rent_lead(self) -> None:
        """Verify Property rent lead: '2BHK furnished apartment in Prahlad Nagar, 23k/month.'"""
        raw_lead = RawLead(
            lead_id="lead-prop-rent-1",
            source=LeadSource.MANUAL,
            raw_text="2BHK furnished apartment in Prahlad Nagar, 23k/month.",
            collected_at=datetime.now(timezone.utc),
        )
        extracted = self.extractor.extract(raw_lead)
        self.assertEqual(extracted.lead_type.value, "property")
        self.assertEqual(extracted.transaction_type.value, "rent")
        self.assertEqual(extracted.property_type.value, "apartment")
        self.assertEqual(extracted.bedrooms, 2)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.max_price, 23000.0)

    def test_extract_flatmate_offering_room_lead(self) -> None:
        """Verify Flatmate lead: 'Have one room available in a 2BHK, looking for a flatmate.'"""
        raw_lead = RawLead(
            lead_id="lead-flatmate-1",
            source=LeadSource.TELEGRAM,
            raw_text="Have one room available in a 2BHK, looking for a flatmate.",
            collected_at=datetime.now(timezone.utc),
        )
        extracted = self.extractor.extract(raw_lead)
        self.assertEqual(extracted.lead_type.value, "flatmate")
        self.assertIsNotNone(extracted.flatmate_intent)
        assert extracted.flatmate_intent is not None
        self.assertEqual(extracted.flatmate_intent.value, "offering_room")
        self.assertEqual(extracted.property_type.value, "apartment")
        self.assertEqual(extracted.bedrooms, 2)

    def test_extract_customer_buy_lead_in_lakhs(self) -> None:
        """Verify Customer buy lead: 'Looking to buy 3BHK in Bopal, budget 80L.'"""
        raw_lead = RawLead(
            lead_id="lead-cust-buy-1",
            source=LeadSource.MANUAL,
            raw_text="Looking to buy 3BHK in Bopal, budget 80L.",
            collected_at=datetime.now(timezone.utc),
        )
        extracted = self.extractor.extract(raw_lead)
        self.assertEqual(extracted.lead_type.value, "customer")
        self.assertEqual(extracted.transaction_type.value, "buy/sale")
        self.assertEqual(extracted.bedrooms, 3)
        self.assertIsNotNone(extracted.budget)
        assert extracted.budget is not None
        self.assertEqual(extracted.budget.max_price, 8000000.0)  # 80 Lakhs = 8,000,000
        self.assertEqual(extracted.budget.currency, "INR")


if __name__ == "__main__":
    unittest.main()
