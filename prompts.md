# Prompts — how Parallel was built

This file captures the prompts that drove the build, in order, so the work is reproducible
and auditable. Two kinds of prompts are recorded:

1. **User prompts** — the requests that shaped the project (lightly de-slang'd for clarity,
   intent preserved).
2. **Agent prompts** — the briefs given to background sub-agents that built whole subsystems.

The binding decisions these produced live in [`docs/DECISIONS.md`](docs/DECISIONS.md); the
features/standards in [`docs/`](docs/README.md); lessons learned in
[`docs/KNOWLEDGEBASE.md`](docs/KNOWLEDGEBASE.md).

---

## 1. User prompts (chronological)

1. **Initial brief.** Build a lazy-loading, infinite-scroll, TikTok-style website. Content
   comes from a Python script that scans the Spotify API. Profile + top search + friends /
   seeing their likes. React frontend, Python **Flask** backend. Deploy to prod in a
   container; provide a local Makefile for implementation/debugging. Recommend MCP servers if
   needed, otherwise native tooling — and drive the build autonomously.

2. **Docker.** Make sure to create docker-compose / Dockerfiles for all of this.

3. **Standards.** Use **MUI** for components. Hamburger menu with profile + theme settings,
   **dark mode default**, a nice font, and **phone support is mandatory**. Run a gap analysis
   on what's known and ask questions to fill the rest.

   → Answered clarifying questions: TypeScript; **follow** (asymmetric) social model;
   **bottom tab bar + top app bar + hamburger**; **Space Grotesk + cyan #00E5C8** dark theme.

4. **Docs as source of truth.** Create a `docs/` folder holding all decisions as **SPECS**
   that bind development to the model. Create a root **CLAUDE.md** referencing the docs.

5. **Knowledgebase.** Whenever a problem is hit or something is learned, update the
   knowledgebase and put it in CLAUDE.md — retain **positive and negative** knowledge at all
   costs.

6. **TDD + structure.** Use **TDD** with smoke tests; no fragile stuff that constantly breaks.
   Use **classes and separation of concerns**.

7. **Default data + auth.** Provide default/seed data. Add **browser-side caching for login
   creds**, plus **login/signup** pages and **password reset** — but there's no email, so do a
   **URL/QR-code based** reset.

8. **Housekeeping.** Add a `.gitignore` for build artifacts, make the license **MIT**, add a
   `README.md`.

9. **Git.** Use git to check things in.

10. **Continue.** Carry the build through to completion autonomously.

11. **Next phase ("YES" to all).** Build **comments + shares**; **wire real Spotify**
    (needs creds); **polish/harden** (CI, rate-limiting, prod cookie security, coverage); and
    add a follow-up commit documenting the frontend.

12. **Login URL.** "Port 5000 gives a not found" → clarified the app runs on **:5173** and the
    login route is **/login** (fixed a route/proxy-prefix collision).

13. **This file.** Drop all the prompts needed to build this suite into a `prompts.md`.

---

## 2. Agent prompts (sub-agent briefs)

### A. Frontend app (React + TS + Vite + MUI)
> Build the entire `frontend/` for "Parallel", a TikTok-style infinite-scroll music app,
> conforming exactly to the binding SPECs (`docs/SPEC-frontend.md`, `SPEC-api.md`,
> `SPEC-auth.md`, `SPEC-product.md`, `CLAUDE.md`). Stack: React + TypeScript + Vite + MUI,
> TanStack Query, mobile-first, dark default + toggle, installable PWA, Space Grotesk + cyan
> `#00E5C8`. Build theme, typed API client (`credentials:'include'`, relative paths), Auth
> context with a localStorage **identity snapshot** (never secrets), `useInfiniteQuery` feed
> over cursor pages, and components/pages: AppShell (AppBar+search+hamburger, BottomNavigation
> Feed/Search/Friends/Profile, Drawer with profile + theme toggle), FeedList (full-screen
> scroll-snap + IntersectionObserver sentinel), FeedCard (muted autoplay only when active,
> tap-to-unmute, optimistic like), Feed/Search/Friends/Profile pages, Auth page (Spotify +
> local login/signup + forgot-password rendering the returned reset URL as a **QR**), Reset
> page. Vite dev proxies `/api` + `/auth` to the backend. PWA manifest + icons. Vitest + RTL
> smoke tests. Verify: `tsc --noEmit`, `npm run build`, `vitest run` all green. Touch only
> `frontend/`.

### B. Comments + shares UI (extending the existing frontend)
> Extend the existing `frontend/` to add comments and shares against the live backend
> contract (item payloads now include `comment_count`/`share_count`/`shared`;
> `GET/POST /api/items/:id/comments`, `DELETE /api/comments/:id`, `POST /api/items/:id/share`).
> Add `useComments` + `useShare` hooks (cache-patching, optimistic with rollback — mirror
> `useLike`), comment + share action buttons with counts on FeedCard, a bottom-sheet
> CommentsSheet (list, post, author-only delete), and deterministic Vitest tests using the
> existing fetch-stub harness. Mirror existing conventions; do not rebuild existing parts.
> Verify `tsc --noEmit`, `npm run build`, `vitest run`. Touch only `frontend/`.

---

## 3. Reproduce from scratch (TL;DR)

```bash
cp .env.example .env      # runs fully offline (mock Spotify + dev-login)
make up                   # db + api + frontend (hot reload)  → http://localhost:5173
make seed                 # default data: 120 items + demo users + follow graph
make test                 # backend pytest + frontend vitest (must be green)
make prod                 # gunicorn + built React served same-origin + postgres
```

> The decisions, contracts, and standards behind these prompts are the SPECs in `docs/`. If a
> future change contradicts a SPEC, update the SPEC + `docs/DECISIONS.md` in the same change —
> the docs are the source of truth, not the code.
