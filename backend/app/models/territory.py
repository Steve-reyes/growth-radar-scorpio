from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, func

from app.database import Base


class Territory(Base):
    __tablename__ = "territories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    city = Column(String(255), nullable=False)
    province = Column(String(10), nullable=False)
    postal_code = Column(String(20), nullable=True)
    radius_km = Column(Float, default=50.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Territory(id={self.id}, name='{self.name}', city='{self.city}')>"
