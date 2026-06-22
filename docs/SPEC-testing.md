# SPEC — Testing

**TDD is the working style.** Write/adjust a failing test, make it pass, refactor. The suite
must be fast and deterministic — **no flaky tests tolerated**.

## Backend (pytest)
- Location: `backend/tests/`.
- **DB:** SQLite in-memory per test (fixture creates schema, rolls back). No Postgres needed
  for unit/integration tests → fast and hermetic.
- **Spotify:** always the `MockSpotifyClient` in tests; never hit the network.
- **Layers tested:**
  - **Service tests** — business rules directly against service classes (the bulk).
  - **API/smoke tests** — Flask test client: `/healthz`, signup→login→session, feed pagination
    (cursor + `has_more`), like/unlike toggles `liked` & `like_count`, follow builds the
    following feed, reset-token single-use.
- **Determinism rules (binding):**
  - No real network, no real clock dependence (seed RNG, freeze/inject time where it matters).
  - No test depends on another's ordering or leftover state.
  - No `sleep`-based waits.

## Frontend (Vitest + React Testing Library)
- Location: `frontend/src/**/*.test.tsx`.
- **Smoke tests:** app shell renders, bottom nav present, theme toggle flips mode, FeedCard
  renders title/like button, AuthPage shows the three flows. Network mocked (MSW or fetch stub).

## Gates
- `make test` runs both suites and must be green before any merge/deploy.
- New behavior ships with tests in the same change. Bugfixes add a regression test first.
- Coverage is a guide, not a gate; **smoke coverage of every critical path is mandatory**:
  auth, feed pagination, like, follow/following-feed, search.
