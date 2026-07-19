# ClubOS — Calcutta AI Club

The club's collective memory + hype engine. A **member wall** (who's built what),
an **RSVP board** for sessions, and a **live demo-day scoreboard**.

Full spec docs live in [`docs/`](docs/): [`PRD.md`](docs/PRD.md), [`ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`SCHEMA.md`](docs/SCHEMA.md), [`API.md`](docs/API.md), [`BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## Stack

| Layer    | Tech                 | Host     |
|----------|----------------------|----------|
| Frontend | Next.js (App Router) | Vercel   |
| Backend  | FastAPI (Python)     | Render   |
| Database | Postgres             | Supabase |

Frontend talks **only** to the backend. Backend talks to Postgres.

## Repo layout

```
api/    FastAPI backend — all business rules + DB access
web/    Next.js frontend — plain, simple UI
docs/   Spec docs (PRD, architecture, schema, API, build plan)
```

## Quickstart (local dev)

**Database** — already provisioned on Supabase; schema is live (see `docs/SCHEMA.md`).

**Backend**
```
cd api
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # or .venv/bin/pip on mac/linux
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS
./.venv/Scripts/uvicorn app.main:app --reload      # or .venv/bin/uvicorn
```
Visit `http://localhost:8000/docs` for the interactive Swagger UI.

**Frontend**
```
cd web
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Visit `http://localhost:3000`.

## Deploy

See `docs/BUILD_PLAN.md` for the full Render + Vercel + Supabase deploy steps and
the pre-demo bug-sweep checklist. Not done yet — deploy is a separate step.
