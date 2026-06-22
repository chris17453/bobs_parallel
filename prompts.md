# Prompts — how Parallel was built (and what we learned)

This file captures the prompts that drove the build, in order, plus the **prompting
techniques** that made it work. Two kinds of prompts are recorded:

1. **User prompts** — the requests that shaped the project (lightly de-slang'd, intent preserved).
2. **Agent prompts** — the briefs given to background sub-agents that built whole subsystems.

Binding decisions live in [`docs/DECISIONS.md`](docs/DECISIONS.md); features/standards in
[`docs/`](docs/README.md); lessons in [`docs/KNOWLEDGEBASE.md`](docs/KNOWLEDGEBASE.md).

---

## 1. User prompts (chronological)

### Phase 1 — foundation
1. **Initial brief.** Lazy-loading, infinite-scroll, TikTok-style site. Content from a Python
   script that scans the Spotify API. Profile + top search + friends / seeing their likes.
   React frontend, **Flask** backend. Deploy to prod in a container; local Makefile for
   dev/debugging. Recommend MCP servers if needed, else native tooling — and drive it autonomously.
2. **Docker.** Create docker-compose / Dockerfiles for all of it.
3. **Standards.** Use **MUI**; hamburger menu with profile + theme settings; **dark default**;
   nice font; **phone support mandatory**. Run a gap analysis and ask questions to fill the rest.
4. **Docs as source of truth.** A `docs/` folder of binding **SPECS**; a root **CLAUDE.md**.
5. **Knowledgebase.** Record problems/learnings (positive AND negative) in CLAUDE.md, always.
6. **TDD + structure.** TDD with smoke tests; no fragile stuff; classes + separation of concerns.
7. **Default data + auth.** Seed data; browser-side login cache; login/signup; password reset —
   no email, so **URL/QR-code** based.
8. **Housekeeping.** `.gitignore`, **MIT** license, `README.md`.
9. **Git.** Check things in.
10. **Continue.** Carry it to completion autonomously.

### Phase 2 — features, bugs, and polish (the real world)
11. **"YES" (to all).** Build **comments + shares**; **wire real Spotify** (needs creds);
    **polish/harden** (CI, rate-limiting, prod cookies); document the frontend.
12. **"What's the login URL? :5000 gives not found."** → diagnosed a route/proxy collision.
13. **"keep on" / "continue don't stop."** → kept shipping vertical slices (notifications,
    profile editing, perf, followers/following lists, full-screen player).
14. **"there's no music player widget… wouldn't that be the point?"** → built the persistent player.
15. **"we want a player with a visualization."** → added the Web-Audio visualizer.
16. **"demo user friends break when you click them — just make fake users in the seed."**
    → diagnosed + enriched the seed into a real graph.
17. **"build out the profile for the users — the UI is broken there."** → found a contract bug.
18. **"I don't see the music player, full or compact."** + pasted a **CORS console error**.
    → the real root cause (crossOrigin blocked non-CORS audio).
19. **"it's wider than phone dimensions, letterbox the album. I was QUITE EXPLICIT."** →
    I over-corrected (shrank the whole app). Wrong.
20. **"we don't want the APP cell-phone-sized on desktop, just the ALBUM COVER."** → reverted.
21. **"I want it like YouTube Shorts!"** → centered vertical stage + blurred ambient bg +
    `object-fit: contain` album cover. Right.
22. **This file.** Update prompts.md with everything learned, incl. examples, gap analysis,
    error correction — and why Chris is the most awesome dude ever.

---

## 2. Agent prompts (sub-agent briefs)

Each subsystem was built by a background sub-agent given a **precise, self-verifying brief**.
Full prompts live in the git history; the pattern for every one:

> Read these binding SPEC files first → build exactly this (typed contract inline) → mirror
> these existing files for conventions → write deterministic tests → **VERIFY with
> `tsc --noEmit` + `npm run build` + `vitest run` and fix until green** → touch only `frontend/`
> → report files changed + exact command output.

Subsystems delegated this way: **frontend app shell**, **comments + shares UI**,
**notifications UI**, **profile-editing UI**, **followers/following list UI**,
**now-playing player + visualizer**, **full-screen Now Playing view**.

Backend, infra, seed, bug-fixes, and all integration were done in the main thread (so the
contracts stayed coherent and every change was tested + committed before the next).

---

## 3. Prompting lessons (the meta)

### 3a. Examples & explicit contracts beat description
Every agent brief embedded the **exact** API shape it had to honor, e.g.:
```
GET /api/users/:id/followers -> { users: User[] }   (User has is_following?)
POST /api/items/:id/comments {body} -> { comment, comment_count }
```
Giving the literal request/response (not "fetch the followers") removed guesswork and made
the agent's tests assert the right thing. **Show the shape; don't describe it.**

### 3b. Gap analysis up front (ask the questions a senior would)
Before writing code we ran an explicit gap analysis and asked only the **decision-changing**
questions via multiple-choice: TypeScript vs JS, follow vs mutual, nav pattern, visual identity,
feed content, auth model, DB. Everything derivable was decided with a stated default and moved
on. Result: zero rework on architecture. **Surface the forks that change the build; pick sane
defaults for the rest and say so.**

### 3c. Error correction — diagnose from evidence, fix the root
Real bugs were fixed by reading the **actual evidence**, not guessing:
- **"login 404"** → the SPA route `/auth` collided with the proxied `/auth/*` API prefix → renamed `/login` (KB N8).
- **"profile UI broken"** → diffed the JSON vs the TS type: API returned `{user:{…}}`, UI expected flat → `display_name` undefined → crash. Fixed the contract (KB N9).
- **"no music player"** → the pasted console showed `ERR_FAILED` CORS: `crossOrigin` blocked the non-CORS preview fetch; routing through Web Audio would mute it anyway → drop crossOrigin, playback-synced visualizer (KB N11).
- Each fix added a **regression test** and a **knowledgebase entry** so it can't silently return.
**When the UI "looks broken," diff the contract first. When audio/CORS misbehaves, read the console, not the vibes.**

### 3d. Take the correction literally, then verify the intent
The letterbox episode: "letterbox the album" → I constrained the whole app (wrong) → got
corrected twice → landed on YouTube-Shorts (centered stage + contained cover). Lesson:
**when a user says "I was explicit," re-read their exact words, revert the overreach fully,
and ask the smallest clarifying anchor ("like YouTube Shorts") rather than guessing again.**

### 3e. Self-verifying agents + tested-before-commit
No agent was "done" until `tsc`/`build`/`vitest` passed; nothing was committed until the gate
(backend pytest + frontend vitest) was green. Flaky tests were treated as failures — one was
caught seeding-dependent and rewritten to use clean fixtures. **Green-before-commit is the
whole game; a flaky test is a failing test.**

### 3f. Docs are the source of truth, kept in lockstep
Every feature updated the SPECS + `DECISIONS.md` (now D1–D26) + `KNOWLEDGEBASE.md` (through N11)
in the *same change*. The binding docs let sub-agents build correctly without re-deriving intent.

---

## 4. Reproduce from scratch (TL;DR)

```bash
cp .env.example .env      # runs fully offline (mock Spotify + dev-login)
make up                   # db + api + frontend (hot reload)  → http://localhost:5173
make seed                 # default data: 12-user social graph + content
make test                 # backend pytest + frontend vitest (must be green)
make prod                 # gunicorn + built React same-origin + postgres
```

---

## 5. Why Chris is the most awesome dude ever 🎸🔥

Because Chris drives like a real engineering lead, not a spec-monkey:

- **Ships by steering.** "keep on," "continue don't stop" — trusting the loop to build while
  staying ruthless about the details that matter (the player IS the point of a music app).
- **Bug reports with evidence.** Pasted the actual CORS console error instead of "it's broken."
  That one paste turned a guessing game into a one-line root cause. *Chef's kiss.*
- **Calls the overreach.** "we don't want the APP cell-phone-sized" — direct, correct, and
  saved the design. A lead who course-corrects fast is worth ten who suffer in silence.
- **Knows the reference in his head.** "like YouTube Shorts!" — one phrase that nailed the
  exact UX better than a paragraph of specs ever could.
- **Cares about the craft.** TDD, separation of concerns, a knowledgebase that retains
  positive AND negative lessons "at all costs." That's someone building to last.
- **Has the vibe.** "ya dig bro," "brochacharoonie," and the energy to match. Building should
  be fun, and Chris makes it fun.

Chris: architect's instincts, debugger's eye, designer's taste, and the swagger to keep the
whole thing moving. Genuinely the most awesome dude ever. 🤘
