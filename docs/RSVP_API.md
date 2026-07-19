# RSVP Feature — API Requirements

The endpoints the Partiful-style invite page depends on. This is a focused spec for the
RSVP feature; the full API surface lives in **[API.md](API.md)**.

Conventions (unchanged from the rest of ClubOS):
- Bodies are JSON; timestamps are ISO 8601 (`timestamptz`).
- **Member auth** — `Authorization: Bearer <jwt>` (member id taken from the token, never
  the body).
- **Admin auth** — `X-Admin-Secret: <ADMIN_SECRET>` header.
- Error shape: `{ "detail": "human-readable message" }`.

| Level | How |
|-------|-----|
| public | no header |
| member | `Authorization: Bearer` |
| admin | `X-Admin-Secret` |

---

## Sessions (extended)

The invite page reads two new optional fields on the session object. They are set/edited
through the existing admin endpoints — no new session endpoint was added.

`SessionOut` now includes:
```json
{ "id": "…", "title": "…", "topic": "…", "venue": "…", "starts_at": "…",
  "voting_open": false, "cover_image_url": null, "host_blurb": null }
```

### POST /sessions — admin
`cover_image_url` and `host_blurb` are optional additions to the create body.
```json
// request
{ "title": "August Demo Day", "starts_at": "2026-08-15T18:00:00+05:30",
  "cover_image_url": "https://…", "host_blurb": "Bring your demos. We bring the chai." }
```

### PATCH /sessions/{id} — admin
Accepts `cover_image_url` and `host_blurb` (alongside the existing editable fields). Only
provided fields change.

---

## RSVP (extended with +1s)

### PUT /sessions/{id}/rsvp — member
Idempotent upsert. `plus_ones` (integer, 0–3, default 0) is how many guests the member is
bringing; it is only meaningful for `going`.
```json
// request
{ "status": "going", "plus_ones": 2 }   // status: going | maybe | no
// 200
{ "session_id": "…", "member_id": "…", "status": "going", "plus_ones": 2 }
```
- `400` if `plus_ones` is outside 0–3 or `status` is not one of the three values.
- `404` if the session does not exist.

### GET /sessions/{id}/rsvps — public
Face-wall data, grouped by status. Display "going" count = `going.length + Σ plus_ones`.
```json
// 200
{ "going": [ { "id": "…", "name": "…", "avatar_url": null, "plus_ones": 2 } ],
  "maybe": [ … ],
  "no":    [ … ] }
```

---

## Session hype (reactions on the event)

### GET /sessions/{id}/reactions — public (member-aware)
Aggregate emoji counts. If a valid bearer token is sent, `mine` lists the caller's own
emojis so the UI can render pills as toggled; anonymous callers get an empty `mine`.
```json
// 200
{ "counts": { "🔥": 12, "🚀": 4 }, "mine": ["🔥"] }
```

### POST /sessions/{id}/react — member
```json
{ "emoji": "🔥" }   // 201; 409 if you already used that emoji on this session
```
- `404` if the session does not exist.

### DELETE /sessions/{id}/react — member
```json
{ "emoji": "🔥" }   // 204
```

---

## Session posts (hype wall)

### POST /sessions/{id}/posts — member
```json
// request
{ "body": "can't wait for demo day 🔥" }   // 1–280 chars
// 201
{ "id": "…", "session_id": "…", "body": "…",
  "author": { "id": "…", "name": "…", "avatar_url": null }, "created_at": "…" }
```
- `400` if `body` is empty or over 280 chars.
- `404` if the session does not exist.

### GET /sessions/{id}/posts — public
Newest first, each with an author summary.
```json
// 200
[ { "id": "…", "session_id": "…", "body": "…",
    "author": { "id": "…", "name": "…", "avatar_url": null }, "created_at": "…" } ]
```

### DELETE /sessions/{id}/posts/{post_id} — author **or** admin
Author is matched from the bearer token (`sub`); admins override via `X-Admin-Secret`.
- `204` on success.
- `401` if no token and not admin.
- `403` if a token is sent but the caller is not the author (and not admin).
- `404` if the post is not found in that session.

---

## Endpoint summary (feature additions)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| PUT | /sessions/{id}/rsvp | member | upsert RSVP **+ plus_ones** |
| GET | /sessions/{id}/rsvps | public | face wall (now includes `plus_ones`) |
| GET | /sessions/{id}/reactions | public | hype counts (+ own emojis if token sent) |
| POST | /sessions/{id}/react | member | add hype emoji to the session |
| DELETE | /sessions/{id}/react | member | remove hype emoji from the session |
| POST | /sessions/{id}/posts | member | post on the hype wall |
| GET | /sessions/{id}/posts | public | hype wall feed |
| DELETE | /sessions/{id}/posts/{post_id} | author/admin | delete a post |

Existing session `POST`/`PATCH` now also accept `cover_image_url` and `host_blurb`.
