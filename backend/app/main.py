from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.api.territories import router as territories_router
from app.api.leads import router as leads_router
from app.api.briefs import router as briefs_router
from app.api.settings import router as settings_router
from app.api.auth import router as auth_router
from app.api.kanban import router as kanban_router
from app.api.imports import router as imports_router
from app.api.imported_kanban import router as imported_kanban_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    yield


app = FastAPI(
    title="Growth Radar — API",
    description="""**Commercial HVAC lead intelligence platform.**

Scans Canadian business registries & municipal open data, scores prospects (0–100), imports enriched leads from LeadScraper, and generates AI-powered daily briefs.

### Core Features
- **Leads — Permits** — Municipal permit leads with HVAC scoring
- **Leads — Imported** — Batch-imported enriched leads from LeadScraper or CSV
- **Kanban — Permits** — Drag & drop pipeline (new → contacted → qualified → converted → dismissed)
- **Kanban — Imported** — Same kanban for imported leads
- **Daily Briefs** — AI-generated scan summaries (auto or manual trigger)
- **Territories** — Geographic scan areas (city, province, radius)
- **Auth** — JWT-based login (admin@growthradar.dev / admin123)
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(territories_router)
app.include_router(leads_router)
app.include_router(briefs_router)
app.include_router(settings_router)
app.include_router(auth_router)
app.include_router(kanban_router)
app.include_router(imports_router)
app.include_router(imported_kanban_router)


@app.get("/", summary="API root with app info")
async def root():
    """Return basic application metadata.

    Returns the app name and current version. Useful for
    verifying the API is reachable before making other calls.
    """
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/api/health", summary="Health check endpoint")
async def health_check():
    """Perform a health check on the API.

    Confirms the service is running and returns the app
    name, version, and a healthy status indicator.
    """
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
