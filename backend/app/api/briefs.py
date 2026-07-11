from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc, text
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
from pydantic import BaseModel

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
import json

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


def _build_analytics_prompt(all_leads, territories, territory_map) -> str:
    """Build a structured prompt for the LLM based on current lead data."""
    total = len(all_leads)
    hot = [l for l in all_leads if l.hvac_score >= 70]
    top_5 = sorted(all_leads, key=lambda x: x.hvac_score, reverse=True)[:5]

    by_terr = defaultdict(list)
    for l in all_leads:
        by_terr[l.territory_id].append(l)

    territory_lines = []
    for tid in sorted(by_terr.keys()):
        tl = by_terr[tid]
        tname = territory_map.get(tid, f"Territory {tid}")
        tavg = sum(l.hvac_score for l in tl) / len(tl) if tl else 0
        thot = len([l for l in tl if l.hvac_score >= 70])
        territory_lines.append(f"- {tname}: {len(tl)} leads, avg {tavg:.0f}, {thot} hot")

    top_lines = []
    for i, l in enumerate(top_5, 1):
        bt = l.business_type or "Unknown"
        city = l.city or "Unknown"
        top_lines.append(f"  {i}. {l.business_name} (Score: {l.hvac_score}, {city}, {bt})")

    prompt = f"""You are a senior lead gen consultant for a digital marketing agency that sells SEO, web development, AI automation, and lead generation to businesses. Analyze this lead data and write 6-8 actionable, numbered recommendations.

Current data:
- {total} total leads across all territories
- {len(hot)} hot leads (score >= 70)
- Top 5 leads:
{chr(10).join(top_lines)}

Breakdown by territory:
{chr(10).join(territory_lines)}

Rules:
- Plain text only, no markdown
- No em dashes, use regular dashes
- Number each recommendation (1. 2. 3. etc.)
- Write in direct, actionable voice for a digital marketing agency owner
- Focus on: which territories to prioritize, which client types are most valuable, what sales approach to use per segment, which territories need more data, specific action steps for today
- Do NOT use any template phrases like "Priority Territory:" or "Top Leads to Contact:"
- Each recommendation should be 1-3 sentences max
- Be specific — mention actual business names, scores, and numbers from the data"""
    return prompt


async def _generate_ai_recommendations(all_leads, territories, territory_map) -> str:
    """Call OpenRouter/DeepSeek to generate AI-quality recommendations.

    Falls back to template recommendations if API key is not set or call fails.
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return _template_recommendations(all_leads, territory_map)

    prompt = _build_analytics_prompt(all_leads, territories, territory_map)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        response = await client.chat.completions.create(
            model="deepseek/deepseek-v4-flash",
            messages=[
                {"role": "system", "content": "You are a senior lead gen consultant for a digital marketing agency. Write direct, actionable recommendations. No markdown. No em dashes. Use numbered format."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            temperature=0.7,
        )

        text = response.choices[0].message.content.strip()
        if text:
            # Clean any markdown artifacts
            text = text.replace("##", "").replace("**", "").replace("—", "-").strip()
            # Remove any em dashes
            text = text.replace("\u2014", "-")
            return text
    except Exception:
        pass

    return _template_recommendations(all_leads, territory_map)


def _template_recommendations(all_leads, territory_map) -> str:
    """Fallback template recommendations when AI is unavailable."""
    total = len(all_leads)
    if not total:
        return "No leads available yet. Run a scan first."

    hot_leads = [l for l in all_leads if l.hvac_score >= 70]
    top_3 = sorted(all_leads, key=lambda x: x.hvac_score, reverse=True)[:3]

    by_terr = defaultdict(list)
    for l in all_leads:
        by_terr[l.territory_id].append(l)

    best_terr_id = max(by_terr, key=lambda tid: len([l for l in by_terr[tid] if l.hvac_score >= 70]))
    best_terr_name = territory_map.get(best_terr_id, f"Territory {best_terr_id}")
    best_terr_leads = by_terr[best_terr_id]
    best_terr_hot = len([l for l in best_terr_leads if l.hvac_score >= 70])

    lines = [
        f"1. Priority Territory: {best_terr_name}",
        f"   {best_terr_name} has {len(best_terr_leads)} total leads with {best_terr_hot} hot leads (score 70+). This is your highest-concentration pipeline for immediate outbound.",
        "",
    ]

    if top_3:
        names = ", ".join(f"{l.business_name} (Score: {l.hvac_score})" for l in top_3)
        lines.append(f"2. Top Leads to Contact: {names}")
        lines.append(
            f"   These are your highest-scoring leads. Each scores {top_3[0].hvac_score}+ and "
            f"represents a high-LTV client opportunity. Prioritize direct outreach today."
        )
        lines.append("")

    coquitlam_leads = by_terr.get(2, [])
    if coquitlam_leads:
        cq_hot = len([l for l in coquitlam_leads if l.hvac_score >= 70])
        lines.append(f"3. Coquitlam Strategy: {len(coquitlam_leads)} leads, {cq_hot} hot. "
                      f"Segment by business type and target the top {min(cq_hot, 60)} hot leads "
                      f"for immediate outbound. Nurture the rest.")
        lines.append("")

    restaurants = [l for l in all_leads if l.business_type and "restaurant" in l.business_type.lower()]
    if restaurants:
        lines.append(f"4. Restaurant Leads ({len(restaurants)} total): These score 90 and need a "
                      f"compliance/continuity pitch (health codes, walk-in coolers, emergency HVAC), "
                      f"not a marketing pitch. Run a separate email sequence for these.")
        lines.append("")

    low_terrs = [(tid, len(leads)) for tid, leads in by_terr.items() if len(leads) < 20]
    if low_terrs:
        names = ", ".join(f"{territory_map.get(tid, f'ID {tid}')} ({n} leads)" for tid, n in low_terrs)
        lines.append(f"5. Territories Needing Data: {names}. Insufficient lead volume for scoring. "
                      f"Defer outbound spend until volume reaches 50+ leads.")
        lines.append("")

    with_email = [l for l in hot_leads if l.email]
    if with_email:
        lines.append(f"6. Quick Wins: {len(with_email)} hot leads have email addresses. "
                      f"Prioritize these for cold email sequences today.")

    return "\n".join(lines)


@router.get("", summary="List recent daily briefs")
async def list_briefs(
    current_user: User = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent daily briefs."""
    stmt = (
        select(DailyBrief)
        .order_by(desc(DailyBrief.generated_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    briefs = result.scalars().all()

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

    Runs ingestion for all active territories, then generates a consolidated
    daily brief with summary + AI recommendations (or template fallback).
    """
    stmt = select(Territory).where(Territory.is_active == True)
    result = await db.execute(stmt)
    territories = result.scalars().all()

    if not territories:
        raise HTTPException(status_code=404, detail="No active territories found")

    total_new = 0
    for territory in territories:
        ingest_result = await run_ingestion_for_territory(db, territory)
        total_new += ingest_result["new_leads"]

    leads_result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc())
    )
    all_leads = list(leads_result.scalars().all())

    territory_map = {t.id: t.name for t in territories}

    summary, top_ids = await generate_brief_summary(
        leads=all_leads,
        territory_name="",
        territory_map=territory_map,
    )

    # Generate AI-quality recommendations inline (calls DeepSeek via OpenRouter)
    recommendations_text = await _generate_ai_recommendations(all_leads, territories, territory_map)

    await db.execute(
        text("DELETE FROM daily_briefs")
    )

    brief = DailyBrief(
        territory_id=None,
        title=f"Daily HVAC Brief — {datetime.utcnow().strftime('%Y-%m-%d')}",
        summary=summary,
        recommendations=recommendations_text,
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
    """Get structured analytics data from the latest brief."""
    result = await db.execute(select(DailyBrief).where(DailyBrief.id == brief_id))
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    terr_result = await db.execute(select(Territory))
    territories = list(terr_result.scalars().all())

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


class RecommendationsBody(BaseModel):
    text: str


@router.put("/{brief_id}/recommendations", summary="Store AI-generated recommendations")
async def store_recommendations(
    brief_id: int,
    body: RecommendationsBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store AI-generated recommendations on a brief."""
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
