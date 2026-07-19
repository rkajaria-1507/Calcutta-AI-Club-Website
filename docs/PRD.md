# PRD — ClubOS

## 1. Problem

The Calcutta AI Club has no shared memory. Members build things nobody sees,
session attendance is unpredictable, and demo days leave no trace. The club runs
on WhatsApp for chat and nothing for *state*.

We are not building a chat app or a social network. We are building the club's
**collective memory and its hype engine**: a place that makes shipped work visible,
makes attendance social, and makes demo days competitive and memorable.

## 2. Success metric

One question, from the brief:

> **Would we actually use it at the next session?**

Concretely, we win if, during judging, the room pulls out their phones, joins via
QR, and votes on the live scoreboard — turning the judges into users in real time.
That single moment is the product demo *and* the proof.

Secondary signals: the wall is populated (not empty), RSVPs show real avatars,
the leaderboard updates live on the projector.

## 3. Users

| User | Needs |
|------|-------|
| **Member** (the room) | See what others built, show what they built, RSVP, vote on demo day |
| **Organizer / admin** | Create a session, open/close voting, project the scoreboard |
| **Visitor** (recruiting) | Read-only view of the wall as social proof |

## 4. Non-negotiables (v1 scope)

The product is broken without these.

1. **Lightweight identity** — name + avatar + one tagline. Join in < 30 seconds via QR. No passwords.
2. **Project post ("I built X")** — title, one-liner, link, optional image. The atomic unit of the wall.
3. **Session as an entity** — date, topic, venue. RSVP and demo-day both attach to it.
4. **RSVP** — one tap, three states (going / maybe / no), with a **visible avatar row** of who's coming. The count alone has no social gravity.
5. **Votes** — voter × project, **one vote per person enforced in the database** (not just the UI). The room *will* try to spam-vote; catching that gracefully is a live-demo flex.
6. **Admin voting toggle** — open/close voting per session, so the scoreboard reveal can be choreographed.

## 5. Strong should-haves (high ROI, add if time allows)

- **"Currently building" status** — one editable field on the profile ("rn building: a RAG bot for my dad's shop"). Makes the wall feel *alive* rather than archival. Highest ROI field in the app; near-non-negotiable.
- **Reactions** — one emoji tap on a project. Cheapest possible engagement loop.
- **Ship-log / feed view** — projects ordered by time. Not a new system; one query over existing tables. Natural homepage.

## 6. Deliberately excluded (do not get baited)

| Feature | Why it's out |
|---------|--------------|
| **Messaging** | The club already has WhatsApp. A dead in-app inbox makes the product feel abandoned. Use a `wa.me/<number>` deep link on profiles instead — connection feature, zero build. |
| **Notifications** | Push/email infra is hours of invisible work. The projected live leaderboard *is* the notification during the demo. |
| **Comments** | Moderation surface + ugly empty states + zero demo value. Reactions cover 90%. |
| **General posting / status feed** | Empty social networks are morgues. Posting is constrained to exactly two shapes: a **project** or a **"building now"** status. Constraint keeps the wall dense with only ~20 users. |
| **Image uploads** | `image_url` is a paste-a-link text field. Upload infra can wait. |

**Razor:** any feature that needs a *new table* is out of v1.

## 7. Core user flows

**Join (in the room)**
QR → `/join` → type name → you're in (token stored client-side). One screen.

**Post a project**
Wall → "+ I built something" → title, one-liner, link → appears on wall + ship-log.

**RSVP**
Sessions → next session → tap "Going" → your avatar joins the row instantly.

**Demo day (the showstopper)**
1. Admin creates the session's projects (or teams self-add), opens voting.
2. Room scans QR, votes 1–5 (or upvotes) on each project.
3. Projector shows `/sessions/{id}/leaderboard`, polling every 2s — ranks animate live.
4. Admin closes voting → winner reveal.

## 8. Constraints

- **Time:** ~3 hours, must deploy.
- **Team:** 1 developer + 3 daily-AI-users (non-devs) on content, pitch, design.
- **Demo assumes:** in-person, projector, audience phones. If any of that is missing, the live-vote showstopper degrades to a pre-seeded scoreboard walkthrough.

## 9. Out of scope for the hackathon (roadmap slide)

Streaks & badges · GitHub activity import · WhatsApp/email reminders · RSVP waitlists ·
weighted judge voting · season-long points ladder · skill directory & teammate matching ·
Supabase Realtime upgrade. Show these on one "what's next" slide — never build them today.
