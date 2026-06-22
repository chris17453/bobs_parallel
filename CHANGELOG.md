# Changelog

Notable changes, newest first. This also documents work that landed via auto-commits with
generic messages (e.g. the frontend, originally committed as "initial").

## Unreleased

### Added
- **Notifications** — a new follower notifies the followed user. Backend (Notification model,
  `NotificationService`, created on follow, list/unread-count/mark-read API) and frontend
  (app-bar bell with unread `Badge`, bottom-sheet list, `useNotifications`/`useUnreadCount`
  hooks). Demo seed gives `dev-you` follow-back notifications so the bell isn't empty.
- **Comments & shares** — backend (Comment/Share models, `EngagementService`, flat comments
  with author-only delete, idempotent shares) and frontend (action buttons with counts,
  bottom-sheet `CommentsSheet`, `useComments`/`useShare` hooks). Feed/item payloads now carry
  `comment_count`, `share_count`, and `shared`.
- **Frontend app** (React + TypeScript + Vite + MUI) — *this is the work that the auto-push
  recorded as the commit titled "initial".* Dark-default theme (Space Grotesk, cyan `#00E5C8`),
  mobile-first, installable PWA. AppShell (AppBar + search + hamburger drawer, bottom nav),
  TikTok snap-scroll feed with IntersectionObserver lazy-load and muted-autoplay previews,
  TanStack Query infinite feed, optimistic like/follow, Search/Friends/Profile pages, auth
  page (Spotify + local + dev-login), QR-code password reset, and a Vitest smoke suite.
- **Backend** — Flask app factory with strict layering (routes → services → repositories),
  Postgres, mock+real Spotify client behind `get_client()`, scanner/seeder, pytest suite.
- **Auth** — Spotify OAuth, local accounts (pbkdf2), dev-login, single-use QR/URL password
  reset (no email). Browser-side identity cache (non-secret snapshot only).
- **Hardening** — flask-limiter on auth endpoints (JSON 429), prod cookie security
  (`SESSION_COOKIE_SECURE`), session lifetime. GitHub Actions CI (ruff + pytest, tsc + vitest
  + build).
- **Real-Spotify prep** — `make spotify-check` connectivity check + `docs/SPOTIFY-SETUP.md`
  (going live is an env-drop, no code changes).
- **Infra** — Dockerfiles, dev + prod Docker Compose, Makefile, PWA manifest.
- **Docs** — binding SPEC set in `docs/`, `DECISIONS.md`, `KNOWLEDGEBASE.md`, root `CLAUDE.md`,
  `prompts.md` (full prompt trail), MIT `LICENSE`, `README.md`.

### Fixed
- SPA login route `/auth` collided with the proxied `/auth` API prefix → renamed to `/login`
  (KNOWLEDGEBASE N8).
- Vite dev proxy targeted `localhost`, unreachable across containers → env-driven
  `VITE_PROXY_TARGET` (N7).
- `psycopg2-binary` pinned to 2.9.10 for Python 3.13 wheels (N6).
- Domain error handler now returns the specific machine code, not the generic class code.
