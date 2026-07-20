# ROADMAP — Calcutta AI Club

How the current prototype becomes a deployed, persistent product. Each phase is scoped so it
ships on its own and the demo never regresses. The North Star: **the software reads a
stranger and turns them into a legible member in under a minute** — and every subsequent
action compounds into the club's memory.

---

## Where we are now (Phase 0 — done)

- **Frontend is real and runnable.** The single-file React prototype is ported into the
  Next.js app (`web/components/club-app.tsx`, rendered by `web/app/page.tsx`). Three surfaces:
  The Club (front page + living directory + corpus chatbot), Pitch Board (post, match,
  discuss, dream collabs), Room Tonight (live check-in wall).
- **Onboarding is the demo.** A guided five-question flow → a "reading you" beat → a reveal
  of the AI-written card → drop onto the wall, signed in.
- **AI runs server-side already.** The three AI surfaces call Next.js route handlers under
  `web/app/api/*` (`generate-profile`, `match-pitch`, `ask-corpus`), which hold the
  Anthropic key server-side (`ANTHROPIC_API_KEY`). With no key set, each degrades to
  deterministic local logic, so the app runs offline and the stage demo never stalls.
- **Auth + editing are prototype-grade.** In-memory session; pick-a-name sign-in; a member
  can edit *only their own* record and posts. Joining signs you in automatically.
- **State is in-memory.** Refresh loses everything. This is the one thing Phase 1 fixes.

**Known limitation to state honestly on stage:** nothing persists yet, and the AI key, if
set, currently lives in the Next.js server (fine for Vercel, but we want one backend holding
it — Phase 3).

---

## Phase 1 — Persistence (make it survive a refresh) ⭐ highest value

Turn the in-memory prototype into a real three-tier app.

- Stand up the schema from `SCHEMA.md` in Supabase (paste the DDL).
- Bring the FastAPI backend (`api/`) to the new model. The scaffold currently ships the
  older ClubOS shape (projects/rsvps/votes); replace those routers with:
  `members`, `pitches`, `comments`, `sessions`, `checkins`, and an `events` writer.
  Follow the endpoint contract in `API.md`.
- Wire the frontend to the backend: replace the `useState(SEED_*)` stores with fetches to
  `NEXT_PUBLIC_API_URL`. Keep the seed data as a DB seed script so the wall is never empty.
- **Every write also appends one `events` row** (see `SCHEMA.md`). This is the habit that
  makes phases 4–6 free.

**Acceptance:** join a member, refresh, they're still on the wall; post a pitch, refresh,
it's still there.

## Phase 2 — Real identity (magic-link / OTP)

Replace pick-a-name with name + phone → OTP.

- `POST /auth/request` issues a 6-digit code (store only its hash in `auth_challenges`),
  `POST /auth/verify` redeems it and returns a JWT (member id in `sub`).
- Frontend swaps the `LoginModal` roster for a phone-entry + code-entry step; onboarding's
  final step collects phone and auto-verifies.
- Ownership is now enforced server-side: the member id always comes from the token, never
  the request body.

**Acceptance:** a signed-in member can edit only their own record; a second browser can't.

## Phase 3 — Consolidate the AI edge into FastAPI

Move the three AI calls from Next route handlers into the backend so there is exactly one
service holding the key and one place that logs to `events`.

- `POST /members` (onboarding) generates the card server-side; `POST /pitches` runs the
  match engine; `POST /corpus/ask` answers over the corpus. Same prompts as the Next routes.
- Frontend points the three helpers at the backend instead of `/api/*`. Keep the
  deterministic fallbacks client-side as the last line of defence.
- Log `corpus.asked` and `pitch.matched` events for later analytics.

**Acceptance:** the browser network tab shows no Anthropic calls and no key; all AI traffic
goes through the backend.

## Phase 4 — The introduction engine (the payoff for logging in) ⭐

The reason login is worth doing: on sign-in, hand a member their **three suggested people**.

- One Claude call: their answer to Q5 (need) against everyone's answer to Q4 (offer),
  returning three members here-tonight + a one-line reason each.
- Surface it as a "these three are in the room, here's why" card on sign-in.
- Reads only data we already hold; same pattern as the corpus chatbot.

**Acceptance:** signing in shows three real, relevant introductions with reasons.

## Phase 5 — The sponsor-facing dream-collab page

Aggregate the `dream` field across the room into the artifact that makes the club legible to
a sponsor — "here's what a scout sees when they find you."

- New read-only page reading the heat-map query in `SCHEMA.md` (group dreams, count, list
  who). Pure aggregation over data we already have.
- Frame it as the club's ceiling: who this room would kill to build with, and the density
  behind each name.

**Acceptance:** a public `/sponsors` view renders the ranked dream-collab map.

## Phase 6 — The outward collaboration board

Distinct from internal pitches: asks pointed at brands and non-members. Small now that
`pitches.suggested` already supports non-member targets (a `member_id`-less suggestion).

**Acceptance:** a member can post an ask addressed to a brand; it appears on an outward board.

## Phase 7 — Room Tonight for real

Replace the scripted check-in animation with live check-ins.

- QR at the venue → `POST /sessions/{id}/checkin` (idempotent, one per member).
- The projector view polls `GET /sessions/{id}/checkins` every ~2s.
- Optionally upgrade to Supabase Realtime — **but** enable RLS first (`SCHEMA.md` / `ARCHITECTURE.md §5.2`).

**Acceptance:** a phone scans in and the name lands on the projected wall within ~2s.

---

## Deliberately later (one "what's next" slide, never build during a hackathon)

Streaks & attendance ladders · reactions on cards · notifications/WhatsApp reminders ·
richer socials + `wa.me` deep links · image uploads (today `image_url` is a pasted link) ·
season-long analytics from the `events` log · multi-club / multi-tenant (add an `orgs` table
+ a tenant column per row — a clean future change, not a today problem).

---

## Sequencing rationale

Persistence first (Phase 1) because a product that forgets isn't a product. Identity next
(Phase 2) so ownership is real, not honour-system. Then consolidate AI (Phase 3) so there's
one secure backend. Only then the compounding, sponsor-legible features (4–6), which are
cheap precisely because the `events` spine and the `dream` field already exist. Room Tonight
(Phase 7) is last because the scripted version already demos well.

## The five intake questions (the product's spine)

Locked, each mapped to what it feeds — see `PRD.md §5` for the full rationale and
`SCHEMA.md` for the columns.

1. **Trajectory** — building now, and what you'd build if skill weren't the constraint → `built`, tags, epithet.
2. **Taste** — one thing you'd defend forever, and why → `taste`; the field no other directory captures.
3. **Mind** — the AI belief the room would push back on → `contrarian`; sharpens the corpus.
4. **Offer** — what you could teach for an hour with zero prep → `offer`; the introduction engine's supply side.
5. **Need** — what you need now that someone here could give → `ask`; matched against everyone's Q4.

Plus **dream collaboration**, **name**, and **socials** as fields, not questions.
