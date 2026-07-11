"""Kanban API — per-user lead status for kanban board."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import Lead
from app.models.territory import Territory
from app.models.user import User
from app.models.user_lead_status import UserLeadStatus
from app.api.auth import get_current_user
from app.api.leads import LeadResponse

router = APIRouter(prefix="/api/kanban", tags=["kanban"])


@router.get("/leads", summary="Get leads with per-user kanban status")
async def get_kanban_leads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all leads with per-user kanban board status overlay.

    Returns every lead along with the authenticated user's custom
    kanban status (new, contacted, qualified, converted, dismissed).
    Falls back to the lead's default status if the user has not set
    one. Also returns the list of active territories for filter buttons.
    """
    # Get all leads
    result = await db.execute(
        select(Lead).order_by(Lead.hvac_score.desc(), Lead.discovered_at.desc())
    )
    leads = result.scalars().all()

    # Get user's custom statuses
    status_result = await db.execute(
        select(UserLeadStatus).where(UserLeadStatus.user_id == current_user.id)
    )
    user_statuses = {s.lead_id: s.status for s in status_result.scalars().all()}

    # Also get territories for the filter buttons
    terr_result = await db.execute(select(Territory).where(Territory.is_active == True))
    territories = terr_result.scalars().all()

    # Build response with overlaid status
    leads_data = []
    for lead in leads:
        d = {
            "id": lead.id,
            "territory_id": lead.territory_id,
            "business_name": lead.business_name,
            "address": lead.address,
            "city": lead.city,
            "province": lead.province,
            "postal_code": lead.postal_code,
            "phone": lead.phone,
            "email": lead.email,
            "website": lead.website,
            "licence_fee": lead.licence_fee,
            "num_employees": lead.num_employees,
            "business_type": lead.business_type,
            "hvac_score": lead.hvac_score,
            "score_reason": lead.score_reason,
            "lead_source": lead.lead_source,
            "source_id": lead.source_id,
            "status": user_statuses.get(lead.id, lead.status),
            "ai_drafted_email": lead.ai_drafted_email,
            "notes": lead.notes,
            "discovered_at": lead.discovered_at.isoformat() if lead.discovered_at else None,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
            "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
        }
        leads_data.append(d)

    # Build territory summary
    territories_data = [
        {
            "id": t.id,
            "name": t.name,
            "city": t.city,
            "is_active": t.is_active,
        }
        for t in territories
    ]

    return {
        "leads": leads_data,
        "territories": territories_data,
    }


class KanbanStatusUpdate(BaseModel):
    status: str


@router.patch("/leads/{lead_id}", summary="Set kanban status for a lead")
async def update_kanban_status(
    lead_id: int,
    data: KanbanStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set or update the kanban status for a lead (per-user).

    Performs an upsert on the user's custom status for this lead.
    Accepts status values: new, contacted, qualified, converted,
    or dismissed. The status is stored per-user, so each team
    member can manage their own pipeline independently.
    """
    # Check lead exists
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead not found")

    # Upsert user_lead_status
    existing = await db.execute(
        select(UserLeadStatus).where(
            UserLeadStatus.user_id == current_user.id,
            UserLeadStatus.lead_id == lead_id,
        )
    )
    entry = existing.scalar_one_or_none()
    if entry:
        entry.status = data.status
    else:
        entry = UserLeadStatus(
            user_id=current_user.id,
            lead_id=lead_id,
            status=data.status,
        )
        db.add(entry)

    await db.flush()

    return {"id": lead_id, "status": data.status}
