# ROADMAP — Calcutta AI Club

How the current prototype becomes a deployed, persistent product. Each phase is scoped so it
ships on its own and the demo never regresses. The North Star: **the software reads a
stranger and turns them into a legible member in under a minute** — and every subsequent
action compounds into the club's memory.

---

## Where we are now (Phases 0, 1 & 3 — done; updated 2026-07-20)

- **Three-tier app is live and deployed.** Next.js frontend on Vercel
  (`calcutta-ai-club.vercel.app`), FastAPI backend on Render
  (`calcutta-ai-club-website.onrender.com`), Postgres on Supabase — all wired end to end and
  verified against production. `web/components/club-app.tsx` (rendered by `web/app/page.tsx`)
  owns three surfaces: The Club (front page + living directory + corpus chatbot), Pitch Board
  (post, match, discuss, dream collabs), Room Tonight (live check-in wall).
- **Persistence is real (Phase 1 — done).** Every table in `SCHEMA.md` is live in Supabase.
  43 real members are seeded from the club's pre-launch Google Form intake (see
  `member.intake_form_submitted` events). Joining, editing, posting a pitch, commenting — all
  survive a refresh.
- **AI is already consolidated into FastAPI (Phase 3 — done).** All three surfaces
  (`_generate_card` in `routers/members.py`, `_match_pitch` in `routers/pitches.py`,
  `ask_corpus` in `routers/corpus.py`) call `app/anthropic_client.py` server-side. No Next.js
  API routes exist anymore. Each degrades to deterministic local logic if
  `ANTHROPIC_API_KEY` is unset.
- **JWT + ownership enforcement already work** (`api/app/security.py`, `api/app/deps.py`):
  `create_access_token`/`decode_access_token`, `get_current_member_id` (Bearer header),
  and a gated `PATCH /me` that lets a signed-in member edit only their own record.

**The one real gap, and it's a big one: Phase 2 (real identity) never got built.** The JWT
machinery above only ever gets exercised at the moment of in-app onboarding — a member is
issued a token *only* the instant they finish the five-question flow on some browser. There
is no way to redeem that identity again from a different device or after clearing
`localStorage`. Concretely: **all 43 imported members have a `members` row and a real phone
number, but zero way to ever sign in** — they never ran onboarding, so no browser ever got
their token. The Sign In modal says as much: *"real phone sign-in for other devices is
coming."* Nothing else in the roadmap matters if people can't get into their own accounts —
this is now the single highest-priority phase.

---

## Phase 2 — Real identity (OTP sign-in) ⭐ highest priority, unblocks everything

Replace "you're only signed in if this browser did your onboarding" with real phone + OTP
sign-in that works from any device, for any of the 43 already-imported members.

**What already exists (don't rebuild):**
- `auth_challenges` table (`id`, `phone`, `code_hash`, `expires_at`, `consumed_at`,
  `created_at`) — live in Supabase, unused so far.
- `create_access_token` / `decode_access_token` / `get_current_member_id` — fully working
  JWT issuance and verification.
- `PATCH /me`, `GET /me` — already gated correctly on the token; will work immediately for
  every member the moment they can get a token.
- Every imported member already has a normalized `phone` (E.164) — no data migration needed.

**What's actually missing:**

1. **`POST /auth/request`** (new router, `api/app/routers/auth.py`)
   - Input: `{ phone }`. Look up the member by phone; 404 if no member has that number
     (don't leak which numbers exist vs don't — keep the response identical either way, or
     defer that hardening to prod-abuse-notes below).
   - Generate a 6-digit code, store `sha256(code)` in `auth_challenges` with a short
     `expires_at` (~10 min), send the code via SMS.
   - **Real product decision needed here, not just code:** which SMS provider sends OTPs to
     Indian numbers (Twilio, MSG91, 2Factor, etc.) — pick one, get an account + sender ID
     approved (India requires DLT template registration for transactional SMS), and hold
     that provider's key the same way `ANTHROPIC_API_KEY` is held (Render env var, never
     committed).
   - Rate-limit this endpoint (e.g. max 3 requests per phone per 10 min) — an unthrottled
     OTP-send endpoint is a spam/cost vector.

2. **`POST /auth/verify`**
   - Input: `{ phone, code }`. Look up the latest unconsumed, unexpired `auth_challenges`
     row for that phone, compare the hash, mark `consumed_at`, issue a JWT via
     `create_access_token(member.id)`.
   - 401 on mismatch/expired/already-consumed; no info leak about which case it was.

3. **Frontend: replace the fake "Sign In" modal** (`web/components/auth/login-modal.tsx`)
   - Two-step form: phone number → 6-digit code, calling the two endpoints above.
   - On success, `setToken()` (already exists in `web/lib/api.ts`) and refetch `/me`.
   - Onboarding's existing phone field becomes the same identity, not a separate concept —
     after `POST /members` completes, either auto-run verify (if the product wants
     zero-friction joining to stay instant) or immediately prompt for the OTP the member was
     just sent, so onboarding and "log back in later" are one unified flow, not two.

4. **Ownership stays enforced exactly as it is today** — the member id always comes from the
   verified token (`get_current_member_id`), never from the request body. No change needed
   there; it already works correctly, it's just unreachable without step 1–3.

**Acceptance:** any of the 43 imported members can, from any device, enter their phone
number, receive a real SMS code, verify it, and land on `PATCH /me` able to edit their own
card — with no dependency on which browser they used before.

**Explicitly out of scope for this phase** (don't scope-creep it in): admin roles/accounts
(separate, smaller follow-up — add an `is_admin` boolean to `members`, gate session-creation
UI on it, retire or keep `ADMIN_SECRET` as a break-glass fallback), and Room Tonight's
hardcoded "LIVE · SAT 25 JUL · PARK STREET" header (unrelated bug, one-line fix, track
separately).

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

Persistence (Phase 1) and consolidating AI into one backend (Phase 3) are done — a product
that forgets isn't a product, and a single service holding the Anthropic key was table
stakes before going further. Identity (Phase 2) is next, and now the *only* blocker, because
everything from here on — a member editing their own card, the introduction engine, any
"signed-in" surface — is unreachable without it; ownership is enforced correctly in code
today but unusable in practice. After that, the compounding, sponsor-legible features (4–6)
are cheap precisely because the `events` spine and the `dream` field already exist. Room
Tonight (Phase 7) is last because the scripted version already demos well.

## The five intake questions (the product's spine)

Locked, each mapped to what it feeds — see `PRD.md §5` for the full rationale and
`SCHEMA.md` for the columns.

1. **Trajectory** — building now, and what you'd build if skill weren't the constraint → `built`, tags, epithet.
2. **Taste** — one thing you'd defend forever, and why → `taste`; the field no other directory captures.
3. **Mind** — the AI belief the room would push back on → `contrarian`; sharpens the corpus.
4. **Offer** — what you could teach for an hour with zero prep → `offer`; the introduction engine's supply side.
5. **Need** — what you need now that someone here could give → `ask`; matched against everyone's Q4.

Plus **dream collaboration**, **name**, and **socials** as fields, not questions.
