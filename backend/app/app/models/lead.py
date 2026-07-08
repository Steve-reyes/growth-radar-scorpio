from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    territory_id = Column(Integer, ForeignKey("territories.id"), nullable=False)
    business_name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    province = Column(String(10), nullable=True)
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    business_type = Column(String(100), nullable=True)
    hvac_score = Column(Integer, default=0, nullable=False)
    score_reason = Column(Text, nullable=True)
    lead_source = Column(String(100), nullable=True)
    source_id = Column(String(255), nullable=True)
    status = Column(String(50), default="new", nullable=False)
    ai_drafted_email = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    discovered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Lead(id={self.id}, name='{self.business_name}', score={self.hvac_score})>"
