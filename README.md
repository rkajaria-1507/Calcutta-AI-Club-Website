# Calcutta AI Club

The club's collective memory and introduction engine. Three surfaces over one corpus: **The
Club** (a living member directory + a corpus chatbot), the **Pitch Board** (post an idea →
get matched people → discuss, plus a dream-collaboration map), and **Room Tonight** (a live
check-in wall). Newcomers onboard through a guided five-question flow that ends with the club
writing their member card back to them.

Spec docs live in [`docs/`](docs/): [`PRD.md`](docs/PRD.md), [`ROADMAP.md`](docs/ROADMAP.md),
[`ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`API.md`](docs/API.md), [`SCHEMA.md`](docs/SCHEMA.md).

## Stack

| Layer    | Tech                 | Host     |
|----------|----------------------|----------|
| Frontend | Next.js (App Router) | Vercel   |
| Backend  | FastAPI (Python)     | Render   |
| Database | Postgres             | Supabase |
| AI       | Anthropic Claude (`claude-sonnet-4-6`) | via the backend / Next server |

The frontend talks **only** to the backend; the backend is the only thing that touches
Postgres or the Anthropic API, so the model key never reaches the browser.

## Repo layout

```
web/    Next.js frontend — the three surfaces + server-side AI route handlers
api/    FastAPI backend — implements the docs/API.md + SCHEMA.md contract against Supabase
docs/   Spec docs (PRD, roadmap, architecture, API, schema)
```

## Current state

The **frontend is built and runnable today**, deployed at the Vercel production URL. State is
in-memory (a refresh resets it) and the three AI surfaces run through Next.js route handlers
(`web/app/api/*`) that hold the Anthropic key server-side. With no key set, every AI call
degrades to deterministic local logic — so it runs offline and a live demo never stalls.

The **backend + database are also built** — `api/` implements every endpoint in `docs/API.md`
against the schema in `docs/SCHEMA.md` (members with the five-question intake, pitches +
comments + AI matching, dream-collab aggregation, sessions/check-ins, and the append-only
`events` log), verified end-to-end against the live Supabase project. It is **not yet wired to
the frontend** — that swap (replace the `useState(SEED_*)` stores with fetches to
`NEXT_PUBLIC_API_URL`) plus real auth are the remaining `docs/ROADMAP.md` phase-1/2 work.

## Quickstart

**Frontend** (no backend or key required):
```
cd web
npm install
cp .env.example .env.local     # optional: set ANTHROPIC_API_KEY for real AI generation
npm run dev                     # http://localhost:3000
```
`ANTHROPIC_API_KEY` is read server-side only — never prefix it with `NEXT_PUBLIC_`.

**Backend**:
```
cd api
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env           # DATABASE_URL, JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS, ANTHROPIC_API_KEY (optional)
./.venv/bin/uvicorn app.main:app --reload   # http://localhost:8000/docs
```

## Deploy

Vercel (frontend) + Render (backend) + Supabase (Postgres). Run the DDL in
[`docs/SCHEMA.md`](docs/SCHEMA.md) in the Supabase SQL editor; environment variables are
listed in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §7.
