from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func

from app.database import Base


class DailyBrief(Base):
    __tablename__ = "daily_briefs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    territory_id = Column(Integer, ForeignKey("territories.id"), nullable=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=True)
    lead_count = Column(Integer, default=0, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    delivered = Column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<DailyBrief(id={self.id}, title='{self.title}', leads={self.lead_count})>"
