"""Data ingestion service for Growth Radar.

Ingests business data from Canadian public sources (ISED API, municipal open data)
and creates Lead records scored by HVAC potential.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.territory import Territory
from app.models.lead import Lead
from app.services.scorer import score_business
from app.config import settings


# NAICS codes relevant to HVAC opportunities
TARGET_NAICS_CODES = [
    "722",  # Food Services and Drinking Places
    "493",  # Warehousing and Storage
    "31", "32", "33",  # Manufacturing
    "721",  # Accommodation (Hotels, Motels)
    "452",  # General Merchandise Stores (Retail large format)
    "445",  # Food and Beverage Stores (Grocery)
    "611",  # Educational Services
    "621",  # Ambulatory Health Care Services
    "713",  # Amusement, Gambling and Recreation (Gyms)
    "712",  # Heritage Institutions (Museums, Zoos)
    "624",  # Social Assistance (Daycare)
]


async def ingest_ised_new_businesses(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Query ISED API for recently incorporated businesses in the territory.

    Filters by relevant NAICS codes for HVAC opportunities.
    Returns list of unsaved Lead objects.
    """
    import httpx

    base_url = settings.ISED_API_BASE.rstrip("/")
    leads: list[Lead] = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # ISED API endpoint for federal corporation search
            # Using the Corporations Canada API
            url = f"{base_url}/corporations/v1/search"

            params = {
                "query": territory.city,
                "province": territory.province,
                "limit": 50,
                "offset": 0,
                "status": "active",
            }

            response = await client.get(url, params=params)

            if response.status_code == 429:
                # Rate limited — return empty gracefully
                return []

            if response.status_code != 200:
                return []

            data = response.json()
            corporations = data.get("results", data.get("corporations", []))

            for corp in corporations[:30]:
                corp_name = corp.get("name", corp.get("corporationName", ""))
                if not corp_name:
                    continue

                # Try to determine business type from name
                business_type = _infer_business_type(corp_name)

                # Score the lead
                hvac_score, score_reason = score_business(
                    business_type=business_type,
                    business_name=corp_name,
                )

                # Skip very low scores
                if hvac_score < 20:
                    continue

                lead = Lead(
                    territory_id=territory.id,
                    business_name=corp_name,
                    address=corp.get("address", ""),
                    city=territory.city,
                    province=territory.province,
                    postal_code=corp.get("postalCode", ""),
                    business_type=business_type,
                    hvac_score=hvac_score,
                    score_reason=score_reason,
                    lead_source="ised_api",
                    source_id=str(corp.get("corporationNumber", "")),
                    status="new",
                )
                leads.append(lead)

    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        # Network error or parse error — return gracefully
        pass

    return leads


VANCOUVER_API_BASE = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/business-licences/records"

# Business types that indicate HVAC-heavy commercial buildings
HIGH_HVAC_BUSINESS_TYPES = [
    "Restaurant", "Food Service", "Bar", "Pub", "Brewery", "Caterer",
    "Hotel", "Motel",
    "Grocery", "Supermarket",
    "Warehouse", "Logistics",
    "Manufacturing", "Industrial",
    "Gym", "Fitness Centre",
    "School", "College", "University",
    "Hospital", "Medical Clinic", "Dental Clinic",
    "Daycare",
]

HOT_HVAC_KEYWORDS = {
    "restaurant": 90, "cafe": 85, "bakery": 80, "kitchen": 90,
    "brewery": 85, "distillery": 80, "catering": 75,
    "hotel": 85, "motel": 80, "inn": 75,
    "warehouse": 75, "logistics": 70, "storage": 60,
    "manufacturing": 80, "factory": 80, "industrial": 75,
    "gym": 70, "fitness": 70, "wellness": 55,
    "grocery": 70, "supermarket": 70, "market": 50,
    "school": 60, "college": 65, "daycare": 55,
    "clinic": 60, "medical": 65, "dental": 55, "pharmacy": 60,
    "office": 50, "retail": 45, "store": 40,
}


def _has_hvac_potential(business_type: str, business_name: str) -> tuple[bool, int, str]:
    """Check if a business has HVAC potential based on type and name.

    Returns (has_potential, score, reason).
    """
    lower_type = (business_type or "").lower()
    lower_name = (business_name or "").lower()

    # Check business type for direct matches
    for kw, score in HOT_HVAC_KEYWORDS.items():
        if kw in lower_type:
            return True, score, f"Business type '{business_type}' matches '{kw}'"

    # Check business name for keyword matches
    for kw, score in HOT_HVAC_KEYWORDS.items():
        if kw in lower_name:
            return True, score, f"Business name matches '{kw}'"

    return False, 30, "General commercial — low HVAC priority"


async def ingest_vancouver_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business licences from Vancouver Open Data API.

    Queries the City of Vancouver's business licences dataset for
    recently issued licences in HVAC-relevant categories.
    """
    import httpx
    from datetime import datetime, timedelta, timezone

    leads: list[Lead] = []
    since_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Query for recently issued licences with HVAC-relevant types
            # We get a broad set and filter client-side for accuracy
            params = {
                "limit": 100,
                "where": f"issueddate >= '{since_date}' AND status = 'Issued'",
                "order_by": "issueddate DESC",
            }

            response = await client.get(VANCOUVER_API_BASE, params=params)

            if response.status_code != 200:
                return []

            data = response.json()
            records = data.get("results", [])

            for record in records:
                business_name = (
                    record.get("businesstradename")
                    or record.get("businessname")
                    or ""
                )
                if not business_name:
                    continue

                business_type = record.get("businesstype", "") or ""
                business_subtype = record.get("businesssubtype", "") or ""
                full_type = f"{business_type} {business_subtype}".strip()

                # Check HVAC potential
                has_potential, hvac_score, score_reason = _has_hvac_potential(
                    full_type, business_name
                )

                # Always include trade contractors or general businesses with HVAC keywords in name
                if not has_potential and "trade" not in business_type.lower():
                    continue

                # Build address from components
                house = record.get("house") or ""
                street = record.get("street") or ""
                address = f"{house} {street}".strip() or None

                lead = Lead(
                    territory_id=territory.id,
                    business_name=business_name,
                    address=address,
                    city=record.get("city") or territory.city,
                    province=record.get("province") or territory.province,
                    postal_code=record.get("postalcode"),
                    phone=None,
                    website=None,
                    business_type=full_type or None,
                    hvac_score=hvac_score,
                    score_reason=score_reason,
                    lead_source="vancouver_open_data",
                    source_id=record.get("licencenumber"),
                    status="new",
                    notes=f"Licence: {record.get('licencenumber', '?')}, Local area: {record.get('localarea', '?')}",
                )
                leads.append(lead)

    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass

    return leads


async def ingest_municipal_permits(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Ingest business data from municipal open data portals.

    Supports city-specific adapters:
    - Vancouver: Vancouver Open Data business licences API
    - Toronto: Toronto Open Data (future)
    - Calgary: Calgary Open Data (future)
    - Montreal: Montreal Open Data (future)
    """
    city_lower = (territory.city or "").lower()

    if "vancouver" in city_lower:
        return await ingest_vancouver_open_data(db, territory)

    return []


async def run_ingestion_for_territory(
    db: AsyncSession,
    territory: Territory,
) -> dict:
    """Run all ingestion pipelines for a territory.

    Returns a dict with new_leads count and sources used.
    """
    new_leads: list[Lead] = []
    sources: list[str] = []

    # 1. ISED API
    ised_leads = await ingest_ised_new_businesses(db, territory)
    if ised_leads:
        sources.append("ised_api")
        new_leads.extend(ised_leads)

    # 2. Municipal permits (placeholder)
    municipal_leads = await ingest_municipal_permits(db, territory)
    if municipal_leads:
        sources.append("municipal_permit")
        new_leads.extend(municipal_leads)

    # Deduplicate by business_name + city before saving
    existing = await db.execute(
        select(Lead.business_name, Lead.city).where(Lead.territory_id == territory.id)
    )
    existing_pairs = {(r.business_name, r.city) for r in existing}

    saved_count = 0
    for lead in new_leads:
        pair = (lead.business_name, lead.city)
        if pair not in existing_pairs:
            db.add(lead)
            saved_count += 1
            existing_pairs.add(pair)

    return {
        "new_leads": saved_count,
        "sources": sources,
    }


def _infer_business_type(name: str) -> str:
    """Infer business type from corporation name using keywords."""
    from app.utils.canada import INDUSTRY_KEYWORDS

    lower_name = name.lower()

    # Check for restaurant/food keywords
    food_keywords = [
        "restaurant", "cafe", "bakery", "bistro", "grill", "kitchen",
        "pizzeria", "diner", "catering", "food", "brew", "deli",
    ]
    for kw in food_keywords:
        if kw in lower_name:
            return "Restaurant"

    # Check warehouse/logistics
    if any(kw in lower_name for kw in ["warehouse", "logistics", "distribution", "storage"]):
        return "Warehouse"

    # Check manufacturing
    if any(kw in lower_name for kw in ["manufacturing", "factory", "industrial", "production"]):
        return "Manufacturing"

    # Check hotel/hospitality
    if any(kw in lower_name for kw in ["hotel", "motel", "inn", "hospitality", "resort"]):
        return "Hotel"

    # Check retail
    if any(kw in lower_name for kw in ["retail", "store", "shop", "boutique", "market"]):
        return "Retail"

    # Check office/professional services
    if any(kw in lower_name for kw in ["office", "consulting", "professional", "services", "solutions"]):
        return "Office"

    # Check medical
    if any(kw in lower_name for kw in ["clinic", "medical", "dental", "health", "pharmacy"]):
        return "Medical"

    # Check education
    if any(kw in lower_name for kw in ["school", "academy", "college", "education", "learning", "daycare"]):
        return "School"

    # Check gym/fitness
    if any(kw in lower_name for kw in ["gym", "fitness", "wellness", "yoga"]):
        return "Gym"

    # Check grocery
    if any(kw in lower_name for kw in ["grocery", "supermarket", "market"]):
        return "Grocery"

    # Check general INDUSTRY_KEYWORDS
    for keyword, mapped_type in INDUSTRY_KEYWORDS.items():
        if keyword in lower_name:
            return mapped_type

    return ""
