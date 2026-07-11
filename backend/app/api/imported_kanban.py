"""Imported Kanban API — per-user status for imported leads, stored in DB."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.imported_kanban import ImportedKanbanStatus
from app.models.user import User
from app.api.auth import get_current_user


router = APIRouter(prefix="/api/kanban/imported", tags=["kanban"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/statuses", summary="Get all kanban statuses for imported leads (current user)")
async def get_imported_kanban_statuses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all per-user kanban statuses for imported leads.

    Returns a dict mapping lead_key → status for the current user.
    Used by the Kanban — Imported board to persist drag-and-drop positions.
    """
    result = await db.execute(
        select(ImportedKanbanStatus)
        .where(ImportedKanbanStatus.user_id == current_user.id)
    )
    statuses = result.scalars().all()
    return {s.lead_key: s.status for s in statuses}


@router.put("/statuses/{lead_key:path}", summary="Set kanban status for an imported lead")
async def set_imported_kanban_status(
    lead_key: str,
    data: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert kanban status for an imported lead.

    The lead_key is a composite key like 'batchId_idx'.
    Valid statuses: new, contacted, qualified, converted, dismissed.
    """
    valid = {"new", "contacted", "qualified", "converted", "dismissed"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(valid))}")

    # Upsert
    result = await db.execute(
        select(ImportedKanbanStatus).where(
            ImportedKanbanStatus.user_id == current_user.id,
            ImportedKanbanStatus.lead_key == lead_key,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.status = data.status
        entry.updated_at = datetime.utcnow()
    else:
        entry = ImportedKanbanStatus(
            user_id=current_user.id,
            lead_key=lead_key,
            status=data.status,
        )
        db.add(entry)

    await db.commit()
    return {"lead_key": lead_key, "status": data.status}
