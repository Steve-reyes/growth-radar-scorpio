from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from app.database import Base


class UserLeadStatus(Base):
    __tablename__ = "user_lead_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    status = Column(String(50), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "lead_id", name="uq_user_lead"),
    )
