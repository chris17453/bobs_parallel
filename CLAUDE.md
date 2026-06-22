# CLAUDE.md — Parallel

Working agreement for this repo. **The `docs/` SPECS are the source of truth.** Code conforms
to the docs; when something must change, update the SPEC + `docs/DECISIONS.md` in the same change.

## What this is
A TikTok-style, lazy-loading, infinite-scroll music discovery app. Spotify content scanned by a
Python job; follow people and see their likes. React + MUI frontend, Flask + Postgres backend,
fully containerized.

## Read these first (binding)
- [docs/README.md](docs/README.md) — index
- [docs/SPEC-product.md](docs/SPEC-product.md) — features & UX standards
- [docs/SPEC-architecture.md](docs/SPEC-architecture.md) — system shape & principles
- [docs/SPEC-backend.md](docs/SPEC-backend.md) — layering, **service classes**, conventions
- [docs/SPEC-frontend.md](docs/SPEC-frontend.md) — React/TS/MUI, theme, nav, data layer
- [docs/SPEC-data-model.md](docs/SPEC-data-model.md) — entities & **cursor pagination**
- [docs/SPEC-api.md](docs/SPEC-api.md) — REST contract
- [docs/SPEC-auth.md](docs/SPEC-auth.md) — Spotify OAuth, local accounts, **QR reset**, cred cache
- [docs/SPEC-testing.md](docs/SPEC-testing.md) — **TDD**, smoke tests, no flakes
- [docs/SPEC-infra.md](docs/SPEC-infra.md) — Docker/Compose/Makefile/PWA
- [docs/DECISIONS.md](docs/DECISIONS.md) — decision log
- [docs/KNOWLEDGEBASE.md](docs/KNOWLEDGEBASE.md) — retained lessons

## Non-negotiable standards
- **OOP + separation of concerns.** Thin HTTP routes → **service classes** (business logic) →
  repositories/models (DB) + clients. No business logic in routes; no SQL in routes.
- **TDD.** Write the test first; ship behavior with tests in the same change; bugfixes get a
  regression test. `make test` must be green before merge/deploy. **Zero tolerance for flaky
  tests** — no network, no real clock/RNG dependence, no inter-test state.
- **Mobile-first + dark default + MUI.** Space Grotesk, cyan `#00E5C8`. Phone support is mandatory.
- **Offline-first dev.** The whole stack runs with no external creds (mock Spotify + dev-login).
  Swapping mock↔real Spotify is an **env flip, never a code edit**.
- **Secrets via env only.** Never commit secrets; `.env.example` documents every variable.
  Never store passwords/raw tokens in `localStorage` (identity snapshot only).
- **Default data exists.** `make seed` yields a non-empty, deterministic demo (content + users
  + follow graph).

## Knowledgebase — retain learnings at all costs
**Whenever we hit a problem or learn something — positive or negative — record it immediately.**
- Append the lesson to [docs/KNOWLEDGEBASE.md](docs/KNOWLEDGEBASE.md) (`P#` good / `N#` gotcha).
- Mirror high-signal items in the **Retained lessons** list below so they're always in context.
- If it changes a rule: add a `docs/DECISIONS.md` entry and update the affected SPEC.
- Never delete a lesson; supersede it with a newer entry.

### Retained lessons (high-signal mirror)
- **N1** Mobile browsers block unmuted autoplay → start preview audio muted, unmute on tap.
- **N2** OAuth needs the session cookie to survive the redirect → `SameSite=Lax`, verify `state`.
- **N3** QR/capability reset URLs are bearer secrets → single-use + short-TTL + invalidate on use; never log.
- **N4** Never cache passwords/raw tokens client-side → only the non-sensitive identity snapshot; session in HttpOnly cookie.
- **N5** Offset pagination on a live feed skips/dupes items → use cursor-by-id.
- **P1** Keep all Spotify access behind `get_client()` (Mock|Real) so everything stays testable offline.
- **P3** Keep seeds/likes/follows idempotent so re-runs and tests never accumulate state.

## Common commands
```bash
make up       # build + run local stack (db, api, frontend w/ hot reload)
make seed     # default data: scan content + demo users/likes
make test     # backend pytest + frontend vitest (must pass)
make logs     # tail services
make prod     # production compose (gunicorn + built frontend)
make down     # stop
```

## Layout
```
backend/   Flask app (routes → services → repositories/models), scanner, tests
frontend/  React+TS+MUI (Vite), pages/components/hooks, tests
docs/      binding SPECS + decisions + knowledgebase
*compose*  local + prod ; Makefile drives everything
```
