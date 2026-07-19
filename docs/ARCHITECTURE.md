# ARCHITECTURE — Calcutta AI Club

Backend architecture and the API surface for the product described in `PRD.md`. The frontend
today runs as a self-contained prototype (in-memory state + AI through Next.js route
handlers); this document describes the **target** three-tier system the `ROADMAP.md` builds
toward, and how the prototype maps onto it.

## 1. System overview

Conventional 3-tier, plus an AI provider. The frontend talks **only** to the backend; the
backend is the only thing that touches the database or the Anthropic API — so the model key
never reaches the browser.

```
┌─────────────────────┐     HTTPS/JSON     ┌────────────────────┐   asyncpg/SQLAlchemy   ┌────────────────────┐
│  Next.js (Vercel)   │ ─────────────────► │  FastAPI (Render)  │ ─────────────────────► │ Postgres (Supabase)│
│  - The Club / wall  │ ◄───────────────── │  - REST API        │ ◄───────────────────── │  members, pitches, │
│  - Pitch Board      │                    │  - JWT auth        │                        │  comments, events… │
│  - Room Tonight     │  poll check-ins    │  - owns AI calls   │                        └────────────────────┘
└─────────────────────┘     (~2s)          │  - writes events   │
        ▲                                   └─────────┬──────────┘
   room's phones                                      │ HTTPS
   (QR onboarding + check-in)                         ▼
                                              ┌────────────────────┐
                                              │  Anthropic API      │
                                              │  claude-sonnet-4-6  │
                                              └────────────────────┘
```

### Prototype vs. target (what runs today)

| Concern | Prototype (today) | Target (roadmap) |
|---------|-------------------|------------------|
| State | React `useState`, in-memory | Postgres via FastAPI |
| Auth | Pick-a-name, in-memory session | Magic-link/OTP → JWT |
| AI key holder | Next.js route handlers (`web/app/api/*`) | FastAPI |
| Event log | comment in code | `events` table, one row per action |

The prototype's Next route handlers exist precisely so the frontend is runnable and secure
(key server-side) *before* the Python backend is wired. Phase 3 folds them into FastAPI.

## 2. The three AI surfaces

All three are single, stateless Claude calls over the member corpus. Each has a deterministic
fallback so a missing key or a provider error never breaks the UX.

| Surface | Prototype route | Target endpoint | Prompt does |
|---------|-----------------|-----------------|-------------|
| **Profile generation** | `POST /api/generate-profile` | `POST /members` (server-side) | five answers → `line`, `epithet`, `field`, `build_into`, `tags` |
| **Pitch matching** | `POST /api/match-pitch` | `POST /pitches` (server-side) | pitch + corpus → 2 best-matched members + one-line reasons |
| **Corpus Q&A** | `POST /api/ask-corpus` | `POST /corpus/ask` | question + corpus → a host-style introduction |

Model id: `claude-sonnet-4-6` (override with `ANTHROPIC_MODEL`). The key is
`ANTHROPIC_KEY` on the backend; in the prototype it is `ANTHROPIC_API_KEY` on the Next server
(never `NEXT_PUBLIC_*`). See `web/lib/anthropic.ts` for the client and fallback contract.

## 3. The append-only events spine

Feature tables hold current state; the `events` table holds history. Every write endpoint
performs its mutation **and** appends one `events` row in the same transaction. This is a
deliberate architectural choice, not bookkeeping: it means the ship-log, the activity feed,
the dream-collab heat map, and sponsor analytics are all *reads over one log* rather than new
subsystems. See `SCHEMA.md` for the row shape and event types, and `ROADMAP.md` phases 4–6
for what reads it.

## 4. Auth model

**Prototype (today):** pick-a-name. The `LoginModal` lists the roster; selecting a name sets
`currentUser` in memory. No passwords, no persistence. Correct for a self-contained stage
demo; ownership (edit only your own record) is enforced in the client since there is no
server yet.

**Target:** magic-link / OTP, minimal friction (name + phone).
- `POST /auth/request` generates a 6-digit code, stores only its **hash** in
  `auth_challenges`, and sends it.
- `POST /auth/verify` redeems the code (single-use, short TTL) and returns a JWT signed with
  `JWT_SECRET`, member id in `sub`.
- On every write, the member id comes from the **token**, never the request body. A member
  can mutate only their own record, pitches, and comments — enforced server-side.
- **Admin** actions (create a session) use a shared `X-Admin-Secret` header — the simplest
  secure-enough gate.

| Level | How |
|-------|-----|
| public | no header (read the wall, read pitches, ask the corpus) |
| member | `Authorization: Bearer <jwt>` (edit own record, post pitch/comment, check in) |
| admin | `X-Admin-Secret: <ADMIN_SECRET>` (create sessions) |

## 5. Two gotchas that can sink the live demo

### 5.1 Render free-tier cold start ⚠️
Free instances spin down after ~15 min idle and take ~50s to wake. If the backend is asleep
when someone onboards on stage, the "reading you" beat hangs.

**Mitigations (do all three):**
1. A free uptime pinger (UptimeRobot / cron-job.org) → `GET /health` every 10 min.
2. Manually hit `/health` ~3 min before presenting.
3. The onboarding + AI calls degrade to deterministic fallbacks, so a cold/absent backend
   still produces a card — it's just not as sharp.

### 5.2 RLS / anon-key footgun ⚠️
All DB access is server-side through FastAPI, so **Row Level Security is bypassed and not
required today**. The moment anyone exposes the Supabase **anon key** in the frontend (e.g.
to add Realtime for Room Tonight in Phase 7), an un-RLS'd database is world-readable *and
writable*. If you go that route: `enable row level security` on every table **first**, then
write policies. For now, keep the frontend talking only to FastAPI and this problem doesn't
exist.

## 6. CORS

FastAPI must allow the Vercel origin. Read allowed origins from an env var so preview deploys
don't break:

```python
CORS_ORIGINS = os.environ["CORS_ORIGINS"].split(",")  # "https://cac.vercel.app,http://localhost:3000"
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])
```

## 7. Environments & secrets

| Service | Env vars |
|---------|----------|
| Vercel (frontend) | `ANTHROPIC_API_KEY` (prototype AI edge, server-only), `ANTHROPIC_MODEL` (optional), `NEXT_PUBLIC_API_URL` (once the backend is wired) |
| Render (backend) | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `CORS_ORIGINS`, `ANTHROPIC_KEY`, `ANTHROPIC_MODEL` (optional) |
| Supabase | — (get `DATABASE_URL` from Project → Settings → Database; use the **pooled** connection, port 6543, for a serverless-friendly pool) |

## 8. API surface (summary)

Full request/response shapes are in `API.md`. Grouped by surface:

| Surface | Endpoints |
|---------|-----------|
| Auth | `POST /auth/request`, `POST /auth/verify`, `GET /me`, `PATCH /me` |
| Onboarding | `POST /members` (generates the card + returns a token) |
| Directory | `GET /members`, `GET /members/{id}` |
| Corpus chatbot | `POST /corpus/ask` |
| Pitch board | `GET /pitches`, `POST /pitches`, `POST /pitches/{id}/comments` |
| Dream collabs | `GET /dreams` |
| Room Tonight | `GET /sessions`, `POST /sessions` (admin), `POST /sessions/{id}/checkin`, `GET /sessions/{id}/checkins` |
| Ops | `GET /health` |

The **one write rule** across all of these: mutate the feature table and append an `events`
row in the same transaction (§3).

## 9. What we deliberately did NOT build (and why it's correct)

- **No websockets** — polling is simpler and enough at this scale; Room Tonight polls check-ins.
- **No message queue** — there are no async workflows; the AI calls are synchronous request/response.
- **No caching layer** — the corpus is tens of rows; a full read is sub-millisecond.
- **No separate auth service** — JWT issuance is a handful of lines in FastAPI.
- **No vector DB / embeddings** — with ~dozens of members, the whole corpus fits in one
  prompt. Revisit only when the directory is too large to inline (hundreds→thousands).

Scaling note: this design comfortably handles a single club (hundreds of members, tens of
concurrent users). Multi-club would add an `orgs` table and a tenant column per row.
