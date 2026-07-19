# SCHEMA — ClubOS

Postgres (Supabase). **Run the DDL at the bottom directly in the Supabase SQL editor** —
no migration tooling for the hackathon.

Design rules:
- UUID primary keys (`gen_random_uuid()`), so ids are unguessable and safe as tokens/URLs.
- `timestamptz` everywhere, never naive timestamps.
- Integrity that matters (one vote per person, one RSVP per person) is enforced by
  **DB constraints**, not application code.
- `ON DELETE CASCADE` from members/sessions so cleanup is automatic.

---

## Tables

### members
Lightweight identity. No password. `building_now` is the "currently building" status.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| name | text NOT NULL | not unique — two "Rahul"s can coexist; identity is the token |
| avatar_url | text NULL | or an emoji/color seed rendered client-side |
| tagline | text NULL | one line |
| building_now | text NULL | "rn building: …" |
| created_at | timestamptz NOT NULL | `now()` |

### sessions
A club meetup. `voting_open` is the admin toggle for the scoreboard.

> Naming note: the club calls these "sessions." There is no auth-session table in this
> design, so there's no collision in the DB — but if it bothers you in code, alias to `events`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text NOT NULL | |
| topic | text NULL | |
| venue | text NULL | |
| starts_at | timestamptz NOT NULL | |
| voting_open | boolean NOT NULL | default `false` |
| created_at | timestamptz NOT NULL | `now()` |

### projects
The atomic unit of the wall. `session_id` (nullable) means "entered in this demo day."
A wall-only project has `session_id = NULL`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| title | text NOT NULL | |
| tagline | text NULL | one-liner |
| link | text NULL | demo url |
| repo_url | text NULL | |
| image_url | text NULL | paste-a-link, no upload |
| session_id | uuid NULL | FK → sessions(id) ON DELETE SET NULL |
| created_at | timestamptz NOT NULL | `now()` |

### rsvps
Member × session. One RSVP per person per session (upsert on change).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| member_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| session_id | uuid NOT NULL | FK → sessions(id) ON DELETE CASCADE |
| status | text NOT NULL | CHECK in ('going','maybe','no') |
| created_at | timestamptz NOT NULL | `now()` |
| — | UNIQUE (member_id, session_id) | one per person per session |

### votes
Voter × project. **The critical constraint: one vote per voter per project.**
`session_id` is denormalized so per-session tallies are a single indexed scan.
`score` supports both simple upvotes (always 1) and 1–5 ratings.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| voter_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| project_id | uuid NOT NULL | FK → projects(id) ON DELETE CASCADE |
| session_id | uuid NOT NULL | FK → sessions(id) ON DELETE CASCADE |
| score | int NOT NULL | default 1, CHECK between 1 and 5 |
| created_at | timestamptz NOT NULL | `now()` |
| — | UNIQUE (voter_id, project_id) | **one vote per person per project** |

> **Self-vote rule** (`voter_id != owner_id`) can't be a simple CHECK across tables.
> Enforce it in the app layer (the vote endpoint queries the project owner). A trigger is
> provided below as belt-and-suspenders if you have spare minutes.

### reactions *(optional — add only if time allows)*
One of each emoji per person per project.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| member_id | uuid NOT NULL | FK → members(id) ON DELETE CASCADE |
| project_id | uuid NOT NULL | FK → projects(id) ON DELETE CASCADE |
| emoji | text NOT NULL | |
| created_at | timestamptz NOT NULL | `now()` |
| — | UNIQUE (member_id, project_id, emoji) | |

---

## The leaderboard query (the polled hot path)

```sql
SELECT p.id, p.title, p.tagline, p.image_url,
       m.name AS owner_name, m.avatar_url AS owner_avatar,
       COALESCE(SUM(v.score), 0) AS score,
       COUNT(v.id)               AS vote_count
FROM projects p
JOIN members m       ON m.id = p.owner_id
LEFT JOIN votes v    ON v.project_id = p.id
WHERE p.session_id = :session_id
GROUP BY p.id, m.name, m.avatar_url
ORDER BY score DESC, vote_count DESC, p.created_at ASC;
```

The final `created_at ASC` tiebreaker keeps ranks stable so the projected board doesn't
jitter between equal scores.

---

## DDL — paste into Supabase SQL editor

```sql
-- Extensions (pgcrypto for gen_random_uuid on older projects; usually already on)
create extension if not exists "pgcrypto";

create table members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  avatar_url   text,
  tagline      text,
  building_now text,
  created_at   timestamptz not null default now()
);

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  topic       text,
  venue       text,
  starts_at   timestamptz not null,
  voting_open boolean not null default false,
  created_at  timestamptz not null default now()
);

create table projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references members(id) on delete cascade,
  title      text not null,
  tagline    text,
  link       text,
  repo_url   text,
  image_url  text,
  session_id uuid references sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table rsvps (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  status     text not null check (status in ('going','maybe','no')),
  created_at timestamptz not null default now(),
  unique (member_id, session_id)
);

create table votes (
  id         uuid primary key default gen_random_uuid(),
  voter_id   uuid not null references members(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  score      int  not null default 1 check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (voter_id, project_id)
);

create table reactions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (member_id, project_id, emoji)
);

-- Indexes for the hot paths
create index idx_projects_session on projects(session_id);
create index idx_projects_owner   on projects(owner_id);
create index idx_projects_created on projects(created_at desc);
create index idx_votes_session    on votes(session_id);
create index idx_votes_project    on votes(project_id);
create index idx_rsvps_session    on rsvps(session_id);

-- OPTIONAL: DB-level self-vote guard (only if you have spare minutes)
create or replace function prevent_self_vote() returns trigger as $$
begin
  if exists (select 1 from projects p
             where p.id = new.project_id and p.owner_id = new.voter_id) then
    raise exception 'cannot vote for your own project';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_self_vote
  before insert on votes
  for each row execute function prevent_self_vote();
```

---

## RLS note (read this before exposing anything to the browser)

Access is server-side via FastAPI, so **RLS is not needed today** and these tables are
left open. This is safe **only** because the frontend never holds a Supabase key.

If you later add Supabase Realtime or any direct browser→Supabase access, you MUST enable
RLS on every table first (`alter table <t> enable row level security;`) and write policies —
otherwise the anon key exposes a fully open database. See `ARCHITECTURE.md §5.2`.
