# BUILD_PLAN — ClubOS (3 hours, must deploy)

You are the only developer. Three teammates who use AI daily handle content, pitch,
and design **in parallel** — they are not idle. Deploy *early and often*: a deployed
ugly app beats a beautiful localhost one.

## The one rule
**Deploy skeletons in the first 45 minutes**, while there's nothing to break. Never let
"first deploy" be a task you discover at hour 3.

---

## Timeline

### 0:00–0:20 — Foundations (everyone at once)
- **You:** create the GitHub repo (mono or two folders `api/` + `web/`). Create empty
  Render service (blank FastAPI) and Vercel project (blank Next.js). Get both *deployed
  and green* before writing real logic. Create the Supabase project, run `SCHEMA.md` DDL
  in the SQL editor. Set env vars (see below) on Render + Vercel now.
- **Content person:** start collecting the 4 members' real profiles + 6–10 real projects
  (title, one-liner, link, image URL). This seed data is what makes the wall look alive.
- **Pitch person:** draft the demo narrative + the "what's next" roadmap slide.
- **Design person:** logo, color, and generate UI mockups (v0/Claude) for wall + scoreboard.

### 0:20–1:10 — Backend core (you)
Build the endpoints in this order — each unblocks a frontend screen:
1. `POST /join`, `GET /me`, `PATCH /me` (JWT issue + verify).
2. `POST /projects`, `GET /projects`, `GET /members`.
3. `POST /sessions`, `GET /sessions`, `GET /sessions/{id}`, `PATCH /sessions/{id}`.
4. `PUT /sessions/{id}/rsvp`, `GET /sessions/{id}/rsvps`.
5. `POST /sessions/{id}/vote` (+ the 403/409 logic), `GET /sessions/{id}/leaderboard`, `GET /sessions/{id}/my-votes`.
6. `GET /health` (static, no DB).

Deploy after step 2 and again after step 5. Test with the FastAPI `/docs` Swagger UI —
free interactive test client, no Postman needed.

### 1:10–2:15 — Frontend (you) — screens in priority order
1. **Join screen** (`/join`) — name → store token → redirect to wall.
2. **Wall** (`/`) — grid of project cards + members. This is the "who's built what."
3. **Scoreboard** (`/sessions/[id]/board`) — the showstopper. Poll leaderboard every 2s,
   animate rank order, big and projector-friendly. Vote buttons on each project.
4. **RSVP** on the session page — going/maybe/no + avatar row.
5. Admin: a tiny page or just curl/Swagger to create the session and flip `voting_open`.
   Don't build admin UI if Swagger works — save the time.

Meanwhile the **content person seeds real data through the live app** as soon as `/join`
and `POST /projects` work. By the time you finish the scoreboard, the wall is populated.

### 2:15–2:40 — Wire the demo + harden
- Create the demo session, add the hackathon teams as "projects," open voting.
- Test the full loop on a phone: join → vote → watch the board move.
- **Bug sweep** (see checklist below).
- Set up the uptime pinger → `/health` every 10 min.

### 2:40–3:00 — Freeze, warm, rehearse
- **Code freeze.** No new features. Only crash fixes.
- Warm the backend (hit `/health`) and leave the scoreboard open on the projector.
- Pitch person runs the demo script once end-to-end.

---

## Team split (the 3 non-devs are load-bearing)

| Person | Owns |
|--------|------|
| **Content** | Real member profiles + 6–10 seeded projects entered *through the live app*. A populated wall is 50% of the judge test. |
| **Pitch** | Demo choreography + roadmap slide + who-says-what. Rehearse the QR→vote moment twice. |
| **Design** | Logo, palette, AI-generated mockups you paste in, the projector view looking clean. |

---

## Deploy setup (do this at 0:00, not 2:50)

**Supabase**
- Project → SQL editor → paste `SCHEMA.md` DDL → run.
- Settings → Database → copy the **pooled** connection string (port 6543) → this is `DATABASE_URL`.

**Render (backend)**
- New Web Service → connect repo → root `api/`.
- Build: `pip install -r requirements.txt` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars:
  ```
  DATABASE_URL=postgresql://...:6543/postgres
  JWT_SECRET=<long random string>
  ADMIN_SECRET=<long random string>
  CORS_ORIGINS=https://<your-vercel-app>.vercel.app,http://localhost:3000
  ```

**Vercel (frontend)**
- Import repo → root `web/`.
- Env var: `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
- Note: `NEXT_PUBLIC_` vars are baked in at **build time** — after changing it, redeploy.

**Uptime pinger** (UptimeRobot or cron-job.org, free)
- Monitor `https://<render>.onrender.com/health` every 10 min. Keeps the dyno warm.

---

## Bug sweep checklist (the senior-dev pass before freeze)

- [ ] **CORS** — the deployed Vercel origin is in `CORS_ORIGINS`, exact scheme + host. Preview URLs differ from prod.
- [ ] **Double vote** — voting twice for one project returns **409**, and the UI shows "already voted," not a crash.
- [ ] **Self vote** — you cannot vote for your own project (**403**).
- [ ] **Voting closed** — voting before admin opens it returns **403**; the button is disabled client-side too.
- [ ] **Token from token, not body** — no endpoint trusts a member id from the request body.
- [ ] **Cold start** — hit `/health` after 15 min idle; confirm the pinger is actually firing.
- [ ] **Empty states** — an unpopulated wall / no-RSVP session looks intentional, not broken.
- [ ] **Leaderboard stability** — equal scores don't make rows jitter (the `created_at` tiebreaker).
- [ ] **Rank correctness** — highest score is rank 1; verify with 3 test votes.
- [ ] **`NEXT_PUBLIC_API_URL`** — points at prod Render, not localhost, and you redeployed after setting it.
- [ ] **Poll interval** — 2s, and it stops polling when the tab is hidden (don't hammer a cold dyno).
- [ ] **HTTPS everywhere** — mixed content (http API from https page) is blocked by browsers.

---

## Cut-lines (if you fall behind, drop in this order)

1. Reactions
2. Admin UI (use Swagger/curl instead)
3. `my-votes` (UI just won't show voted-state — acceptable)
4. Member detail page (wall cards are enough)
5. RSVP avatar row → fall back to a count

**Never cut:** join, wall, post project, the scoreboard with live voting. That is the demo.

---

## Demo script (≈2 min)

1. "The club had no memory — here's its wall." Show the populated wall + a "building now" status.
2. "Sessions have RSVPs." Show the avatar row filling as a teammate RSVPs live.
3. **The moment:** "Every team here is on our scoreboard. Scan this QR and vote." Room joins and votes; ranks move live on the projector.
4. Admin closes voting → winner reveal (confetti if you have 5 spare minutes).
5. One roadmap slide. End on: *"You just used it. Would you use it next session?"*
