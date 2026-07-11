"""ImportedKanbanStatus model — per-user kanban status for imported leads."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from app.database import Base


class ImportedKanbanStatus(Base):
    __tablename__ = "imported_kanban_status"
    __table_args__ = (UniqueConstraint("user_id", "lead_key", name="uq_user_lead_key"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    lead_key = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="new")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "lead_key": self.lead_key,
            "status": self.status,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
