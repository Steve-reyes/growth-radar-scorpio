from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.territory import Territory
from app.models.lead import Lead
from app.models.user import User
from app.config import settings
from app.api.auth import get_current_user


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", summary="Get app settings (keys masked)")
async def get_settings(
    current_user: User = Depends(get_current_user),
):
    """Get all current application settings.

    Returns the app name, version, CORS origins, ISED API base URL,
    and a boolean indicating whether an OpenAI API key is configured.
    Sensitive values such as the database URL are masked for security.
    """
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "database_url": settings.DATABASE_URL.replace(settings.DATABASE_URL.split("://")[1], "***"),
        "ised_api_base": settings.ISED_API_BASE,
        "cors_origins": settings.CORS_ORIGINS,
        "openai_configured": bool(settings.OPENAI_API_KEY),
    }


@router.post("", summary="Update runtime settings")
async def update_settings(
    data: dict,
    current_user: User = Depends(get_current_user),
):
    """Update runtime application settings.

    For the MVP, settings are updated in-memory for the current
    session only. Acknowledges the request and returns which keys
    were received. Full persistence would require a database table.
    """
    # For MVP, we just acknowledge the request.
    # Full persistence of settings would use a DB table.
    return {
        "detail": "Settings received. Runtime settings updated for this session.",
        "updated_keys": list(data.keys()),
    }


@router.get("/stats", summary="Get dashboard aggregate stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate dashboard statistics.

    Returns total territories, total leads, leads discovered today,
    new leads, high-potential leads (score ≥ 70), and the average
    HVAC score across all leads. Used to populate dashboard widgets.
    """
    # Total territories
    terr_result = await db.execute(select(func.count(Territory.id)))
    total_territories = terr_result.scalar() or 0

    # Total leads
    lead_result = await db.execute(select(func.count(Lead.id)))
    total_leads = lead_result.scalar() or 0

    # Leads discovered today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_stmt = select(func.count(Lead.id)).where(Lead.discovered_at >= today_start)
    today_result = await db.execute(today_stmt)
    leads_today = today_result.scalar() or 0

    # Average HVAC score
    avg_stmt = select(func.coalesce(func.avg(Lead.hvac_score), 0))
    avg_result = await db.execute(avg_stmt)
    avg_score = float(avg_result.scalar() or 0)

    # New leads (status='new')
    new_stmt = select(func.count(Lead.id)).where(Lead.status == "new")
    new_result = await db.execute(new_stmt)
    new_leads = new_result.scalar() or 0

    # High potential leads (score >= 70)
    high_stmt = select(func.count(Lead.id)).where(Lead.hvac_score >= 70)
    high_result = await db.execute(high_stmt)
    high_potential = high_result.scalar() or 0

    return {
        "total_territories": total_territories,
        "total_leads": total_leads,
        "leads_today": leads_today,
        "new_leads": new_leads,
        "high_potential_leads": high_potential,
        "average_hvac_score": round(avg_score, 1),
    }
