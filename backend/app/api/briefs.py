from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.daily_brief import DailyBrief
from app.models.lead import Lead
from app.models.territory import Territory
from app.services.outreach import generate_brief_summary
from app.services.ingestor import run_ingestion_for_territory
from app.config import settings
from datetime import datetime


router = APIRouter(prefix="/api/briefs", tags=["briefs"])


@router.get("")
async def list_briefs(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent briefs."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    briefs = result.scalars().all()
    return briefs


@router.get("/latest")
async def get_latest_brief(
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent brief."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No briefs found yet")
    return brief


@router.post("/generate")
async def generate_brief(
    territory_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger brief generation."""
    stmt = select(Territory)
    if territory_id:
        stmt = stmt.where(Territory.id == territory_id)
    stmt = stmt.where(Territory.is_active == True)

    result = await db.execute(stmt)
    territories = result.scalars().all()

    if not territories:
        raise HTTPException(status_code=404, detail="No active territories found")

    briefs_created = []

    for territory in territories:
        # Run ingestion
        ingest_result = await run_ingestion_for_territory(db, territory)
        new_lead_count = ingest_result["new_leads"]

        # Get all leads for this territory
        leads_stmt = select(Lead).where(Lead.territory_id == territory.id)
        leads_result = await db.execute(leads_stmt)
        leads = leads_result.scalars().all()

        # Generate summary
        summary = await generate_brief_summary(
            leads=list(leads),
            territory_name=territory.name,
        )

        brief = DailyBrief(
            territory_id=territory.id,
            title=f"Daily Brief - {territory.name} - {datetime.utcnow().strftime('%Y-%m-%d')}",
            summary=summary,
            lead_count=len(leads),
        )
        db.add(brief)
        await db.flush()
        await db.refresh(brief)
        briefs_created.append(brief)

    return {
        "detail": f"Generated {len(briefs_created)} brief(s)",
        "briefs": briefs_created,
    }


@router.get("/{brief_id}")
async def get_brief(
    brief_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get brief with leads."""
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    leads = []
    if brief.territory_id:
        leads_stmt = select(Lead).where(Lead.territory_id == brief.territory_id)
        leads_result = await db.execute(leads_stmt)
        leads = leads_result.scalars().all()

    return {
        "brief": brief,
        "leads": leads,
    }
