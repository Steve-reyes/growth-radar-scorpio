from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc, text
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


@router.get("", summary="List recent daily briefs")
async def list_briefs(
    current_user: User = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent daily briefs.

    Returns the most recent consolidated briefs ordered by
    generation date, each with its summary and lead count.
    """
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    briefs = result.scalars().all()

    # Attach top 10 lead IDs across all leads
    output = []
    for b in briefs:
        leads_result = await db.execute(
            select(Lead).order_by(Lead.hvac_score.desc()).limit(10)
        )
        top_ids = [l.id for l in leads_result.scalars().all()]
        output.append({
            "id": b.id,
            "territory_id": b.territory_id,
            "title": b.title,
            "summary": b.summary,
            "recommendations": b.recommendations,
            "lead_count": b.lead_count,
            "generated_at": b.generated_at.isoformat() if b.generated_at else None,
            "delivered": b.delivered,
            "top_lead_ids": top_ids,
        })
    return output


@router.get("/latest", summary="Get the most recent brief")
async def get_latest_brief(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent daily brief."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No briefs found yet")

    leads_result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc()).limit(10)
    )
    top_ids = [l.id for l in leads_result.scalars().all()]

    return {
        "id": brief.id,
        "territory_id": brief.territory_id,
        "title": brief.title,
        "summary": brief.summary,
        "recommendations": brief.recommendations,
        "lead_count": brief.lead_count,
        "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
        "delivered": brief.delivered,
        "top_lead_ids": top_ids,
    }


@router.post("/generate", summary="Trigger scan + consolidated brief")
async def generate_brief(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger lead ingestion and generate ONE consolidated brief.

    Runs ingestion for all active territories, then generates a single
    daily brief with per-territory breakdown + top 10 leads across all.
    Old per-territory briefs are deleted to avoid clutter.
    """
    stmt = select(Territory).where(Territory.is_active == True)
    result = await db.execute(stmt)
    territories = result.scalars().all()

    if not territories:
        raise HTTPException(status_code=404, detail="No active territories found")

    # Run ingestion for all territories
    total_new = 0
    for territory in territories:
        ingest_result = await run_ingestion_for_territory(db, territory)
        total_new += ingest_result["new_leads"]

    # Get ALL leads across all territories
    leads_result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc())
    )
    all_leads = list(leads_result.scalars().all())

    # Build territory name map
    territory_map = {t.id: t.name for t in territories}

    # Generate one consolidated summary
    summary, top_ids = await generate_brief_summary(
        leads=all_leads,
        territory_name="",
        territory_map=territory_map,
    )

    # Delete old briefs
    await db.execute(
        text("DELETE FROM daily_briefs")
    )

    # Create ONE consolidated brief
    brief = DailyBrief(
        territory_id=None,
        title=f"Daily HVAC Brief — {datetime.utcnow().strftime('%Y-%m-%d')}",
        summary=summary,
        lead_count=len(all_leads),
    )
    db.add(brief)
    await db.flush()
    await db.refresh(brief)

    return {
        "detail": f"Consolidated brief generated. {total_new} new leads ingested.",
        "briefs": [{
            "id": brief.id,
            "territory_id": brief.territory_id,
            "title": brief.title,
            "summary": brief.summary,
            "recommendations": brief.recommendations,
            "lead_count": brief.lead_count,
            "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
            "delivered": brief.delivered,
            "top_lead_ids": top_ids,
        }],
    }


@router.get("/{brief_id}/analytics", summary="Get brief analytics data for AI analysis")
async def get_brief_analytics(
    brief_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get structured analytics data from the latest brief.

    Returns per-territory breakdown with leads count, avg scores,
    hot lead counts, and the top 25 highest-scoring leads with
    business name, city, score, and type. Designed to feed into
    an AI agent for generating actionable recommendations.
    """
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    # Get territories
    terr_result = await db.execute(select(Territory))
    territories = list(terr_result.scalars().all())

    # Get per-territory stats
    territory_stats = []
    for t in territories:
        tl_result = await db.execute(
            select(Lead).where(Lead.territory_id == t.id)
        )
        tl = list(tl_result.scalars().all())
        if not tl:
            continue
        avg = sum(l.hvac_score for l in tl) / len(tl)
        hot = len([l for l in tl if l.hvac_score >= 70])
        territory_stats.append({
            "id": t.id,
            "name": t.name,
            "city": t.city,
            "province": t.province,
            "lead_count": len(tl),
            "avg_score": round(avg, 1),
            "hot_leads": hot,
            "top_score": max(l.hvac_score for l in tl) if tl else 0,
        })

    # Top 25 leads for smart analysis
    top_result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc()).limit(25)
    )
    top_leads = [
        {
            "id": l.id,
            "business_name": l.business_name,
            "city": l.city,
            "province": l.province,
            "hvac_score": l.hvac_score,
            "business_type": l.business_type,
            "status": l.status,
        }
        for l in top_result.scalars().all()
    ]

    return {
        "brief_id": brief.id,
        "brief_title": brief.title,
        "lead_count": brief.lead_count,
        "total_territories": len(territory_stats),
        "territories": territory_stats,
        "top_leads": top_leads,
    }


from pydantic import BaseModel

class RecommendationsBody(BaseModel):
    text: str

@router.put("/{brief_id}/recommendations", summary="Store AI-generated recommendations")
async def store_recommendations(
    brief_id: int,
    body: RecommendationsBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store AI-generated recommendations on a brief.

    This is called by the analysis sub-agent after it finishes
    processing the brief's analytics data.
    """
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    brief.recommendations = body.text
    await db.flush()

    return {"id": brief.id, "recommendations": body.text}


@router.get("/{brief_id}", summary="Get brief detail with leads")
async def get_brief(
    brief_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single daily brief with all leads across territories."""
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    leads_result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc())
    )
    leads = list(leads_result.scalars().all())
    top_ids = [l.id for l in leads[:10]]

    return {
        "brief": {
            "id": brief.id,
            "territory_id": brief.territory_id,
            "title": brief.title,
            "summary": brief.summary,
            "recommendations": brief.recommendations,
            "lead_count": brief.lead_count,
            "generated_at": brief.generated_at.isoformat() if brief.generated_at else None,
            "delivered": brief.delivered,
            "top_lead_ids": top_ids,
        },
        "leads": leads,
    }
