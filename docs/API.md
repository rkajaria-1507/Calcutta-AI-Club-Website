# API — ClubOS

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://clubos-api.onrender.com`)
All bodies are JSON. All timestamps are ISO 8601 (`timestamptz`).

## Auth

- **Member auth:** `Authorization: Bearer <jwt>` — JWT issued by `/join`, member id in `sub`.
  The member id is **always** taken from the token, never trusted from the request body.
- **Admin auth:** `X-Admin-Secret: <ADMIN_SECRET>` header on admin endpoints.

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
| 401 | missing/invalid token |
| 403 | not allowed (voting closed, self-vote, not owner, bad admin secret) |
| 404 | resource not found |
| 409 | conflict (already voted) |

---

## Identity

### POST /join  — public
Create a member and return a token. This is the QR-landing action.
```json
// request
{ "name": "Raghav", "tagline": "backend + agents", "avatar_url": null }
// 201
{ "token": "eyJ...", "member": { "id": "…", "name": "Raghav", "tagline": "backend + agents", "avatar_url": null, "building_now": null } }
```

### GET /me  — member
```json
// 200
{ "id": "…", "name": "Raghav", "tagline": "…", "avatar_url": null, "building_now": "a RAG bot" }
```

### PATCH /me  — member
Update own profile, including the "currently building" status. Only provided fields change.
```json
// request
{ "tagline": "backend + agents", "building_now": "a RAG bot for my dad's shop" }
// 200 -> updated member
```

---

## Members / Wall

### GET /members  — public
The wall. Newest first.
```json
// 200
[ { "id": "…", "name": "…", "avatar_url": null, "tagline": "…", "building_now": "…" } ]
```

### GET /members/{id}  — public
Profile + that member's projects.
```json
// 200
{ "member": { … }, "projects": [ { … } ] }
```

---

## Projects

### POST /projects  — member
Owner is taken from the token. `session_id` optional (set it to enter a demo day).
```json
// request
{ "title": "Saarthi", "tagline": "consent-first YONO co-pilot", "link": "https://…", "repo_url": "https://…", "image_url": "https://…", "session_id": null }
// 201 -> project
```

### GET /projects  — public
Ship-log / wall feed, newest first. Includes owner summary.
```json
// 200
[ { "id": "…", "title": "…", "tagline": "…", "link": "…", "image_url": "…",
    "owner": { "id": "…", "name": "…", "avatar_url": null }, "created_at": "…" } ]
```

### GET /projects/{id}  — public
Full project + owner + reaction counts.

### PATCH /projects/{id}  — member (owner only)
403 if the caller isn't the owner.

---

## Sessions

### POST /sessions  — admin
`cover_image_url` and `host_blurb` (both optional) drive the Partiful-style invite page.
```json
// request
{ "title": "August Demo Day", "topic": "Agents", "venue": "…", "starts_at": "2026-08-15T18:00:00+05:30",
  "cover_image_url": "https://…", "host_blurb": "Bring your demos. We bring the chai." }
// 201 -> session (voting_open defaults false)
```

### GET /sessions  — public
Upcoming first.
```json
// 200
[ { "id": "…", "title": "…", "topic": "…", "venue": "…", "starts_at": "…", "voting_open": false,
    "cover_image_url": null, "host_blurb": null } ]
```

### GET /sessions/{id}  — public
Session + RSVP summary + demo projects.
```json
// 200
{ "session": { … },
  "rsvp_counts": { "going": 12, "maybe": 3, "no": 1 },
  "projects": [ { … } ] }
```

### PATCH /sessions/{id}  — admin
Toggle voting (the choreography switch) or edit details.
```json
// request
{ "voting_open": true }
// 200 -> session
```

### GET /sessions/{id}/leaderboard  — public  ⭐ polled every 2s
Ranked projects for the projector. See `SCHEMA.md` for the query.
```json
// 200
[ { "project_id": "…", "title": "…", "owner_name": "…", "owner_avatar": null,
    "image_url": "…", "score": 34, "vote_count": 12, "rank": 1 } ]
```

---

## RSVP

### PUT /sessions/{id}/rsvp  — member
Idempotent upsert (PUT = safe to re-send). Member from token. `plus_ones` (0–3,
default 0) is how many guests you're bringing — only meaningful for `going`.
```json
// request
{ "status": "going", "plus_ones": 2 }   // status: going | maybe | no
// 200 -> { "session_id": "…", "member_id": "…", "status": "going", "plus_ones": 2 }
```

### GET /sessions/{id}/rsvps  — public
For the avatar row / face wall. Grouped by status. Going count for display =
`going.length + sum(plus_ones)`.
```json
// 200
{ "going":  [ { "id": "…", "name": "…", "avatar_url": null, "plus_ones": 2 } ],
  "maybe":  [ … ],
  "no":     [ … ] }
```

---

## Votes

### POST /sessions/{id}/vote  — member  ⭐ the showstopper write
Member (voter) from token. Enforcement order: voting open → not self-vote → not duplicate.
```json
// request
{ "project_id": "…", "score": 5 }   // score optional, defaults 1
// 201 -> { "id": "…", "project_id": "…", "score": 5 }
```
Errors:
- `403` — voting closed for this session, **or** voting for your own project.
- `409` — you already voted for this project (DB unique constraint).
- `404` — project not in this session.

### GET /sessions/{id}/my-votes  — member
So the UI can render which projects you've already voted on.
```json
// 200
[ { "project_id": "…", "score": 5 } ]
```

---

## Reactions  *(optional)*

### POST /projects/{id}/react  — member
```json
{ "emoji": "🔥" }   // 201; 409 if you already used that emoji here
```

### DELETE /projects/{id}/react  — member
```json
{ "emoji": "🔥" }   // 204
```

---

## Session hype (invite page)

### GET /sessions/{id}/reactions  — public (member-aware)
Aggregate emoji counts on the event. If a valid `Authorization: Bearer` header is
sent, `mine` lists the caller's own emojis (so pills render as toggled); anonymous
callers just get empty `mine`.
```json
// 200
{ "counts": { "🔥": 12, "🚀": 4 }, "mine": ["🔥"] }
```

### POST /sessions/{id}/react  — member
```json
{ "emoji": "🔥" }   // 201; 409 if you already used that emoji on this session
```

### DELETE /sessions/{id}/react  — member
```json
{ "emoji": "🔥" }   // 204
```

---

## Session posts (hype wall)

### POST /sessions/{id}/posts  — member
```json
// request
{ "body": "can't wait for demo day 🔥" }   // 1–280 chars
// 201
{ "id": "…", "session_id": "…", "body": "…",
  "author": { "id": "…", "name": "…", "avatar_url": null }, "created_at": "…" }
```

### GET /sessions/{id}/posts  — public
Newest first, with author summary.

### DELETE /sessions/{id}/posts/{post_id}  — author **or** admin
Author is matched from the bearer token; admin via `X-Admin-Secret`. `403` if
neither. `204` on success.

---

## Health

### GET /health  — public
For the uptime pinger and pre-demo warm-up. Cheap — do **not** hit the DB here (or the
keep-warm ping generates load); return a static `{"status":"ok"}`.
```json
// 200
{ "status": "ok" }
```

---

## Endpoint summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /join | public | create member + token |
| GET | /me | member | own profile |
| PATCH | /me | member | edit profile / "building now" |
| GET | /members | public | the wall |
| GET | /members/{id} | public | profile + projects |
| POST | /projects | member | post a project |
| GET | /projects | public | ship-log feed |
| GET | /projects/{id} | public | project detail |
| PATCH | /projects/{id} | owner | edit project |
| POST | /sessions | admin | create session |
| GET | /sessions | public | list sessions |
| GET | /sessions/{id} | public | session detail |
| PATCH | /sessions/{id} | admin | toggle voting / edit |
| GET | /sessions/{id}/leaderboard | public | ⭐ polled scoreboard |
| PUT | /sessions/{id}/rsvp | member | upsert RSVP |
| GET | /sessions/{id}/rsvps | public | avatar row |
| POST | /sessions/{id}/vote | member | ⭐ cast vote |
| GET | /sessions/{id}/my-votes | member | my voted projects |
| POST | /projects/{id}/react | member | add reaction (optional) |
| DELETE | /projects/{id}/react | member | remove reaction (optional) |
| GET | /sessions/{id}/reactions | public | hype counts (+ own emojis if token sent) |
| POST | /sessions/{id}/react | member | add hype emoji to session |
| DELETE | /sessions/{id}/react | member | remove hype emoji from session |
| POST | /sessions/{id}/posts | member | post on the hype wall |
| GET | /sessions/{id}/posts | public | hype wall feed |
| DELETE | /sessions/{id}/posts/{post_id} | author/admin | delete a post |
| GET | /health | public | keep-warm / warm-up |
