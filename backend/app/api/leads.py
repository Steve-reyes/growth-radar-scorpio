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


@router.get("", response_model=list[LeadResponse], summary="List leads with filters")
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
    """List HVAC leads with optional filters.

    Supports filtering by territory, status, minimum HVAC score,
    and business type. Results are ordered by score descending then
    discovery date descending. Paginate with limit and offset.
    """
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


@router.get("/{lead_id}", response_model=LeadResponse, summary="Get lead details")
async def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details for a single lead.

    Returns all available fields including business info, HVAC score,
    score reasoning, and any AI-drafted email content.
    Raises 404 if the lead does not exist.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse, summary="Update lead status or notes")
async def update_lead(
    lead_id: int,
    data: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a lead's status, notes, phone, or website.

    Supports partial update — only supplied fields are changed.
    Useful for moving a lead through the pipeline or recording
    call notes. Raises 404 if the lead is not found.
    """
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


@router.post("/{lead_id}/draft", summary="Generate outreach email draft")
async def draft_email(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an AI-powered outreach email draft for a lead.

    Uses the configured LLM (OpenAI) to create a personalised
    cold outreach email based on the lead's business info, territory,
    and HVAC score. The generated draft is saved to the lead record.
    """
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


@router.delete("/{lead_id}", summary="Dismiss a lead")
async def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a lead by marking it as dismissed.

    Sets the lead's status to 'dismissed' rather than deleting it
    from the database, preserving data for future reference or
    re-activation. Raises 404 if the lead is not found.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = "dismissed"
    await db.flush()
    return {"detail": "Lead dismissed", "id": lead_id}
