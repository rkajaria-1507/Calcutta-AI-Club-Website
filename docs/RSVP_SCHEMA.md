# RSVP Feature — Required Database Schema

The database changes the Partiful-style RSVP feature needs. Postgres (Supabase), no
migration tooling — **run the DDL below directly in the Supabase SQL editor.** These
changes are additive and assume the base schema in **[SCHEMA.md](SCHEMA.md)** already exists.

Design rules carried over from the base schema:
- UUID primary keys (`gen_random_uuid()`), so ids are unguessable and safe in URLs.
- `timestamptz` everywhere, never naive timestamps.
- Integrity that matters is enforced by **DB constraints**, not application code.
- `ON DELETE CASCADE` from members/sessions so cleanup is automatic.

---

## Changes at a glance

| Object | Change | Why |
|--------|--------|-----|
| `sessions` | + `cover_image_url text` | invite-page hero image (paste-a-link) |
| `sessions` | + `host_blurb text` | short host message on the invite page |
| `rsvps` | + `plus_ones smallint default 0` (0–3) | "+N guests" on a going RSVP |
| `session_posts` | **new table** | the hype wall (public comments on a session) |
| `session_reactions` | **new table** | emoji hype on the event itself |

---

## Table: session_posts

Short public comments on a session's invite page. Author or admin can delete.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| session_id | uuid NOT NULL | FK → sessions(id) ON DELETE CASCADE |
| member_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| body | text NOT NULL | CHECK `char_length(body) <= 280` |
| created_at | timestamptz NOT NULL | `now()` |

## Table: session_reactions

One of each emoji per person per session. Mirrors the per-project `reactions` table.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| member_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| session_id | uuid NOT NULL | FK → sessions(id) ON DELETE CASCADE |
| emoji | text NOT NULL | |
| created_at | timestamptz NOT NULL | `now()` |
| — | UNIQUE (member_id, session_id, emoji) | one of each emoji per person per session |

---

## DDL — paste into the Supabase SQL editor

Run this **after** the base schema and **before** deploying the updated backend (the
session queries select the new columns and will error until they exist).

```sql
-- Invite-page content on sessions
alter table sessions add column cover_image_url text;
alter table sessions add column host_blurb text;

-- +1s on RSVPs
alter table rsvps add column plus_ones smallint default 0
  check (plus_ones between 0 and 3);

-- Hype wall (public comments on a session)
create table session_posts (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  body       text not null check (char_length(body) <= 280),
  created_at timestamptz not null default now()
);

-- Emoji hype on the event itself (mirrors per-project reactions)
create table session_reactions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (member_id, session_id, emoji)
);

-- Indexes for the hot paths
create index idx_session_posts_session     on session_posts(session_id, created_at desc);
create index idx_session_reactions_session on session_reactions(session_id);
```

---

## Rollback (if needed)

```sql
drop table if exists session_reactions;
drop table if exists session_posts;
alter table rsvps    drop column if exists plus_ones;
alter table sessions drop column if exists host_blurb;
alter table sessions drop column if exists cover_image_url;
```

---

## RLS note

Access stays server-side through FastAPI, so RLS is not required today and these tables
are left open — safe **only** because the frontend never holds a Supabase key. If you ever
add Supabase Realtime or direct browser→Supabase access, enable RLS on **every** table
(including these two) and write policies first. See `ARCHITECTURE.md §5.2`.
