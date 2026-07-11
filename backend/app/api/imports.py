"""
Import API — Fetches enriched groups from LeadScraper and stores them in SQLite.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.import_model import ImportBatch, ImportedLead


class CSVLead(BaseModel):
    businessName: str = ""
    city: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    rating: Optional[float] = None
    reviewCount: Optional[int] = None
    address: str = ""


class CSVImportRequest(BaseModel):
    leads: list[CSVLead]
    listName: str = "CSV Import"


LEAD_SCRAPER_API = "http://172.28.0.1:4002/api/enriched-groups"

router = APIRouter(prefix="/api/import", tags=["imports"])


def _to_camel(lead: ImportedLead) -> dict:
    return lead.to_dict()


def _batch_to_dict(batch: ImportBatch) -> dict:
    return {
        "id": batch.id,
        "list_name": batch.list_name,
        "imported_at": batch.imported_at.isoformat() if batch.imported_at else "",
        "count": batch.count or 0,
    }


@router.get("/list", summary="List all import batches")
async def list_imports(db: AsyncSession = Depends(get_db)):
    """List all import batches (without lead data).

    Returns every import batch ordered by import date descending.
    Each batch includes id, list name, timestamp, and lead count.
    Use the batch id to fetch detailed lead data via GET /import/{id}.
    """
    result = await db.execute(
        select(ImportBatch).order_by(ImportBatch.imported_at.desc())
    )
    batches = result.scalars().all()
    return {"imports": [_batch_to_dict(b) for b in batches]}


@router.get("/{import_id}", summary="Get import batch with its leads")
async def get_import(import_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single import batch with its full lead data.

    Returns the batch metadata plus every lead in the batch with
    enriched fields (phone, email, social links, categories, etc.).
    Raises 404 if the import batch does not exist.
    """
    result = await db.execute(
        select(ImportBatch).where(ImportBatch.id == import_id)
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Import not found")

    leads_result = await db.execute(
        select(ImportedLead)
        .where(ImportedLead.batch_id == import_id)
        .order_by(ImportedLead.idx)
    )
    leads = leads_result.scalars().all()

    return {
        "batch": {
            **_batch_to_dict(batch),
            "leads": [_to_camel(l) for l in leads],
        }
    }


@router.post("/run", summary="Import all groups from LeadScraper API")
async def run_import(db: AsyncSession = Depends(get_db)):
    """Fetch all enriched groups from the LeadScraper API and store them.

    Calls the LeadScraper service at /api/enriched-groups, creates
    an import batch per group, and stores every enriched lead with
    its full metadata (business info, social links, categories, etc.).
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(LEAD_SCRAPER_API)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from LeadScraper: {e}")

    groups = data.get("groups", data if isinstance(data, list) else [])
    if isinstance(groups, list):
        pass
    elif isinstance(groups, dict):
        groups = [groups]
    else:
        groups = []

    if not groups:
        return {"imported": 0, "message": "No groups found"}

    results = []
    for group in groups:
        batch = ImportBatch(
            id=uuid.uuid4().hex[:10],
            list_name=group.get("listName", "Unknown"),
            imported_at=datetime.utcnow(),
            count=0,
        )
        db.add(batch)
        await db.flush()

        group_leads = group.get("leads", [])
        for i, lead in enumerate(group_leads):
            sources = lead.get("sources", [])
            categories = lead.get("categories", [])
            social_links = lead.get("socialLinks", {})

            db_lead = ImportedLead(
                batch_id=batch.id,
                idx=i,
                business_name=lead.get("businessName", lead.get("business_name", "")),
                normalized_name=lead.get("normalizedName", lead.get("normalized_name", "")),
                address=lead.get("address", ""),
                city=lead.get("city", ""),
                country=lead.get("country", ""),
                website=lead.get("website", ""),
                rating=lead.get("rating"),
                review_count=lead.get("reviewCount", lead.get("review_count")),
                phone=lead.get("phone", ""),
                email=lead.get("email", ""),
                enriched_phone=lead.get("enrichedPhone", lead.get("enriched_phone", "")),
                enriched_email=lead.get("enrichedEmail", lead.get("enriched_email", "")),
                sources=json.dumps(sources) if sources else None,
                categories=json.dumps(categories) if categories else None,
                google_place_id=lead.get("googlePlaceId", ""),
                social_links=json.dumps(social_links) if social_links else None,
                enrichment_status=lead.get("enrichmentStatus", ""),
            )
            db.add(db_lead)

        batch.count = len(group_leads)
        results.append({"id": batch.id, "listName": group["listName"], "count": len(group_leads)})

    await db.commit()

    return {
        "imported": len(results),
        "totalLeads": sum(r["count"] for r in results),
        "results": results,
    }


@router.post("/csv", summary="Import leads from CSV data")
async def import_csv(data: CSVImportRequest, db: AsyncSession = Depends(get_db)):
    """Import leads from raw CSV data submitted in the request body.

    Creates an import batch from the provided leads array with a
    custom list name. Each lead can include business name, city,
    phone, email, website, rating, review count, and address.
    """
    if not data.leads:
        raise HTTPException(status_code=400, detail="No leads provided")

    batch = ImportBatch(
        id=uuid.uuid4().hex[:10],
        list_name=data.listName,
        imported_at=datetime.utcnow(),
        count=0,
    )
    db.add(batch)
    await db.flush()

    for i, lead in enumerate(data.leads):
        csv_lead = data.leads[i]
        db_lead = ImportedLead(
            batch_id=batch.id,
            idx=i,
            business_name=csv_lead.businessName,
            city=csv_lead.city or "",
            phone=csv_lead.phone or "",
            email=csv_lead.email or "",
            website=csv_lead.website or "",
            rating=csv_lead.rating,
            address=csv_lead.address or "",
        )
        db.add(db_lead)

    batch.count = len(data.leads)
    await db.commit()

    return {"id": batch.id, "listName": data.listName, "count": len(data.leads)}


@router.delete("/{import_id}/lead/{lead_idx}", summary="Delete a single lead from a batch")
async def delete_lead(import_id: str, lead_idx: int, db: AsyncSession = Depends(get_db)):
    """Delete a single lead from an import batch by its index.

    Removes the lead at the given index within the batch and
    re-indexes remaining leads to maintain contiguous ordering.
    Updates the batch lead count accordingly.
    """
    result = await db.execute(
        select(ImportBatch).where(ImportBatch.id == import_id)
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    lead_result = await db.execute(
        select(ImportedLead)
        .where(ImportedLead.batch_id == import_id)
        .where(ImportedLead.idx == lead_idx)
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    business_name = lead.business_name
    await db.delete(lead)

    # Re-index remaining leads in this batch
    remaining = await db.execute(
        select(ImportedLead)
        .where(ImportedLead.batch_id == import_id)
        .order_by(ImportedLead.idx)
    )
    for new_idx, rem_lead in enumerate(remaining.scalars().all()):
        rem_lead.idx = new_idx

    # Update batch count
    total = await db.execute(
        select(func.count()).select_from(ImportedLead)
        .where(ImportedLead.batch_id == import_id)
    )
    batch.count = total.scalar()
    await db.commit()

    return {"deleted": True, "businessName": business_name or ""}


@router.delete("/{import_id}", summary="Delete an entire import batch")
async def delete_batch(import_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an entire import batch and all its leads.

    Removes the import batch record plus every lead associated
    with it from the database. This is a hard delete, not a
    soft-delete. Raises 404 if the batch does not exist.
    """
    result = await db.execute(
        select(ImportBatch).where(ImportBatch.id == import_id)
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    await db.delete(batch)
    await db.commit()

    return {"deleted": True, "listName": batch.list_name}
