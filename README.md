# Growth Radar

**Commercial lead generation for HVAC businesses.** Scans Canadian public business registries and municipal open data portals, scores prospects by HVAC potential (0–100), and generates daily AI-powered briefs.

**Live:** [growth-radar.212.227.153.56.sslip.io](https://growth-radar.212.227.153.56.sslip.io)  
**Repo:** [github.com/Steve-reyes/growth-radar-scorpio](https://github.com/Steve-reyes/growth-radar-scorpio)

---

## Architecture

```
┌─────────────────────────┐      ┌─────────────────────┐
│     Frontend            │      │   Backend (FastAPI)  │
│  Next.js 16 (static)    │──────│   Docker container   │
│  Served by nginx        │ API  │   127.0.0.1:8000     │
│  /var/www/growth-radar  │      │                      │
└─────────────────────────┘      └──────────┬───────────┘
                                            │
                          ┌─────────────────┴──────────────┐
                          │           SQLite                │
                          │    /app/data/growth_radar.db    │
                          └────────────────────────────────┘
```

- **Single VPS** (1.8 GB RAM, Ubuntu, IONOS)
- **nginx** terminates SSL and serves the static frontend, proxying `/api/*` to the backend
- **Backend** runs as a single Docker container behind `127.0.0.1:8000`
- **Database** is SQLite file stored on a Docker volume
- **Daily cron** at 6:00 AM via Hermes Agent triggers territory scan → scoring → brief generation

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Runtime | Python 3.11 (containerised) |
| Web framework | FastAPI 0.115 |
| ASGI server | Uvicorn 0.30 |
| ORM | SQLAlchemy 2.0 async + aiosqlite |
| Validation | Pydantic v2 / pydantic-settings |
| Auth | bcrypt (password hashing), PyJWT (HS256, 72h expiry) |
| HTTP client | httpx 0.27 |
| AI | openai (gpt-4o-mini for email drafting) |
| Browser automation | Playwright 1.48 (Chromium, for contact enrichment) |
| Scheduler | APScheduler 3.10 (in-process, for MVP) |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16.2.7 (React 19) |
| Styling | Tailwind CSS v4 (PostCSS) |
| Build | `next build` → static export (`output: "export"`) |
| Language | TypeScript 5 |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Reverse proxy | nginx (HTTP/2, TLS 1.2/1.3) |
| SSL | Let's Encrypt (certbot) |
| Containerisation | Docker Compose |
| Orchestration | Hermes Agent cron (daily 6 AM scan) |

---

## Data Sources

| Source | Type | API | Fields Available |
|--------|------|-----|-----------------|
| ISED Canada | Federal business registry | REST (Corporations Canada) | Name, address, NAICS, incorporation date |
| City of Vancouver | Municipal business licences | Open Data v2.1 (SODA) | Business name, type, fee, employee count, issue date |
| City of Coquitlam | Municipal business licences | ArcGIS FeatureServer | Business name, address, phone, email, subtype |
| City of Burnaby | Municipal business licences | _(adapter ready)_ | Similar schema |

Additional city adapters (Toronto, Calgary, Montreal) are stubbed for future implementation in `ingest_municipal_permits()`.

---

## Data Flow

### 1. Ingestion (`services/ingestor.py`)
Triggered per territory (daily cron or manual via `POST /api/briefs/generate`):

```
Territory (city, province, radius)
    │
    ├── ISED API ──→ `ingest_ised_new_businesses()`
    │   ┌─ Filter by NAICS codes (722, 493, 31-33, 721, etc.)
    │   └─ Deduplicate by (business_name, city)
    │
    ├── Municipal Permits ──→ `ingest_municipal_permits()`
    │   ├── Vancouver: REST API (last 30 days, issued licences)
    │   ├── Coquitlam: ArcGIS FeatureServer (all issued)
    │   └── Extensible per-city adapter pattern
    │
    └── Contact Enrichment ──→ `services/enrichment.py`
        ├── Yelp (Playwright, preferred, no consent wall)
        ├── Google Maps (Playwright, with GDPR consent handling)
        └── DuckDuckGo (httpx fallback)
```

### 2. Scoring (`services/scorer.py`)
Each lead is scored 0–100 using a tiered heuristic system:

1. **Exact business type match** against `HVAC_WEIGHTS` dict (e.g. `Restaurant → 90`)
2. **Partial type match** (substring in either direction)
3. **Industry keyword mapping** via `INDUSTRY_KEYWORDS` in `utils/canada.py`
4. **Name keyword heuristic** from `KEYWORD_HEURISTICS` (e.g. `"kitchen" → 80`)
5. **Default** 30 for unknown types

Leads scoring < 20 are discarded during ingestion.

### 3. Brief Generation (`services/outreach.py`)
```
Leads → sort by hvac_score DESC → top 5 as priority list
       → compute avg score, hot lead count (≥70)
       → generate text summary
       → store as DailyBrief in DB
       → return to API consumer
```

When `OPENAI_API_KEY` is set, email drafts use `gpt-4o-mini`; otherwise template-based fallback text is used.

---

## Database Schema

5 tables managed by SQLAlchemy 2.0 async:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Auth accounts | `email` (unique index), `hashed_password`, `role`, `is_active` |
| `territories` | Geographic scan targets | `city`, `province`, `radius_km`, `is_active` |
| `leads` | Business leads | `territory_id` (FK), `business_name`, `hvac_score`, `status`, `lead_source` |
| `daily_briefs` | AI-generated summaries | `territory_id` (FK), `summary` (text), `lead_count`, `delivered` |
| `user_lead_status` | Per-user kanban pipeline | `user_id`+`lead_id` (unique), `status` (new→contacted→qualified→converted→dismissed) |

---

## Project Structure

```
growth-radar/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, CORS, routers
│   │   ├── config.py            # Pydantic Settings (env-based)
│   │   ├── database.py          # SQLAlchemy async engine + session
│   │   ├── api/
│   │   │   ├── auth.py          # Register, login, me, user mgmt
│   │   │   ├── territories.py   # CRUD + stats per territory
│   │   │   ├── leads.py         # List, update, draft email, delete
│   │   │   ├── briefs.py        # List, latest, generate, detail
│   │   │   ├── kanban.py        # Per-user lead status (kanban board)
│   │   │   └── settings.py      # App settings + dashboard stats
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── territory.py
│   │   │   ├── lead.py
│   │   │   ├── daily_brief.py
│   │   │   └── user_lead_status.py
│   │   ├── services/
│   │   │   ├── ingestor.py      # ISED + municipal API ingestion pipelines
│   │   │   ├── scorer.py        # HVAC scoring heuristics
│   │   │   ├── enrichment.py    # Playwright-based contact enrichment
│   │   │   └── outreach.py      # Email drafting + brief summaries
│   │   └── utils/
│   │       ├── auth.py          # bcrypt hashing, JWT creation/decode
│   │       └── canada.py        # INDUSTRY_KEYWORDS mapping
│   └── data/                    # SQLite DB volume (Docker)
├── frontend/
│   ├── next.config.ts           # Static export config
│   ├── package.json             # Next.js 16.2, React 19, Tailwind v4
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root layout, AuthProvider + AppShell
│       │   ├── page.tsx         # Dashboard (stats overview)
│       │   ├── login/           # Login page
│       │   ├── territories/     # Territory list + detail
│       │   ├── leads/           # Lead browsing with filters
│       │   ├── kanban/          # Per-user kanban board
│       │   ├── briefs/          # Daily briefs list + detail
│       │   ├── settings/        # App settings view
│       │   └── docs/            # Documentation page
│       ├── lib/
│       │   ├── api.ts           # HTTP client (GET/POST/PATCH/DELETE)
│       │   ├── auth-context.tsx # React context for JWT auth
│       │   ├── auth-guard.tsx   # Route protection wrapper
│       │   └── types.ts         # TypeScript interfaces
│       └── app/globals.css      # Tailwind v4 base styles
├── nginx/
│   └── default.conf             # SSL termination + reverse proxy
├── scripts/                     # Utility scripts (empty, extensible)
├── docker-compose.yml
├── .env                         # Environment variables (not tracked)
└── .gitignore
```

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login → JWT token |
| GET | `/api/auth/me` | Yes | Current user info |
| GET | `/api/auth/users` | Admin | List all users |
| POST | `/api/auth/users` | Admin | Create user |
| GET | `/api/territories` | Yes | List territories with stats |
| POST | `/api/territories` | Yes | Create territory |
| GET | `/api/territories/{id}` | Yes | Territory detail + stats |
| PATCH | `/api/territories/{id}` | Yes | Update territory |
| DELETE | `/api/territories/{id}` | Yes | Deactivate territory |
| GET | `/api/leads` | Yes | List leads (filterable) |
| GET | `/api/leads/{id}` | Yes | Lead detail |
| PATCH | `/api/leads/{id}` | Yes | Update lead |
| POST | `/api/leads/{id}/draft` | Yes | Generate outreach email |
| DELETE | `/api/leads/{id}` | Yes | Dismiss lead |
| GET | `/api/kanban/leads` | Yes | All leads with per-user status |
| PATCH | `/api/kanban/leads/{id}` | Yes | Update kanban status |
| GET | `/api/briefs` | Yes | List recent briefs |
| GET | `/api/briefs/latest` | Yes | Most recent brief |
| GET | `/api/briefs/{id}` | Yes | Brief detail + leads |
| POST | `/api/briefs/generate` | Yes | Trigger scan + brief |
| GET | `/api/settings` | Yes | App config (keys masked) |
| POST | `/api/settings` | Yes | Update runtime settings |
| GET | `/api/settings/stats` | Yes | Dashboard aggregate stats |
| GET | `/api/health` | No | Health check |

---

## Deployment

### Prerequisites
- Ubuntu server with Docker + Docker Compose
- nginx with certbot (Let's Encrypt)
- Domain/SSL cert configured

### Steps

1. **Clone and configure**
   ```bash
   git clone https://github.com/Steve-reyes/growth-radar-scorpio.git
   cd growth-radar-scorpio
   cp .env.example .env   # Fill in secrets
   ```

2. **Build and start backend**
   ```bash
   docker compose up -d --build
   ```
   Backend starts on `127.0.0.1:8000`.

3. **Build frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   # Output goes to frontend/out/
   ```

4. **Deploy static files**
   ```bash
   sudo cp -r frontend/out/* /var/www/growth-radar/
   sudo chown -R www-data:www-data /var/www/growth-radar/
   ```

5. **Configure nginx**
   - Place `nginx/default.conf` in `/etc/nginx/sites-available/`
   - Ensure SSL cert paths are correct
   - `sudo nginx -t && sudo systemctl reload nginx`

6. **Set up daily cron** (Hermes Agent)
   ```bash
   hermes cron create \
     --schedule "0 6 * * *" \
     --prompt "Run daily Growth Radar scan: curl -X POST https://growth-radar.example.com/api/briefs/generate -H 'Authorization: Bearer <admin-token>'"
   ```

### Production Notes
- SQLite is adequate for single-user/small-team use. For multi-tenant scale, migrate to PostgreSQL.
- The frontend is statically exported — no SSR, no Node.js runtime needed in production.
- Playwright Chromium (~300 MB) is bundled in the Docker image for contact enrichment.
- JWT secret must be changed from the default in production.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./data/growth_radar.db` | SQLite path (inside container) |
| `OPENAI_API_KEY` | No | `""` | OpenAI key for AI email drafting + briefs. Without it, template fallbacks are used. |
| `ISED_API_BASE` | No | `https://api.ised-isde.canada.ca` | ISED Canada API base URL |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3001` | Comma-separated CORS origins |
| `JWT_SECRET` | No | `growth-radar-secret-change-in-production-2026` | HMAC key for JWT signing. **Change in production.** |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_EXPIRY_HOURS` | No | `72` | Token lifetime |

The `.env` file at the repo root is mounted read-only into the Docker container at `/app/.env`. Frontend uses `NEXT_PUBLIC_API_URL` (defaults to empty string, meaning same-origin `/api/...` requests proxied by nginx).

---

## Testing

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

Tests live in `backend/tests/` (coverage varies — see individual test files).

---

## License

Internal tool. Not open-sourced.
