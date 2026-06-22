# Knowledgebase

Retained lessons — **positive** (do this, it worked) and **negative** (don't, it bit us).
**Append here whenever we learn something or hit a problem.** Never delete; supersede with a
newer entry if something changes. The high-signal items are mirrored in `CLAUDE.md`.

## Positive (proven good)
- **P1 — Single Spotify interface, two impls.** `get_client()` returning Mock or Real keeps the
  whole app testable offline and makes go-live an env flip. Keep all Spotify access behind it.
- **P2 — Cursor pagination by `id`.** Simple, stable, and trivially testable with `has_more`.
- **P3 — Idempotent seeds/writes.** Seeding and like/follow are no-ops if already present, so
  `make seed` is safe to re-run and tests don't accumulate state.
- **P4 — Identity snapshot in localStorage** (not secrets) gives instant logged-in UI while
  `/api/me` confirms in the background.

## Negative (avoid / gotchas)
- **N1 — Mobile browsers block unmuted autoplay.** Always start preview audio muted; unmute on
  user tap. (Drove D10.)
- **N2 — OAuth needs the session cookie to survive the redirect.** Use `SameSite=Lax`; verify
  the `state` param. A too-strict SameSite breaks the callback.
- **N3 — Capability/QR reset URLs are bearer secrets.** Anyone with the link can reset → tokens
  MUST be single-use + short-TTL + invalidated on use. Don't log them.
- **N4 — Never put passwords/raw tokens in localStorage.** Only the non-sensitive identity
  snapshot. Session stays in an HttpOnly cookie.
- **N5 — Offset pagination on a live feed double-shows/skips items** when new content is
  inserted between page loads. Use the cursor (N→D5).
- **N6 — `psycopg2-binary==2.9.9` has no cp313 wheel** → on Python 3.13 pip falls back to a
  source build and dies with `pg_config executable not found`. Pin `>=2.9.10` (ships 3.13
  wheels). Tests use SQLite so they don't need it, but install must still succeed.

## How to add an entry
Append a `P#`/`N#` bullet with: what happened, the lesson, and the SPEC/decision it affects.
If it changes a rule, also add a `DECISIONS.md` entry and update the relevant SPEC.
