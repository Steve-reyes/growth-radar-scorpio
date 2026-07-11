"""SQLAlchemy models for imported leads (leadscraper / CSV imports)."""

import json
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String(20), primary_key=True)
    list_name = Column(String(255), nullable=False)
    imported_at = Column(DateTime, default=datetime.utcnow)
    count = Column(Integer, default=0)

    leads = relationship("ImportedLead", back_populates="batch",
                         order_by="ImportedLead.idx",
                         cascade="all, delete-orphan")


class ImportedLead(Base):
    __tablename__ = "imported_leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String(20), ForeignKey("import_batches.id"), nullable=False, index=True)
    idx = Column(Integer, nullable=False, default=0)

    business_name = Column(String(500))
    normalized_name = Column(String(500))
    address = Column(String(500))
    city = Column(String(200))
    country = Column(String(100))
    website = Column(String(1000))
    rating = Column(Float)
    review_count = Column(Integer)
    phone = Column(String(100))
    email = Column(String(500))
    enriched_phone = Column(String(100))
    enriched_email = Column(String(500))
    sources = Column(Text)
    categories = Column(Text)
    google_place_id = Column(String(200))
    social_links = Column(Text)
    enrichment_status = Column(String(50))

    batch = relationship("ImportBatch", back_populates="leads")

    def to_dict(self) -> dict:
        """Convert to camelCase dict matching frontend ImportLead interface."""
        return {
            "businessName": self.business_name or "",
            "normalizeName": self.normalized_name or "",
            "address": self.address or "",
            "city": self.city or "",
            "country": self.country or "",
            "website": self.website or "",
            "rating": self.rating,
            "reviewCount": self.review_count,
            "phone": self.phone or "",
            "email": self.email or "",
            "enrichedPhone": self.enriched_phone or "",
            "enrichedEmail": self.enriched_email or "",
            "sources": json.loads(self.sources) if self.sources else [],
            "categories": json.loads(self.categories) if self.categories else [],
        }
