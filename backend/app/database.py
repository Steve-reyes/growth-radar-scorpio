from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args={"timeout": 30})
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables and seed default admin if empty."""
    async with engine.begin() as conn:
        from app.models import Territory, Lead, DailyBrief, User, UserLeadStatus, ImportBatch, ImportedLead, ImportedKanbanStatus  # noqa: F401
        from sqlalchemy import select
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as session:
        from app.utils.auth import hash_password
        result = await session.execute(select(User).limit(1))
        if not result.scalar_one_or_none():
            session.add(User(
                email="admin@growthradar.dev",
                name="Admin",
                hashed_password=hash_password("admin123"),
                role="admin",
                is_active=True,
            ))
            await session.commit()
            import logging
            logging.info("Created default admin user: admin@growthradar.dev / admin123")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
