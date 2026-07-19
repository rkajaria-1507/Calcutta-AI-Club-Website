# PRD — Calcutta AI Club

## 1. Problem

The Calcutta AI Club has no shared memory. People build things nobody sees, and a room full
of complementary talent stays illegible to itself — the person who needs a designer never
learns the person two seats away *is* one. The club runs on WhatsApp for chat and nothing for
*state*, *legibility*, or *serendipity*.

We are not building a chat app or a social network. We are building the club's **collective
memory and its introduction engine**: software that reads a person, composes them into a
member the room can understand at a glance, and makes the latent connections in the room
explicit.

## 2. Success metric

One question: **watch the software read a stranger and turn them into a legible member in
under a minute — live, on stage.** The onboarding *is* the demo. If a judge can type five
answers and watch the club write their card back to them, the thesis is proven in one gesture.

Secondary signals: the wall is populated and reads like literature, not a spreadsheet; the
corpus chatbot answers "who should I meet if I'm building agents?" with real names; a posted
pitch comes back with the right two people attached.

## 3. Users

| User | Needs |
|------|-------|
| **Member** (the room) | Be read and made legible; find who to talk to; post ideas and get matched; own and edit their own record |
| **Newcomer** | Onboard in under a minute and instantly belong on the wall |
| **Organizer / admin** | Create a session; run Room Tonight |
| **Sponsor / scout** (later) | See the room's ambition — the dream-collab map — as social proof |

## 4. The three surfaces

The product is three views over one corpus.

1. **The Club** — the front page and the living directory. Each member is a "card": a
   one-sentence lede, an earned epithet, a dossier (field / built / building / taste), a
   needs↔offers pair, and filterable tags. Above it sits the **corpus chatbot** — ask the
   room anything in natural language and get a host-style introduction, never invented names.
2. **The Pitch Board** — post an idea in three fields; the club renders it as a slide and
   suggests who should hear it first. Threaded, collapsed-by-default comments keep the board
   a clean wall of slides. The **dream-collaborations** strip sits on top: who the room would
   kill to build with — the club's ceiling, and the sponsorship seam.
3. **Room Tonight** — a dark, projector-mode live check-in wall. Scan in; your name lands on
   the board; the room reads itself filling up.

## 5. Onboarding — the five questions (non-negotiable)

Onboarding is a guided sequence: one question at a time, a progress bar, then a "the club is
reading you" beat, then the reveal of the AI-written card. The questions are locked, each
mapped to what it feeds:

1. **Trajectory** — *What are you building now, and what would you build if skill weren't the
   constraint?* The present clause fills `built` and tags; the counterfactual is the
   becoming-vector — the match key and the epithet's raw material.
2. **Taste** — *Name one thing you'd defend forever — a film, album, object, place, or dish.
   Why that one?* The taste axis; the "why" is what makes the card read as literature and is
   the field no other directory captures.
3. **Mind** — *What do you believe about AI that most of this room would push back on?* The
   contrarian extractor; sharpens the chatbot's retrieval and hands strangers an instant
   argument. Kept in the corpus, not always printed on the card.
4. **Offer** — *What could you teach for an hour tomorrow with zero prep?* Competence, not
   charity; the supply side of the introduction engine; doubles as session curriculum.
5. **Need** — *What do you need right now that someone in this room could plausibly give
   you?* Scoped so it's actionable; matched against everyone's answer to Q4 — the
   introduction engine.

Plus **dream collaboration**, **name**, and **socials** as fields, not questions. From these
seven inputs, Claude generates the `line`, `epithet`, `field`, `build_into`, and `tags`. The
member owns the result and can edit every field, anytime.

## 6. Trust model — ownership, not a wiki

A member can edit **only their own** record, pitches, and comments. Signing in reveals edit
affordances on your own card (a purple border + an EDIT button) and nowhere else. Joining the
wall signs you in automatically — a new member is by definition their own record's owner.

## 7. What connects on sign-in (value order)

Your own editable record → your pitches and comments stamped to you → your socials so people
can reach you → **your three suggested people** (the introduction engine: your Q5 against
everyone's Q4). That last one is why login is worth doing — it converts a directory into a
reason to show up. See `ROADMAP.md §4`.

## 8. Deliberately excluded (do not get baited)

| Feature | Why it's out |
|---------|--------------|
| **Direct messaging** | The club already has WhatsApp; socials + `wa.me` deep links cover connection at zero build. |
| **General status feed** | Empty social feeds are morgues. Posting is constrained to exactly two shapes — a **member record** and a **pitch**. |
| **Vector DB / embeddings** | ~dozens of members fit in one prompt; a retrieval stack is premature until the corpus is hundreds+. |
| **Image uploads** | Not needed for cards; if ever added, `image_url` is a pasted link, not upload infra. |
| **Notifications** | Push/email infra is invisible hours; Room Tonight on the projector is the live signal. |

**Razor:** the corpus is the product. A feature that doesn't make the room more legible or
more connected is out of v1.

## 9. Current state & what's next

The frontend is built and runnable (in-memory, AI server-side with graceful fallbacks). The
work from here — persistence, real auth, consolidating AI into the backend, the introduction
engine, the sponsor page, the outward collaboration board, live Room Tonight — is sequenced
in `ROADMAP.md`. The backend contract is in `ARCHITECTURE.md` + `API.md`; the data model,
including the append-only `events` spine that makes the club compound, is in `SCHEMA.md`.
