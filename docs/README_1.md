# ClubOS — Calcutta AI Club

The club's collective memory + hype engine. A **member wall** (who's built what),
an **RSVP board** for sessions, and a **live demo-day scoreboard**.

> **Judge test:** *would we actually use it at the next session?*
> Every scope decision in these docs is measured against that question.

---

## The whole product in 5 tables

Everything in this app is a view or a join over these five entities. If a proposed
feature needs a *sixth* table (messages, notifications, comments), it is **out of scope for v1**.
Use that as your razor when someone pitches an addition at hour two.

```
members ──< projects >── sessions
   │            │            │
   └──< votes >─┘            │
   └──< rsvps >──────────────┘
```

- **members** — lightweight identity (name, avatar, tagline, "building now")
- **projects** — the atomic unit of the wall ("I built X")
- **sessions** — a club meetup; RSVP + demo-day attach here
- **rsvps** — member × session (going / maybe / no)
- **votes** — voter × project (one per person, enforced in DB)

---

## Stack

| Layer     | Tech                     | Host   |
|-----------|--------------------------|--------|
| Frontend  | Next.js (App Router)     | Vercel |
| Backend   | FastAPI (Python)         | Render |
| Database  | Postgres                 | Supabase |

Frontend talks **only** to the backend. Backend talks to Postgres. No new services required.

---

## Docs

| File | What it's for |
|------|----------------|
| `PRD.md` | What we're building and, more importantly, what we're *not* |
| `ARCHITECTURE.md` | System design, stack rationale, the two gotchas that can sink the demo |
| `SCHEMA.md` | Tables, constraints, indexes, paste-ready SQL |
| `API.md` | Every endpoint with request/response shapes and error cases |
| `BUILD_PLAN.md` | Hour-by-hour timeline, team split, deploy steps, demo script |

## Quickstart

1. Run `SCHEMA.md`'s DDL in the Supabase SQL editor.
2. Backend: `pip install -r requirements.txt` → set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `CORS_ORIGINS` → `uvicorn app.main:app`.
3. Frontend: set `NEXT_PUBLIC_API_URL` → `npm run dev`.
4. Deploy: push to GitHub → Render (backend) + Vercel (frontend) auto-build. See `BUILD_PLAN.md`.
