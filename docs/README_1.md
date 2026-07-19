# Calcutta AI Club — docs

The club's collective memory and introduction engine. Three surfaces over one corpus: **The
Club** (living directory + corpus chatbot), the **Pitch Board** (post → match → discuss +
dream collabs), and **Room Tonight** (live check-in wall). New members onboard through a
guided five-question flow that ends with the club writing their card back to them.

> **The test:** *can the software read a stranger and turn them into a legible member in
> under a minute, live?* Every scope decision is measured against that.

---

## The product in one data model

Feature tables hold current state; one append-only `events` table holds history — so the
club compounds (activity, the dream-collab heat map, sponsor analytics) without a new table
per feature.

```
members ──1:N── pitches ──1:N── comments
   │               └── suggested (AI match snapshot)
   ├──1:N── checkins ──N:1── sessions
   └──1:N── events   (append-only spine; member_id = actor)
```

- **members** — identity + the five intake answers + the AI-generated card
- **pitches** — an idea in three fields + the AI's suggested people
- **comments** — discussion under a pitch
- **sessions / checkins** — Room Tonight
- **events** — one row per action; the spine that makes everything compound

---

## Stack

| Layer     | Tech                 | Host     |
|-----------|----------------------|----------|
| Frontend  | Next.js (App Router) | Vercel   |
| Backend   | FastAPI (Python)     | Render   |
| Database  | Postgres             | Supabase |
| AI        | Anthropic Claude (`claude-sonnet-4-6`) | via backend / Next server |

The frontend talks **only** to the backend; the backend is the only thing that touches
Postgres or the Anthropic API — the model key never reaches the browser.

---

## Docs

| File | What it's for |
|------|----------------|
| `PRD.md` | What we're building, the five questions, and what we're *not* building |
| `ROADMAP.md` | Current state → deployed product, phase by phase |
| `ARCHITECTURE.md` | Backend architecture, the AI edge, auth, the events spine, the API summary |
| `API.md` | Every endpoint with request/response shapes and error cases |
| `SCHEMA.md` | Tables, the append-only log, constraints, indexes, paste-ready SQL |

## Quickstart

**Frontend** — runs standalone; AI degrades to deterministic fallbacks with no key set:

```
cd web
npm install
cp .env.example .env.local     # optional: set ANTHROPIC_API_KEY for real AI
npm run dev                     # http://localhost:3000
```

**Backend** — implements the schema/API above against Supabase; not yet wired to the frontend
(the frontend still runs in-memory — see `ROADMAP.md` for the remaining wiring step):

```
cd api
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt
cp .env.example .env            # DATABASE_URL, JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS
./.venv/Scripts/uvicorn app.main:app --reload   # http://localhost:8000/docs
```
