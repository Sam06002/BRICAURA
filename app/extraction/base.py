"""Abstract interface for lead information extraction."""

from abc import ABC, abstractmethod

from app.models.extracted_lead import ExtractedLead
from app.models.raw_lead import RawLead


class LeadExtractor(ABC):
    """Abstract interface for extracting structured parameters from raw lead content."""

    @abstractmethod
    def extract(self, raw_lead: RawLead) -> ExtractedLead:
        """Process a RawLead and return an ExtractedLead with structured attributes."""
        pass
