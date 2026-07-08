from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.daily_brief import DailyBrief
from app.models.lead import Lead
from app.models.territory import Territory
from app.models.user import User
from app.services.outreach import generate_brief_summary
from app.services.ingestor import run_ingestion_for_territory
from app.config import settings
from app.api.auth import get_current_user
from datetime import datetime


router = APIRouter(prefix="/api/briefs", tags=["briefs"])


@router.get("")
async def list_briefs(
    current_user: User = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent briefs with top lead IDs."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    briefs = result.scalars().all()

    # Attach top lead IDs for each brief
    output = []
    for b in briefs:
        top_ids = []
        if b.territory_id:
            leads_stmt = (
                select(Lead)
                .where(Lead.territory_id == b.territory_id)
                .order_by(Lead.hvac_score.desc())
                .limit(5)
            )
            leads_result = await db.execute(leads_stmt)
            top_ids = [l.id for l in leads_result.scalars().all()]
        output.append({
            "id": b.id,
            "territory_id": b.territory_id,
            "title": b.title,
            "summary": b.summary,
            "lead_count": b.lead_count,
            "generated_at": b.generated_at.isoformat() if b.generated_at else None,
            "delivered": b.delivered,
            "top_lead_ids": top_ids,
        })
    return output


@router.get("/latest")
async def get_latest_brief(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent brief with top lead IDs."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No briefs found yet")

    top_ids = []
    if brief.territory_id:
        leads_stmt = (
            select(Lead)
            .where(Lead.territory_id == brief.territory_id)
            .order_by(Lead.hvac_score.desc())
            .limit(5)
        )
        leads_result = await db.execute(leads_stmt)
        top_ids = [l.id for l in leads_result.scalars().all()]

    return {
        "id": brief.id,
        "territory_id": brief.territory_id,
        "title": brief.title,
        "summary": brief.summary,
        "lead_count": brief.lead_count,
        "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
        "delivered": brief.delivered,
        "top_lead_ids": top_ids,
    }


@router.post("/generate")
async def generate_brief(
    current_user: User = Depends(get_current_user),
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
        summary, top_ids = await generate_brief_summary(
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
        briefs_created.append({
            "id": brief.id,
            "territory_id": brief.territory_id,
            "title": brief.title,
            "summary": brief.summary,
            "lead_count": brief.lead_count,
            "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
            "delivered": brief.delivered,
            "top_lead_ids": top_ids,
        })

    return {
        "detail": f"Generated {len(briefs_created)} brief(s)",
        "briefs": briefs_created,
    }


@router.get("/{brief_id}")
async def get_brief(
    brief_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get brief with top leads marked."""
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    leads = []
    top_ids = []
    if brief.territory_id:
        leads_stmt = (
            select(Lead)
            .where(Lead.territory_id == brief.territory_id)
            .order_by(Lead.hvac_score.desc())
        )
        leads_result = await db.execute(leads_stmt)
        leads = leads_result.scalars().all()
        top_ids = [l.id for l in leads[:5]]

    return {
        "brief": {
            "id": brief.id,
            "territory_id": brief.territory_id,
            "title": brief.title,
            "summary": brief.summary,
            "lead_count": brief.lead_count,
            "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
            "delivered": brief.delivered,
            "top_lead_ids": top_ids,
        },
        "leads": leads,
    }
