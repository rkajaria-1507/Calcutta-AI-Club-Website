# SCHEMA — Calcutta AI Club

Postgres (Supabase). **Run the DDL at the bottom directly in the Supabase SQL editor** —
no migration tooling needed to stand this up.

Design rules:
- **UUID primary keys** (`gen_random_uuid()`) on entities, so ids are unguessable and safe
  in URLs and tokens.
- **One append-only `events` table** is the spine. Every meaningful action — join, profile
  edit, pitch, comment, corpus question, check-in — is also written as one `events` row.
  Feature tables hold *current state*; `events` holds *history*. This is what lets the club
  compound (activity feeds, the dream-collab heat map, "what changed since you last looked")
  without a schema change per feature.
- `timestamptz` everywhere, never naive timestamps.
- Integrity that matters (one check-in per person per session) is enforced by **DB
  constraints**, not application code.
- `ON DELETE CASCADE` from a parent so cleanup is automatic; `ON DELETE SET NULL` where a
  record should survive its actor (events, pitch authorship history).

---

## The data model at a glance

```
members ──1:N── pitches ──1:N── comments
   │               │
   │               └── suggested (jsonb snapshot of the AI match at post time)
   │
   ├──1:N── checkins ──N:1── sessions
   │
   └──1:N── events   (append-only log; member_id is the actor, nullable)
```

One member is one **record** (the "card"). A member owns their record and only their
record — the trust model is ownership, not a wiki.

---

## Tables

### members
Identity + the five intake answers + the AI-generated card. No password in the prototype;
`phone` is reserved for magic-link/OTP auth (see `ARCHITECTURE.md §4`).

The five questions map onto five columns; three more columns are AI-generated on onboarding
and remain fully member-editable afterwards.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| id | uuid PK | — | `gen_random_uuid()` |
| name | text NOT NULL | intake | not unique — identity is the id/token |
| phone | text NULL UNIQUE | auth | E.164; null in prototype (pick-a-name login) |
| **built** | text NULL | **Q1 · Trajectory** | building now + counterfactual "if skill weren't the constraint" |
| **taste** | text NULL | **Q2 · Taste** | the one thing they'd defend, and why |
| **contrarian** | text NULL | **Q3 · Mind** | the AI belief the room would push back on. Feeds the corpus; not always printed on the card |
| **offer** | text NULL | **Q4 · Offer** | what they could teach for an hour with zero prep |
| **ask** | text NULL | **Q5 · Need** | what they need right now that someone here could give |
| dream | text NULL | intake | dream collaboration — powers the sponsor-facing heat map |
| socials | jsonb NOT NULL default '{}' | profile | `{ "github": "...", "x": "...", "site": "...", "wa": "..." }` |
| field | text NULL | AI-generated | their world in 1–3 words (`industry` in the UI) |
| build_into | text NULL | AI-generated | what they're building toward, 2–5 words |
| line | text NULL | AI-generated | the one-sentence lede on the card |
| epithet | text NULL | AI-generated | the 3–6 word nickname the club coins |
| tags | text[] NOT NULL default '{}' | AI-generated | lowercase `#hashtags`, the filter handles |
| created_at | timestamptz NOT NULL | — | `now()` |
| updated_at | timestamptz NOT NULL | — | `now()`, bumped on every edit |

### pitches
An idea seeking hands. Three fields from the member; `suggested` is a **snapshot** of what
the match engine returned at post time (kept as-was even if members later change), stored as
jsonb so a suggestion can point at a non-member (a future sponsor/brand) too.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| author_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| title | text NOT NULL | |
| idea | text NOT NULL | two or three sentences |
| ask | text NULL | what the pitch needs from the room |
| suggested | jsonb NOT NULL default '[]' | `[{ "name": "...", "reason": "...", "member_id": "..."? }]` |
| created_at | timestamptz NOT NULL | `now()` |

### comments
Discussion under a pitch. Collapsed by default in the UI; posting requires sign-in.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| pitch_id | uuid NOT NULL | FK → pitches(id) ON DELETE CASCADE |
| author_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| body | text NOT NULL | |
| created_at | timestamptz NOT NULL | `now()` |

### sessions
A club meetup. Drives "next session" on the front page and Room Tonight.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text NOT NULL | |
| topic | text NULL | |
| venue | text NULL | |
| starts_at | timestamptz NOT NULL | |
| created_at | timestamptz NOT NULL | `now()` |

### checkins
Member × session, for the live Room Tonight wall. One check-in per person per session.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid NOT NULL | FK → sessions(id) ON DELETE CASCADE |
| member_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| created_at | timestamptz NOT NULL | `now()` |
| — | UNIQUE (session_id, member_id) | one check-in per person per session |

### events — the append-only spine
Every action lands here as one row, in addition to mutating its feature table. Never
updated or deleted in normal operation. `member_id` is the actor and is nullable so the log
survives a member deletion.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | `generated always as identity` — cheap monotonic ordering |
| member_id | uuid NULL | FK → members(id) ON DELETE SET NULL |
| type | text NOT NULL | see event types below |
| payload | jsonb NOT NULL default '{}' | shape depends on `type` |
| created_at | timestamptz NOT NULL | `now()` |

**Event types (v1):**

| type | emitted when | payload shape |
|------|--------------|---------------|
| `member.joined` | onboarding completes | `{ answers, generated }` |
| `member.edited` | a member saves their record | `{ changed: ["line","dream", …] }` |
| `pitch.posted` | a pitch is created | `{ pitch_id, title }` |
| `comment.posted` | a reply is added | `{ pitch_id, comment_id }` |
| `checkin` | a member checks into a session | `{ session_id }` |
| `corpus.asked` | someone queries the corpus chatbot | `{ question, matched: [ids] }` |
| `pitch.matched` | the match engine runs for a pitch | `{ pitch_id, suggested }` |
| `member.intake_form_submitted` | a member's data came from the pre-launch Google Form intake, not the in-app onboarding flow | `{ name, role, ai_usage, club_ask, socials_raw, phone_raw, submitted_at }` — the raw answers verbatim, so nothing is lost even where they only partially map onto `members.field`/`built`/`ask`. One event per submission; a member with duplicate submissions (same phone) gets one event per submission but only one `members` row (latest wins). |

Reading the log powers, with **no new tables**: the ship-log/activity feed, the dream-collab
heat map (aggregate `member.joined`/`member.edited` dream fields over time), "who's active,"
and analytics for sponsors. See `ROADMAP.md` phases 4–6.

### auth_challenges *(production auth only; skip for the prototype)*
Backs magic-link / OTP sign-in. The prototype's pick-a-name login uses none of this.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| phone | text NOT NULL | the identity being verified |
| code_hash | text NOT NULL | hash of the 6-digit OTP / magic token — never store the raw code |
| expires_at | timestamptz NOT NULL | short TTL (e.g. 10 min) |
| consumed_at | timestamptz NULL | set when redeemed; a code is single-use |
| created_at | timestamptz NOT NULL | `now()` |

---

## Hot-path queries

**The wall / directory** (public homepage):
```sql
select id, name, field, built, build_into, taste, ask, offer, dream, line, epithet, tags
from members
order by created_at desc;
```

**The pitch board with counts** (comments folded, loaded lazily):
```sql
select p.*, m.name as author_name,
       (select count(*) from comments c where c.pitch_id = p.id) as comment_count
from pitches p
join members m on m.id = p.author_id
order by p.created_at desc;
```

**Room Tonight live wall** (polled every ~2s during a session):
```sql
select c.created_at, m.name, m.epithet, m.ask
from checkins c
join members m on m.id = c.member_id
where c.session_id = :session_id
order by c.created_at desc;
```

**The dream-collab heat map** (the sponsor surface — pure aggregation, no new table):
```sql
select dream, count(*) as members, array_agg(name) as who
from members
where dream is not null and dream <> ''
group by dream
order by members desc;
```

---

## DDL — paste into the Supabase SQL editor

```sql
create extension if not exists "pgcrypto";  -- gen_random_uuid()

create table members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text unique,
  built       text,
  taste       text,
  contrarian  text,
  offer       text,
  ask         text,
  dream       text,
  socials     jsonb not null default '{}',
  field       text,
  build_into  text,
  line        text,
  epithet     text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pitches (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references members(id) on delete cascade,
  title      text not null,
  idea       text not null,
  ask        text,
  suggested  jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  pitch_id   uuid not null references pitches(id) on delete cascade,
  author_id  uuid not null references members(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table sessions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  topic      text,
  venue      text,
  starts_at  timestamptz not null,
  created_at timestamptz not null default now()
);

create table checkins (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create table events (
  id         bigint generated always as identity primary key,
  member_id  uuid references members(id) on delete set null,
  type       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Production auth only (magic-link / OTP). Omit for the pick-a-name prototype.
create table auth_challenges (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Indexes for the hot paths
create index idx_members_created   on members(created_at desc);
create index idx_members_tags      on members using gin(tags);
create index idx_pitches_author    on pitches(author_id);
create index idx_pitches_created   on pitches(created_at desc);
create index idx_comments_pitch    on comments(pitch_id);
create index idx_checkins_session  on checkins(session_id);
create index idx_events_member     on events(member_id, created_at desc);
create index idx_events_type       on events(type, created_at desc);

-- Keep members.updated_at honest
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_members_touch
  before update on members
  for each row execute function touch_updated_at();
```

---

## RLS note (read before exposing anything to the browser)

All DB access is server-side through FastAPI, so **RLS is not required today** and these
tables are left open. This is safe **only** because the frontend never holds a Supabase key
— it talks to FastAPI, which holds the connection string.

The moment anyone exposes the Supabase **anon key** in the browser (e.g. to add Realtime for
Room Tonight), an un-RLS'd database is world-readable *and writable*. If you go that route,
`alter table <t> enable row level security;` on every table **first**, then write policies.
See `ARCHITECTURE.md §5.2`.

