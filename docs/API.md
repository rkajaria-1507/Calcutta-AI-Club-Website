# API — Calcutta AI Club

Detailed endpoint reference for the target backend (`ARCHITECTURE.md §8` has the summary).
Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://cac-api.onrender.com`). All bodies are JSON;
all timestamps are ISO 8601 (`timestamptz`).

> **Today:** the frontend runs in-memory and reaches AI through Next.js route handlers
> (`web/app/api/generate-profile`, `/match-pitch`, `/ask-corpus`). The endpoints below are the
> FastAPI contract the frontend migrates onto in `ROADMAP.md` phases 1–3. The AI-backed
> endpoints (`POST /members`, `POST /pitches`, `POST /corpus/ask`) mirror those route handlers
> exactly, so the migration is a base-URL swap.

## Auth

- **Member:** `Authorization: Bearer <jwt>` — JWT issued by `/auth/verify`, member id in `sub`.
  The member id is **always** taken from the token, never trusted from the request body.
- **Admin:** `X-Admin-Secret: <ADMIN_SECRET>` header on admin endpoints.

| Level | How |
|-------|-----|
| public | no header |
| member | `Authorization: Bearer` |
| admin | `X-Admin-Secret` |

## Standard error shape

```json
{ "detail": "human-readable message" }
```

| Status | When |
|--------|------|
| 400 | validation failed |
| 401 | missing/invalid token or code |
| 403 | not allowed (not the owner, bad admin secret) |
| 404 | resource not found |
| 409 | conflict (already checked in) |

Every mutating endpoint below also appends one row to `events` in the same transaction
(`SCHEMA.md`). That side effect is implied and not repeated per endpoint.

---

## Auth

### POST /auth/request — public
Start magic-link/OTP sign-in. Stores only the code's hash; never returns the code in prod.
```json
// request
{ "phone": "+919812345678" }
// 200
{ "sent": true }
```

### POST /auth/verify — public
Redeem the code, get a token + the member (creating one if this phone is new).
```json
// request
{ "phone": "+919812345678", "code": "042917" }
// 200
{ "token": "eyJ…", "member": { "id": "…", "name": "…", … } }
```

### GET /me — member
```json
// 200 -> the caller's full member record
```

### PATCH /me — member
Edit your own record. Only provided fields change. Emits `member.edited` with the changed keys.
```json
// request (any subset)
{ "line": "…", "dream": "Anthropic, on eval tooling", "ask": "…", "socials": { "github": "…" } }
// 200 -> updated member
```

---

## Onboarding

### POST /members — public  ⭐ the showstopper write
The end of the guided intake. Takes the five answers + name + dream, calls Claude to generate
the card server-side, persists the member, and returns it with a token (onboarding signs you
in). Mirrors the prototype's `POST /api/generate-profile`. Emits `member.joined`.
```json
// request
{
  "name": "Ada Basu",
  "built": "Right now a captioning bot; if skill weren't the limit, an agent that runs my whole newsroom.",
  "taste": "Pather Panchali — restraint is the highest technology.",
  "contrarian": "Evals are theatre; taste is the real benchmark.",
  "offer": "I can teach prompt-debugging from first principles.",
  "ask": "A designer who thinks in systems.",
  "dream": "Anthropic, on interpretability for Indic models",
  "socials": { "github": "adabasu" }
}
// 201
{
  "token": "eyJ…",
  "member": {
    "id": "…", "name": "Ada Basu",
    "field": "AI journalism", "build_into": "Agentic newsrooms",
    "line": "Builds captioning bots today, an autonomous newsroom in her head…",
    "epithet": "Bets on taste over benchmarks",
    "tags": ["#agents", "#media", "#indic-ml"],
    "built": "…", "taste": "…", "contrarian": "…", "offer": "…", "ask": "…", "dream": "…",
    "created_at": "…"
  }
}
```
If the AI call fails, the server returns a deterministic fallback card (still `201`) so
onboarding never dead-ends.

---

## Directory

### GET /members — public
The wall. Newest first.
```json
// 200
[ { "id": "…", "name": "…", "field": "…", "built": "…", "build_into": "…",
    "taste": "…", "ask": "…", "offer": "…", "dream": "…",
    "line": "…", "epithet": "…", "tags": ["#…"] } ]
```

### GET /members/{id} — public
One member's full record (adds their pitches).
```json
// 200
{ "member": { … }, "pitches": [ { … } ] }
```

---

## Corpus chatbot

### POST /corpus/ask — public
Answer a natural-language question about the room over the full member corpus. Host-style,
never invents members. Mirrors the prototype's `POST /api/ask-corpus`. Emits `corpus.asked`.
```json
// request
{ "question": "who should I meet if I'm building agents?" }
// 200
{ "answer": "Talk to Dev Kapoor — his agents already run a channel with 80k subs — and Aritra Sen for the eval side." }
```
Falls back to a keyword scan over the same corpus if the model call fails.

---

## Pitch board

### GET /pitches — public
Every pitch, newest first, with its AI match snapshot and comment count.
```json
// 200
[ { "id": "…", "author": { "id": "…", "name": "Saurav Mandal" },
    "title": "Adda, searchable", "idea": "…", "ask": "…",
    "suggested": [ { "name": "Anwesha Roy", "reason": "Owns the tokenizer problem…" } ],
    "comment_count": 3, "created_at": "…" } ]
```

### POST /pitches — member
Three fields in; the match engine runs server-side and the resulting suggestions are stored
as a snapshot. Author comes from the token. Mirrors `POST /api/match-pitch`. Emits
`pitch.posted` + `pitch.matched`.
```json
// request
{ "title": "Adda, searchable", "idea": "Record club sessions, diarise…", "ask": "Two builders for a weekend" }
// 201 -> the created pitch, including "suggested"
```

### GET /pitches/{id}/comments — public
```json
// 200
[ { "id": "…", "author": { "id": "…", "name": "…" }, "body": "…", "created_at": "…" } ]
```

### POST /pitches/{id}/comments — member
Reply to a pitch. Author from token. Emits `comment.posted`.
```json
// request
{ "body": "I can bring the tripod." }
// 201 -> the created comment
```

---

## Dream collabs

### GET /dreams — public
The sponsor-facing aggregation: dreams grouped, counted, with who holds each. Powers the
Pitch Board's dream-collab strip and the future `/sponsors` page (`ROADMAP.md §5`).
```json
// 200
[ { "dream": "Anthropic, on eval tooling that actually catches things",
    "members": 2, "who": ["Aritra Sen", "…"] } ]
```

---

## Room Tonight

### GET /sessions — public
Upcoming first. The homepage "next session" reads the soonest.
```json
// 200
[ { "id": "…", "title": "…", "topic": "…", "venue": "Park Street", "starts_at": "…" } ]
```

### POST /sessions — admin
```json
// request
{ "title": "July Session", "topic": "Agents", "venue": "Park Street", "starts_at": "2026-07-25T16:00:00+05:30" }
// 201 -> session
```

### POST /sessions/{id}/checkin — member
Idempotent (one check-in per member per session; re-sending is a no-op). Emits `checkin`.
```json
// 201 -> { "session_id": "…", "member_id": "…", "created_at": "…" }
// 409 if the member is already checked in (surface as a friendly "already here")
```

### GET /sessions/{id}/checkins — public  ⭐ polled every ~2s
The live Room Tonight wall, newest first.
```json
// 200
[ { "name": "Kabir Ghosh", "epithet": "Demos first, apologises never",
    "ask": "an internship that isn't boring", "created_at": "…" } ]
```

### PUT /sessions/{id}/rsvp — member
Idempotent upsert — re-sending with a new status overwrites the old one. Emits `rsvp`.
Blocked with `400` once the session is more than 6h past its `starts_at` (see checkin's
same window) — `404` if the session doesn't exist.
```json
// request
{ "status": "going" }  // one of: going | maybe | no
// 200 -> { "session_id": "…", "member_id": "…", "status": "going" }
```

### GET /sessions/{id}/rsvps — public
RSVPs grouped by status, oldest first within each group.
```json
// 200
{ "going": [ { "id": "…", "name": "…", "epithet": "…" } ],
  "maybe": [], "no": [] }
```

---

## Ops

### GET /health — public
Keep-warm / pre-demo warm-up. Cheap — do **not** hit the DB (or the keep-warm ping generates
load). Return a static body.
```json
// 200
{ "status": "ok" }
```

---

## Endpoint summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /auth/request | public | send OTP / magic link |
| POST | /auth/verify | public | redeem code → token + member |
| GET | /me | member | own record |
| PATCH | /me | member | edit own record |
| POST | /members | public | ⭐ onboard: generate card + token |
| GET | /members | public | the wall |
| GET | /members/{id} | public | member + their pitches |
| POST | /corpus/ask | public | corpus chatbot |
| GET | /pitches | public | the pitch board |
| POST | /pitches | member | post a pitch (+ AI match) |
| GET | /pitches/{id}/comments | public | pitch thread |
| POST | /pitches/{id}/comments | member | reply |
| GET | /dreams | public | dream-collab aggregation |
| GET | /sessions | public | list sessions |
| POST | /sessions | admin | create a session |
| POST | /sessions/{id}/checkin | member | check in (idempotent) |
| GET | /sessions/{id}/checkins | public | ⭐ polled live wall |
| PUT | /sessions/{id}/rsvp | member | RSVP going/maybe/no (idempotent) |
| GET | /sessions/{id}/rsvps | public | RSVPs grouped by status |
| GET | /health | public | keep-warm |

