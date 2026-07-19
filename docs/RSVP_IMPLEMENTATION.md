# RSVP Feature — Implementation Notes

Partiful-style event RSVP experience for ClubOS. This document describes everything
that shipped in the `feature/partiful-rsvp` line of work: the new invite page, the
supporting backend endpoints, and the data-model changes.

Companion docs:
- **[RSVP_API.md](RSVP_API.md)** — the exact endpoints, payloads, and auth levels.
- **[RSVP_SCHEMA.md](RSVP_SCHEMA.md)** — the DDL you must run in Supabase.

---

## 1. Goal

Turn a bare RSVP toggle into a shareable, hype-driven invite page — the thing a QR code
or a shared link opens on a phone. It should let a first-time visitor go from "opened the
link" to "I'm going, +2 guests, posted to the wall" without a separate signup detour.

## 2. What was built

### 2.1 The invite page — `web/app/sessions/[id]/invite/page.tsx`

A single mobile-first client page (`/sessions/{id}/invite`) that composes:

| Block | Behaviour |
|-------|-----------|
| **Cover hero** | Uses `session.cover_image_url`; falls back to a gradient with a 🎉 when unset. |
| **Header** | Title, human-formatted date/time, venue, and an optional italic host blurb. |
| **Hype pills** | 🔥 ✨ 🚀 ❤️ — tap to add/remove your emoji; shows aggregate counts; your own are highlighted. |
| **RSVP hero** | Big "I'm going 🎉 / Maybe / Can't make it" buttons; the current choice is outlined. |
| **+1 selector** | Appears after "going": Just me / +1 / +2 / +3; re-sends the RSVP with the new guest count. |
| **Celebration** | CSS confetti burst + "You're in! 🎊" + a copy-link share button on "going". |
| **Inline join** | Visitors with no JWT get a name + avatar-emoji form; tapping any RSVP button scrolls to it and completes join → RSVP in one flow. |
| **Face wall** | Overlapping avatars of everyone going, with a `"N going"` count that includes +1s; "maybe" shown smaller below. |
| **Hype wall** | A 280-char composer (members only) over a newest-first feed of posts; authors can delete their own. |

Design constraints honoured: **zero new dependencies** (just React 19 + Next 15), all
styles live in `web/app/globals.css`, and the layout is tuned for a phone first.

### 2.2 Backend endpoints

All new endpoints follow the existing repo conventions: raw parameterized `asyncpg`,
Pydantic schemas in `api/app/schemas.py`, one router per domain, `_row_to_x` mappers, and
DB constraints (not app code) as the source of truth for uniqueness.

- **Session invite fields** — `sessions` gained `cover_image_url` and `host_blurb`,
  editable through the existing admin `PATCH /sessions/{id}` (`api/app/routers/sessions.py`).
- **+1s** — `rsvps` gained `plus_ones` (0–3); the `PUT /sessions/{id}/rsvp` upsert now
  writes it and `GET /sessions/{id}/rsvps` returns it per avatar.
- **Hype wall** — new `api/app/routers/session_posts.py`: `POST` / `GET
  /sessions/{id}/posts` and `DELETE /sessions/{id}/posts/{post_id}` (author **or** admin).
- **Session reactions** — added to `api/app/routers/reactions.py`: `POST` / `DELETE
  /sessions/{id}/react` plus `GET /sessions/{id}/reactions` returning `{counts, mine}`.

### 2.3 Auth helpers — `api/app/deps.py`

Two non-raising helpers were added for endpoints that mix roles:
- `get_optional_member_id` — returns the member id if a valid bearer token is present,
  else `None` (used so `GET /reactions` can fill `mine`, and post-delete can check authorship).
- `is_admin` — a boolean admin check (used so post-delete accepts author **or** admin).

### 2.4 Frontend types — `web/lib/api.ts`

`Session` extended with the two new fields; `RsvpAvatar` gained `plus_ones`; new
`RsvpOut`, `SessionPost`, and `SessionReactions` types added.

## 3. Design decisions worth knowing

- **`host_blurb` was added alongside `cover_image_url`.** The invite page needs a host
  message to render; it rides the same admin PATCH path and is fully optional.
- **Reactions are member-aware but publicly readable.** `GET /reactions` returns counts
  to anyone; the `mine` array is populated only when a valid token is sent, so the page
  can render pills as toggled without a second request.
- **Post deletion is author-or-admin.** Authorship is matched from the JWT `sub`; admins
  override via `X-Admin-Secret`. This reuses the existing admin gate rather than inventing
  a new role.
- **The voting / leaderboard hot path was left untouched**, per the feature constraints.

## 4. Known limitations (consistent with the project's hackathon posture)

- The invite page reads on load and after each write; it does **not** poll. That's fine
  for an invite (unlike the live scoreboard, which does poll every 2s).
- Identity remains re-joinable, so hype counts and RSVPs inherit the same "someone can
  re-join for a fresh identity" caveat documented in `ARCHITECTURE.md §4`.
- Images are paste-a-link (`cover_image_url`); no upload infrastructure, by design.

## 5. Deploy checklist for this feature

1. Run the DDL in **[RSVP_SCHEMA.md](RSVP_SCHEMA.md)** in the Supabase SQL editor
   **before** deploying the backend — the session queries now select the new columns and
   will error until they exist.
2. Deploy the FastAPI backend (Render) and the Next.js frontend (Vercel) as usual.
3. Create/edit a session with a `cover_image_url` + `host_blurb`, then open
   `/sessions/{id}/invite` on a phone to verify.
