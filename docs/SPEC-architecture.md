# SPEC — Architecture

```
                         ┌─────────────────────────┐
   Phone / browser  ───▶ │  React + TS + MUI (Vite) │
                         │  TanStack Query, PWA     │
                         └───────────┬─────────────┘
                                     │  /api, /auth  (cookie session)
                         ┌───────────▼─────────────┐
                         │   Flask app (factory)   │
                         │  routes → services →    │
                         │  models/repositories    │
                         └───────┬─────────┬───────┘
                                 │         │
                   ┌─────────────▼──┐   ┌──▼───────────────┐
                   │  Postgres      │   │ SpotifyClient    │
                   │ users, follows,│   │ real | mock      │
                   │ feed_items,    │   └──────────────────┘
                   │ likes          │            ▲
                   └────────────────┘            │
                          ▲   scanner/scan_spotify.py (cron/manual)
                          └───────────────────────┘
```

## Components
- **Frontend (`frontend/`)** — React/TS SPA. Dev: Vite dev server (`:5173`) proxies API to
  backend. Prod: built to static assets served by the backend container (same origin).
- **Backend (`backend/`)** — Flask app factory. Strict layering (see SPEC-backend):
  `routes (HTTP) → services (business logic, classes) → models/repositories (DB) + clients`.
- **Scanner (`backend/scanner/`)** — populates `feed_items` from Spotify (mock or real).
  Idempotent upsert by `spotify_id`. Runnable manually or on a schedule.
- **Database** — Postgres in all environments (SQLite only for fast unit tests).
- **SpotifyClient** — single interface, two implementations (`RealSpotifyClient`,
  `MockSpotifyClient`). Selected by presence of creds. **The app never imports a concrete
  client directly** outside the factory `get_client()`.

## Cross-cutting principles (binding)
- **Separation of concerns.** HTTP code does not contain business logic; business logic does
  not contain SQL session juggling beyond the repository boundary.
- **OOP.** Business logic lives in cohesive service **classes**, not free functions.
- **Config via environment.** No secrets in code. `.env` drives everything; `.env.example`
  documents every variable.
- **Offline-first dev.** The whole stack must run with zero external creds (mock + dev-login).
- **Same contract, mock or real.** Swapping Spotify mock↔real is an env flip, never a code edit.
