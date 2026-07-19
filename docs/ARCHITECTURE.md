# ARCHITECTURE — ClubOS

## 1. System overview

Conventional 3-tier. The frontend talks **only** to the backend; the backend is the
only thing that touches the database.

```
┌────────────────────┐      HTTPS/JSON      ┌────────────────────┐   asyncpg/SQLAlchemy   ┌──────────────────┐
│   Next.js (Vercel) │ ───────────────────► │  FastAPI (Render)  │ ─────────────────────► │ Postgres (Supabase)│
│  - member wall     │ ◄─────────────────── │  - REST API        │ ◄───────────────────── │  - 5 core tables   │
│  - RSVP board      │   poll leaderboard   │  - JWT auth        │                        │                  │
│  - scoreboard (2s) │      every 2s        │  - vote integrity  │                        └──────────────────┘
└────────────────────┘                      └────────────────────┘
        ▲                                            ▲
        │ QR join                                    │ /health  ◄──── UptimeRobot ping (keep warm)
   room's phones                                     └──────── admin ops via X-Admin-Secret
```

## 2. Stack decisions & rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Frontend | Next.js on Vercel | Zero-config deploy, fast; team can generate UI with AI tools |
| Backend | FastAPI on Render | Plays to the dev's strength; fast to write; owns all business rules |
| DB | Postgres on Supabase | Managed Postgres, instant SQL editor, no migration tooling needed today |
| DB access | SQLAlchemy async **or** raw asyncpg | Full control over constraints/transactions (needed for vote integrity) |
| Migrations | **None** — run `SCHEMA.md` DDL in Supabase SQL editor | Alembic setup is 20 min we don't have. Paste and go. |
| Realtime | **Short polling** (2s) on the leaderboard endpoint | Bulletproof for ~30 people; zero websocket infra; no anon-key exposure |
| Auth | JWT (member id in `sub`), stored client-side | No password infra; enough to bind votes/RSVPs to an identity |
| Admin | Shared `ADMIN_SECRET` in a header | Simplest secure-enough gate for a hackathon |
| Images | `image_url` text field (paste a link) | Upload infra is out of scope; avoids 30 min of storage plumbing |

## 3. Data flow (the one that matters: voting)

1. Member has a JWT from `/join`.
2. `POST /sessions/{id}/vote {project_id, score}` with `Authorization: Bearer <jwt>`.
3. Backend, in one path:
   - verifies JWT → `voter_id`
   - checks `session.voting_open` → else **403**
   - checks `voter_id != project.owner_id` (no self-votes) → else **403**
   - inserts vote; **unique (voter_id, project_id)** violation → **409** ("already voted")
4. Projector polls `GET /sessions/{id}/leaderboard` every 2s → ranked projects.

The one-vote rule lives in the **database** (unique index), not the UI. The app-layer
checks are for friendly errors; the DB constraint is the actual guarantee.

## 4. Auth model (hackathon-grade, stated honestly)

- `/join` creates a member and returns a JWT signed with `JWT_SECRET`.
- Write endpoints require the JWT; the member id comes from the token, never the body.
- **Known limitation:** someone can re-join under a new name to get a fresh identity and
  vote again. Acceptable for a hackathon — the DB constraint still prevents *double*-voting
  per identity, and UUIDs aren't guessable so impersonation of a *specific* member isn't feasible.
- Do **not** ship this auth model to production unchanged. Post-hackathon: magic-link email.

## 5. Two gotchas that can sink the live demo

### 5.1 Render free-tier cold start ⚠️
Free instances spin down after ~15 min idle and take ~50s to wake. If the backend is
asleep when the room hits "vote," the demo stalls.

**Mitigations (do all three):**
1. Free uptime pinger (UptimeRobot / cron-job.org) → `GET /health` every 10 min.
2. Manually hit `/health` ~3 min before presenting to guarantee it's warm.
3. If budget allows for the day, Render's paid tier removes spin-down entirely.

### 5.2 RLS / anon-key footgun ⚠️
Because all DB access is server-side through FastAPI (using the Supabase connection
string / service credentials), **Row Level Security is bypassed and not required today**.

**But** the moment anyone exposes the Supabase **anon key** in the frontend (e.g. to add
Realtime), an un-RLS'd database is world-readable **and writable**. If you go that route:
enable RLS on every table *first*, then add policies. For the hackathon, keep the frontend
talking only to FastAPI and this problem doesn't exist.

## 6. CORS

FastAPI must allow the Vercel origin. Read allowed origins from an env var so preview
deploys don't break you:

```python
CORS_ORIGINS = os.environ["CORS_ORIGINS"].split(",")  # e.g. "https://clubos.vercel.app,http://localhost:3000"
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])
```

## 7. Environments & secrets

| Service | Env vars |
|---------|----------|
| Render (backend) | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `CORS_ORIGINS` |
| Vercel (frontend) | `NEXT_PUBLIC_API_URL` |
| Supabase | — (get `DATABASE_URL` from Project → Settings → Database → Connection string; use the **pooled** connection, port 6543, for a serverless-friendly pool) |

## 8. What we deliberately did NOT build (and why it's correct)

- **No websockets** — polling is simpler and enough at this scale.
- **No message queue / Kafka** — there are no async workflows here; it would be architecture theatre.
- **No caching layer** — the leaderboard query over ~30 rows is sub-millisecond.
- **No separate auth service** — JWT issuance is three lines in FastAPI.

Scaling note: this design comfortably handles a single club (hundreds of members,
tens of concurrent voters). Multi-club / multi-tenant would add an `orgs` table and a
tenant column on every row — a clean future change, not a today problem.
