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
from app.services.enrichment import enrich_lead_contact
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
    # Core service providers (Boss's clients)
    "hvac": 95, "heating": 95, "cooling": 90, "ventilation": 90, "furnace": 95,
    "air condition": 95, "ac repair": 95, "refrigeration": 85,
    "roofing": 95, "roof repair": 90, "roofer": 90, "roofing contractor": 90,
    "electrical": 85, "electrician": 90, "electrical contractor": 85,
    "plumbing": 85, "plumber": 90, "plumbing contractor": 85, "drain": 75,
    "mechanical": 80, "mechanical contractor": 80,
    "contractor": 65, "general contractor": 65, "renovation": 60,
    "construction": 60, "building contractor": 65,
    # Commercial properties needing service contracts
    "restaurant": 90, "cafe": 85, "bakery": 80, "kitchen": 90,
    "brewery": 85, "distillery": 80, "catering": 75,
    "hotel": 85, "motel": 80, "inn": 75, "hospitality": 75,
    "warehouse": 75, "logistics": 70, "storage": 60,
    "manufacturing": 80, "factory": 80, "industrial": 75,
    "gym": 70, "fitness": 70, "wellness": 55,
    "grocery": 70, "supermarket": 70, "market": 50,
    "school": 60, "college": 65, "daycare": 55,
    "clinic": 60, "medical": 65, "dental": 55, "pharmacy": 60,
    "office": 50, "retail": 45, "store": 40,
    "food": 80, "meal": 75, "lunch": 70,
    "laundry": 50, "cleaning": 45,
    "auto": 55, "repair": 50, "garage": 50, "auto repair": 55,
    "theatre": 60, "cinema": 60, "entertainment": 55,
    "church": 50, "temple": 50, "worship": 50,
    "lawn": 50, "garden": 45, "landscaping": 50,
    "childcare": 55, "preschool": 55,
    "dentist": 55, "optician": 50, "chiropractor": 50,
    # Related trades
    "drywall": 60, "painting": 50, "flooring": 50, "carpentry": 55,
    "paving": 55, "concrete": 55, "masonry": 55, "fencing": 45,
    "snow removal": 60, "landscaping": 50, "property maintenance": 55,
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
    leads: list[Lead] = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Query for recently issued licences with HVAC-relevant types
            # We get a broad set and filter client-side for accuracy
            params = {
                "limit": 100,
                "where": "status = 'Issued'",
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
                licence_fee = record.get("feepaid")
                num_employees = record.get("numberofemployees")

                # Check HVAC potential
                has_potential, hvac_score, score_reason = _has_hvac_potential(
                    full_type, business_name
                )

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
                    licence_fee=licence_fee,
                    num_employees=num_employees,
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


COQUITLAM_API = "https://services2.arcgis.com/Q6Lq3evZUGfPrN7o/arcgis/rest/services/Business_Licenses/FeatureServer/0/query"


async def ingest_coquitlam_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business licences from Coquitlam Open Data ArcGIS API.

    Coquitlam dataset has phone + email fields — no enrichment needed.
    """
    import httpx

    leads: list[Lead] = []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            where = "U_STATUSCODEDESC = 'Issued'"
            params = {
                "where": where,
                "outFields": "COLBUSINESSNAME,COL_BUSINESSADDR,COL_BUSINESSPHONE,EMAILADDRESS,U_SUBCODEDESC,ISSUEDATE,LAT,LONG",
                "returnGeometry": "false",
                "f": "json",
                "resultRecordCount": 2000,
                "orderByFields": "ISSUEDATE DESC",
            }

            response = await client.get(COQUITLAM_API, params=params)

            if response.status_code != 200:
                return []

            data = response.json()
            features = data.get("features", [])

            for feat in features:
                attrs = feat.get("attributes", {})
                business_name = (attrs.get("COLBUSINESSNAME") or "").strip()
                if not business_name:
                    continue

                business_type = (attrs.get("U_SUBCODEDESC") or "").strip()
                address = (attrs.get("COL_BUSINESSADDR") or "").strip()
                phone = (attrs.get("COL_BUSINESSPHONE") or "").strip()
                email = (attrs.get("EMAILADDRESS") or "").strip()

                # Check HVAC potential
                has_potential, hvac_score, score_reason = _has_hvac_potential(
                    business_type, business_name
                )

                if not has_potential:
                    continue

                notes_parts = []
                if email:
                    notes_parts.append(f"Email: {email}")
                notes = "; ".join(notes_parts) if notes_parts else None

                lead = Lead(
                    territory_id=territory.id,
                    business_name=business_name,
                    address=address or None,
                    city="Coquitlam",
                    province="BC",
                    phone=phone or None,
                    website=None,
                    business_type=business_type or None,
                    hvac_score=hvac_score,
                    score_reason=score_reason,
                    lead_source="coquitlam_open_data",
                    status="new",
                    notes=notes,
                )
                leads.append(lead)

    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass

    return leads


# ── TORONTO (CKAN) ───────────────────────────────────────────────────

async def ingest_toronto_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business licences from Toronto Open Data CKAN API."""
    import httpx
    leads: list[Lead] = []
    resource_id = "169e90ba-3ae0-43dd-8b2f-919e87002f50"
    url = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {"resource_id": resource_id, "limit": 100, "sort": "Issued desc"}
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return []
            data = response.json()
            records = data.get("result", {}).get("records", [])

            for r in records:
                name = r.get("Operating Name") or r.get("Client Name") or ""
                if not name:
                    continue
                btype = r.get("Category") or ""
                addr = " ".join(filter(None, [r.get(k) for k in ["Licence Address Line 1", "Licence Address Line 2", "Licence Address Line 3"]]))
                phone = r.get("Business Phone") or None
                status = "Cancelled" if r.get("Cancel Date") else "Active"
                has_potential, hvac_score, score_reason = _has_hvac_potential(btype, name)
                if not has_potential:
                    continue
                lead = Lead(
                    territory_id=territory.id,
                    business_name=name,
                    address=addr or None,
                    city="Toronto", province="ON",
                    phone=phone, business_type=btype or None,
                    hvac_score=hvac_score, score_reason=score_reason,
                    lead_source="toronto_open_data",
                    source_id=str(r.get("Licence No.", r.get("_id", ""))),
                    status="new",
                )
                leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── CALGARY (Socrata) ──────────────────────────────────────────────────

async def ingest_calgary_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business licences from Calgary Open Data Socrata API."""
    import httpx
    leads: list[Lead] = []
    url = "https://data.calgary.ca/resource/vdjc-pybd.json"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {"$limit": 100, "$order": "first_iss_dt DESC"}
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return []
            records = response.json()
            for r in records:
                name = r.get("tradename") or ""
                if not name:
                    continue
                btype = r.get("licencetypes") or ""
                has_potential, hvac_score, score_reason = _has_hvac_potential(btype, name)
                if not has_potential:
                    continue
                lead = Lead(
                    territory_id=territory.id,
                    business_name=name,
                    address=r.get("address") or None,
                    city="Calgary", province="AB",
                    business_type=btype or None,
                    hvac_score=hvac_score, score_reason=score_reason,
                    lead_source="calgary_open_data",
                    source_id=str(r.get("getbusid", "")),
                    status="new",
                )
                leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── EDMONTON (Socrata) ─────────────────────────────────────────────────

async def ingest_edmonton_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business licences from Edmonton Open Data Socrata API."""
    import httpx
    leads: list[Lead] = []
    url = "https://data.edmonton.ca/resource/qhi4-bdpu.json"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {"$limit": 100, "$order": "most_recent_issue_date DESC"}
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return []
            records = response.json()
            for r in records:
                name = r.get("business_name") or ""
                if not name:
                    continue
                btype = r.get("business_licence_category") or r.get("licencetype") or ""
                is_expired = bool(r.get("expiry_date")) and r["expiry_date"] < "2026-01-01"
                status = "Expired" if is_expired else "Active"
                has_potential, hvac_score, score_reason = _has_hvac_potential(btype, name)
                if not has_potential:
                    continue
                lead = Lead(
                    territory_id=territory.id,
                    business_name=name,
                    address=r.get("business_address") or None,
                    city="Edmonton", province="AB",
                    business_type=btype or None,
                    hvac_score=hvac_score, score_reason=score_reason,
                    lead_source="edmonton_open_data",
                    source_id=str(r.get("externalid", "")),
                    status="new",
                )
                leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── SURREY (ArcGIS) ────────────────────────────────────────────────────

async def ingest_surrey_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull business directory from Surrey Open Data ArcGIS API."""
    import httpx
    leads: list[Lead] = []
    url = "https://services5.arcgis.com/YRpe0VKTJytZSSIB/arcgis/rest/services/Business%20Licenses/FeatureServer/0/query"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            params = {
                "where": "1=1",
                "outFields": "BusinessName,Address,BusinessCategory,PostalCode,PhoneNumber",
                "returnGeometry": "false",
                "f": "json",
                "resultRecordCount": 200,
            }
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return []
            data = response.json()
            features = data.get("features", [])
            for feat in features:
                r = feat.get("attributes", {})
                name = (r.get("BusinessName") or "").strip()
                if not name:
                    continue
                btype = (r.get("BusinessCategory") or "").strip()
                phone = (r.get("PhoneNumber") or "").strip()
                has_potential, hvac_score, score_reason = _has_hvac_potential(btype, name)
                if not has_potential:
                    continue
                lead = Lead(
                    territory_id=territory.id,
                    business_name=name,
                    address=r.get("Address") or None,
                    city="Surrey", province="BC",
                    phone=phone or None,
                    postal_code=r.get("PostalCode") or None,
                    business_type=btype or None,
                    hvac_score=hvac_score, score_reason=score_reason,
                    lead_source="surrey_open_data",
                    status="new",
                )
                leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── FALLBACK: ISED Canada Federal Corporate Search ─────────────────────

async def ingest_ised_corporate_fallback(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Fallback: Search ISED Canada for HVAC-related corporations in the province.
    Used for cities without accessible open data APIs (Ottawa, Peel/Mississauga).
    """
    import httpx
    leads: list[Lead] = []
    ised_url = "https://ised-isde.canada.ca/api/opendata/corporations"
    province = territory.province or "ON"
    province_map = {"ON": "Ontario", "QC": "Quebec"}
    prov_full = province_map.get(province, province)
    keywords = ["HVAC", "HEATING", "AIR CONDITION", "VENTILATION", "FURNACE", "REFRIGERATION", "PLUMBING", "MECHANICAL", "INSTALLATION", "SERVICE"]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for kw in keywords:
                url = f"{ised_url}?query={kw}&jurisdiction={province}&limit=15&offset=0"
                response = await client.get(url, headers={"Accept": "application/json"})
                if response.status_code != 200:
                    continue
                data = response.json()
                results = data.get("results", []) if isinstance(data, dict) else data
                if not isinstance(results, list):
                    continue
                for r in results:
                    name = r.get("corporationName", "") or r.get("businessName", "")
                    if not name or len(name) < 3:
                        continue
                    city = r.get("city", "") or ""
                    addr = " ".join(filter(None, [r.get("addressLine1", ""), r.get("addressLine2", ""), city]))
                    has_potential, hvac_score, score_reason = _has_hvac_potential("Corporation", name)
                    if not has_potential:
                        continue
                    lead = Lead(
                        territory_id=territory.id,
                        business_name=name.strip(),
                        address=addr.strip() or None,
                        city=city.strip() or territory.city,
                        province=province,
                        business_type=f"HVAC/Mechanical Corporation",
                        hvac_score=hvac_score, score_reason=score_reason,
                        lead_source="ised_federal_fallback",
                        source_id=str(r.get("corporationNumber", "")),
                        status="new",
                    )
                    leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── MONTREAL (CKAN — Building Permits) ─────────────────────────────────

async def ingest_montreal_open_data(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Pull building permits from Montreal Open Data CKAN API.
    Uses permis-construction dataset (building/renovation/demolition permits).
    """
    import httpx
    leads: list[Lead] = []
    resource_id = "5232a72d-235a-48eb-ae20-bb9d501300ad"
    url = "https://donnees.montreal.ca/api/3/action/datastore_search"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {"resource_id": resource_id, "limit": 100, "sort": "date_emission desc"}
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return []
            data = response.json()
            if not data.get("success"):
                return []
            records = data.get("result", {}).get("records", [])
            for r in records:
                name = r.get("emplacement") or ""
                btype = r.get("description_type_demande") or ""
                nature = r.get("nature_travaux") or ""
                arr = r.get("arrondissement") or ""
                batiment = r.get("description_type_batiment") or ""
                # Use permit description as business name (Montreal doesn't have separate business name in permits)
                display_name = f"{batiment} — {btype}" if batiment else btype
                if not display_name:
                    continue
                has_potential, hvac_score, score_reason = _has_hvac_potential(btype + " " + nature, display_name)
                if not has_potential:
                    continue
                lead = Lead(
                    territory_id=territory.id,
                    business_name=display_name[:200],
                    address=r.get("emplacement") or None,
                    city=arr or "Montreal", province="QC",
                    business_type=f"Building Permit: {btype}",
                    hvac_score=hvac_score, score_reason=score_reason,
                    lead_source="montreal_permits",
                    source_id=str(r.get("id_permis", "")),
                    status="new",
                )
                leads.append(lead)
    except (httpx.RequestError, httpx.TimeoutException, ValueError):
        pass
    return leads


# ── DISPATCHER ──────────────────────────────────────────────────────────

async def ingest_municipal_permits(
    db: AsyncSession,
    territory: Territory,
) -> list[Lead]:
    """Ingest business data from municipal open data portals.

    Supports city-specific adapters:
    - Vancouver: Vancouver Open Data business licences API
    - Toronto: Toronto Open Data CKAN API
    - Calgary: Calgary Open Data Socrata API
    - Edmonton: Edmonton Open Data Socrata API
    - Surrey: Surrey Open Data ArcGIS API
    - Coquitlam: Coquitlam Open Data ArcGIS API
    - Mississauga/Brampton: Peel Region Socrata API
    - Ottawa: Ottawa Open Data CKAN API
    - Montreal: Montreal Open Data portal
    - Burnaby/Richmond: Metro Vancouver (via Vancouver API or ArcGIS)
    """
    city_lower = (territory.city or "").lower()

    if "vancouver" in city_lower:
        return await ingest_vancouver_open_data(db, territory)

    if "toronto" in city_lower:
        return await ingest_toronto_open_data(db, territory)

    if "calgary" in city_lower:
        return await ingest_calgary_open_data(db, territory)

    if "edmonton" in city_lower:
        return await ingest_edmonton_open_data(db, territory)

    if "surrey" in city_lower:
        return await ingest_surrey_open_data(db, territory)

    if "coquitlam" in city_lower:
        return await ingest_coquitlam_open_data(db, territory)

    if "mississauga" in city_lower or "brampton" in city_lower or "peel" in city_lower:
        # Peel portal is a JS SPA with no public API. Fallback: ISED federal search via SEO scraping
        return await ingest_ised_corporate_fallback(db, territory)

    if "ottawa" in city_lower:
        # Ottawa moved to open.ottawa.ca (ArcGIS Hub). No business licence API found.
        return await ingest_ised_corporate_fallback(db, territory)

    if "montreal" in city_lower:
        return await ingest_montreal_open_data(db, territory)

    if "burnaby" in city_lower or "richmond" in city_lower:
        return await ingest_vancouver_open_data(db, territory)

    # Fallback for all other cities: ISED corporate registry
    # Gets HVAC/roofing/electrical/plumbing/etc companies registered in the province
    return await ingest_ised_corporate_fallback(db, territory)


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
    saved_leads: list[Lead] = []
    for lead in new_leads:
        pair = (lead.business_name, lead.city)
        if pair not in existing_pairs:
            db.add(lead)
            saved_count += 1
            existing_pairs.add(pair)
            saved_leads.append(lead)

    # Flush to get IDs for enrichment
    if saved_leads:
        await db.flush()

        # Skip enrichment during bulk ingestion
        # Contact info already available from open data (Coquitlam has phone/email)
        # Individual enrichment can be triggered later per lead
        pass

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
