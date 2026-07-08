from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.territory import Territory
from app.models.lead import Lead
from app.models.user import User
from app.api.auth import get_current_user
from pydantic import BaseModel, Field
from datetime import datetime


router = APIRouter(prefix="/api/territories", tags=["territories"])


class TerritoryCreate(BaseModel):
    name: str
    city: str
    province: str
    postal_code: Optional[str] = None
    radius_km: float = 50.0


class TerritoryUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    radius_km: Optional[float] = None
    is_active: Optional[bool] = None


class TerritoryResponse(BaseModel):
    id: int
    name: str
    city: str
    province: str
    postal_code: Optional[str]
    radius_km: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TerritoryStats(TerritoryResponse):
    total_leads: int = 0
    new_leads: int = 0
    avg_score: float = 0.0
    high_potential: int = 0


@router.get("", response_model=list[TerritoryStats])
async def list_territories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active territories with lead stats."""
    stmt = select(Territory).where(Territory.is_active == True).order_by(Territory.name.asc())
    result = await db.execute(stmt)
    territories = result.scalars().all()

    output = []
    for t in territories:
        count_stmt = select(func.count(Lead.id)).where(Lead.territory_id == t.id)
        total = (await db.execute(count_stmt)).scalar() or 0

        new_stmt = select(func.count(Lead.id)).where(
            Lead.territory_id == t.id, Lead.status == "new"
        )
        new_count = (await db.execute(new_stmt)).scalar() or 0

        avg_stmt = select(func.coalesce(func.avg(Lead.hvac_score), 0)).where(
            Lead.territory_id == t.id
        )
        avg = float((await db.execute(avg_stmt)).scalar() or 0)

        high_stmt = select(func.count(Lead.id)).where(
            Lead.territory_id == t.id, Lead.hvac_score >= 70
        )
        high = (await db.execute(high_stmt)).scalar() or 0

        output.append(TerritoryStats(
            id=t.id, name=t.name, city=t.city, province=t.province,
            postal_code=t.postal_code, radius_km=t.radius_km,
            is_active=t.is_active, created_at=t.created_at, updated_at=t.updated_at,
            total_leads=total, new_leads=new_count, avg_score=round(avg, 1),
            high_potential=high,
        ))
    return output


@router.post("", response_model=TerritoryResponse, status_code=201)
async def create_territory(
    data: TerritoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new territory."""
    territory = Territory(
        name=data.name,
        city=data.city,
        province=data.province,
        postal_code=data.postal_code,
        radius_km=data.radius_km,
    )
    db.add(territory)
    await db.flush()
    await db.refresh(territory)
    return territory


@router.get("/{territory_id}", response_model=TerritoryStats)
async def get_territory(
    territory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get territory with lead summary stats."""
    result = await db.execute(select(Territory).where(Territory.id == territory_id))
    territory = result.scalar_one_or_none()
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")

    # Lead stats
    count_stmt = select(func.count(Lead.id)).where(Lead.territory_id == territory_id)
    total_result = await db.execute(count_stmt)
    total_leads = total_result.scalar() or 0

    new_stmt = select(func.count(Lead.id)).where(
        Lead.territory_id == territory_id, Lead.status == "new"
    )
    new_result = await db.execute(new_stmt)
    new_leads = new_result.scalar() or 0

    avg_stmt = select(func.coalesce(func.avg(Lead.hvac_score), 0)).where(
        Lead.territory_id == territory_id
    )
    avg_result = await db.execute(avg_stmt)
    avg_score = float(avg_result.scalar() or 0)

    high_stmt = select(func.count(Lead.id)).where(
        Lead.territory_id == territory_id, Lead.hvac_score >= 70
    )
    high_result = await db.execute(high_stmt)
    high_potential = high_result.scalar() or 0

    return TerritoryStats(
        id=territory.id,
        name=territory.name,
        city=territory.city,
        province=territory.province,
        postal_code=territory.postal_code,
        radius_km=territory.radius_km,
        is_active=territory.is_active,
        created_at=territory.created_at,
        updated_at=territory.updated_at,
        total_leads=total_leads,
        new_leads=new_leads,
        avg_score=round(avg_score, 1),
        high_potential=high_potential,
    )


@router.patch("/{territory_id}", response_model=TerritoryResponse)
async def update_territory(
    territory_id: int,
    data: TerritoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a territory."""
    result = await db.execute(select(Territory).where(Territory.id == territory_id))
    territory = result.scalar_one_or_none()
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(territory, field, value)

    await db.flush()
    await db.refresh(territory)
    return territory




@router.post("/{territory_id}/ingest")
async def ingest_territory(
    territory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run ingestion pipeline for a territory to find new leads."""
    from app.services.ingestor import run_ingestion_for_territory

    result = await db.execute(select(Territory).where(Territory.id == territory_id))
    territory = result.scalar_one_or_none()
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")

    ingestion_result = await run_ingestion_for_territory(db, territory)
    await db.commit()

    return {
        "detail": f"Ingestion complete for {territory.name}",
        "new_leads": ingestion_result["new_leads"],
        "sources": ingestion_result["sources"],
    }


@router.delete("/{territory_id}")
async def delete_territory(
    territory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a territory (set is_active=False)."""
    result = await db.execute(select(Territory).where(Territory.id == territory_id))
    territory = result.scalar_one_or_none()
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")

    territory.is_active = False
    await db.flush()
    return {"detail": "Territory deactivated", "id": territory_id}
