# Growth Radar — Scorpio

**Commercial lead generation for HVAC businesses.** Scans Canadian public business registries and municipal open data portals, scores prospects by HVAC potential (0–100), and generates daily AI-powered briefs.

**URL:** [https://scorpio.87.106.124.206.nip.io](https://scorpio.87.106.124.206.nip.io)  
**Repo:** [github.com/Steve-reyes/growth-radar-scorpio](https://github.com/Steve-reyes/growth-radar-scorpio)

---

## Login

- JWT-based authentication
- **Default credentials:** admin@growthradar.dev / admin123

---

## Pages

### Dashboard
Stats overview — total leads, hot leads (score ≥ 70), average HVAC score, territory count.

### Territories
Create, edit, and delete geographic scan areas (city, province, radius). Each territory defines where to look for leads.

### Leads — Permits
Filterable table of municipal permit leads with HVAC scoring. Features:
- Search by business name
- City filter
- Min score slider
- Detail modal with Google search link

### Leads — Imported
Imported leads from LeadScraper API or CSV upload. Grouped by import lists/batches in collapsible sections. Features:
- Sortable table
- Per-lead 🗑️ delete
- Per-batch 🗑️ delete
- Batch filter dropdown, city filter, min score slider, search bar
- Detail modal
- **Public page** — no authentication required for viewing

### Kanban — Permits
Drag & drop kanban board for permit leads. Pipeline: new → contacted → qualified → converted → dismissed. Includes territory filter pills.

### Kanban — Imported
Same kanban layout for imported leads. Status saved to localStorage.

### Daily Brief
AI-generated daily scan summaries showing top leads, scores, and territory activity.

### Settings
App configuration — API keys, runtime settings, and admin controls.

---

## Backend

| Layer | Tech |
|-------|------|
| Framework | FastAPI (Python) |
| Database | SQLite |
| Container | Docker |

**Database tables:** users, territories, leads, daily_briefs, user_lead_status, import_batches, imported_leads

**Data sources:**
- ISED Canada — federal business registry
- City of Vancouver — municipal open data
- City of Coquitlam — municipal open data

**Key services:**
- **Ingestion** — pulls leads from ISED and municipal APIs per territory
- **HVAC Scoring** — heuristic engine that scores each lead 0–100 based on business type, industry keywords, and name keywords. Leads below score 20 are discarded.
- **Contact Enrichment** — uses Playwright (Chromium) to find phone numbers and emails via Yelp, Google Maps, and DuckDuckGo
- **AI Email Drafting** — generates outreach emails via OpenAI (gpt-4o-mini) when an API key is configured; template fallback otherwise

**Current data:** 12 import batches, 589 leads

---

## Infrastructure

- **Host:** Single VPS (IONOS, 1.8 GB RAM, Ubuntu)
- **Stack:** Docker Compose (backend) + nginx reverse proxy
- **Frontend:** Next.js 16 static export, Tailwind CSS v4, served by nginx
- **SSL:** Let's Encrypt via certbot
- **Daily scan:** Cron job triggers territory scan → scoring → brief generation

---

## Tech Stack

| Area | Stack |
|------|-------|
| Frontend | Next.js 16.2 (React 19), Tailwind CSS v4, TypeScript |
| Backend | Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0 async |
| Auth | PyJWT (HS256, 72h expiry), bcrypt |
| AI | OpenAI (gpt-4o-mini) for email drafting |
| Browser | Playwright (Chromium) for contact enrichment |
| Database | SQLite via aiosqlite |
| Infra | Docker Compose, nginx, Let's Encrypt |

---

## Getting Started

1. Clone the repo:  
   `git clone https://github.com/Steve-reyes/growth-radar-scorpio.git`
2. Copy `.env.example` to `.env` and fill in secrets
3. Start the backend: `docker compose up -d --build`
4. Build the frontend: `cd frontend && npm install && npm run build`
5. Serve the static output via nginx

---

*Internal tool — not open-sourced.*
