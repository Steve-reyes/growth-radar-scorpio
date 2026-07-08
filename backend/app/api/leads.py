from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import Lead
from app.models.territory import Territory
from app.models.user import User
from app.services.outreach import draft_outreach_email
from app.config import settings
from app.api.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime


router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class LeadResponse(BaseModel):
    id: int
    territory_id: int
    business_name: str
    address: Optional[str]
    city: Optional[str]
    province: Optional[str]
    postal_code: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    licence_fee: Optional[int] = None
    num_employees: Optional[int] = None
    business_type: Optional[str]
    hvac_score: int
    score_reason: Optional[str]
    lead_source: Optional[str]
    source_id: Optional[str]
    status: str
    ai_drafted_email: Optional[str]
    notes: Optional[str]
    discovered_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    current_user: User = Depends(get_current_user),
    territory_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
    business_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List leads with filters."""
    stmt = select(Lead)

    if territory_id is not None:
        stmt = stmt.where(Lead.territory_id == territory_id)
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    if min_score is not None:
        stmt = stmt.where(Lead.hvac_score >= min_score)
    if business_type is not None:
        stmt = stmt.where(Lead.business_type.ilike(f"%{business_type}%"))

    stmt = stmt.order_by(Lead.hvac_score.desc(), Lead.discovered_at.desc())
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    leads = result.scalars().all()
    return leads


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get lead detail."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    data: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update lead status and/or notes."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    await db.flush()
    await db.refresh(lead)
    return lead


@router.post("/{lead_id}/draft")
async def draft_email(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger LLM or template-based outreach email draft for this lead."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    territory_result = await db.execute(
        select(Territory).where(Territory.id == lead.territory_id)
    )
    territory = territory_result.scalar_one_or_none()

    email_text = await draft_outreach_email(
        lead=lead,
        territory=territory,
        api_key=settings.OPENAI_API_KEY,
    )

    lead.ai_drafted_email = email_text
    await db.flush()
    await db.refresh(lead)

    return {"lead_id": lead_id, "email": email_text}


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a lead (set status='dismissed')."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = "dismissed"
    await db.flush()
    return {"detail": "Lead dismissed", "id": lead_id}
