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
| AI       | Anthropic Claude (`claude-sonnet-4-6`) | via the backend |

The frontend talks **only** to the backend; the backend is the only thing that touches
Postgres or the Anthropic API, so the model key never reaches the browser.

## Repo layout

```
web/    Next.js frontend — the three surfaces, fetching everything from the backend
api/    FastAPI backend — implements the docs/API.md + SCHEMA.md contract against Supabase
docs/   Spec docs (PRD, roadmap, architecture, API, schema)
```

## Current state

**Frontend and backend are both built and wired together**, verified end-to-end locally:
onboarding persists a real member (survives a refresh), the directory/pitch board/corpus
chatbot all read and write through the backend, comments and profile edits round-trip to
Postgres, and every AI surface (card generation, pitch matching, corpus Q&A) runs server-side
in `api/`, degrading to deterministic logic when `ANTHROPIC_API_KEY` is unset.

Room Tonight is still the scripted check-in demo — live check-ins are `docs/ROADMAP.md` Phase
7, intentionally last. Real phone/OTP auth (currently: join once per browser, session restored
from a stored token) is Phase 2.

**Fully deployed and live**: frontend on Vercel (https://calcutta-ai-club.vercel.app),
backend on Render (https://calcutta-ai-club-website.onrender.com), both auto-deploying from
`main`. Verified end-to-end against production — the live directory, corpus chatbot, and
CORS between the two hosts all work.

## Quickstart

**Backend** (start this first — the frontend needs it):
```
cd api
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env           # DATABASE_URL, JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS, ANTHROPIC_API_KEY (optional)
./.venv/bin/uvicorn app.main:app --reload   # http://localhost:8000/docs
```

**Frontend**:
```
cd web
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                     # http://localhost:3000
```

## Deploy

Vercel (frontend) + Render (backend) + Supabase (Postgres). Run the DDL in
[`docs/SCHEMA.md`](docs/SCHEMA.md) in the Supabase SQL editor; environment variables are
listed in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §7.
