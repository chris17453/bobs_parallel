# Parallel

A TikTok-style, lazy-loading, infinite-scroll **music discovery app**. Content is scanned from
the Spotify API by a Python job; users follow each other and see friends' likes. Vertical
full-screen feed, muted-autoplay previews, search, and profiles.

- **Frontend:** React + TypeScript + Vite + MUI (mobile-first, dark default, installable PWA)
- **Backend:** Flask + SQLAlchemy + Postgres (layered: routes → service classes → repositories)
- **Auth:** Spotify OAuth, local accounts, and offline dev-login; QR/URL password reset (no email)
- **Infra:** Docker Compose (local hot-reload + prod gunicorn), one Makefile drives everything

### Features
- Infinite, cursor-paginated, TikTok-style snap-scroll feed of mixed Spotify content
- **Now-playing player** (persistent mini-player) with a **Web Audio visualizer**
- Likes, **comments**, **shares** — with live counts on every card
- **Follow** people, a Following feed of their likes, and **new-follower notifications** (bell + badge)
- **Profiles**: likes grid, follower/following counts (tap to see the lists), and profile editing
- Search across content and people; QR-code password reset
- Seeded demo: 12 users with a real social graph so everything is populated offline

> 📐 **All development is bound by the SPECS in [`docs/`](docs/README.md).** Start with
> [`CLAUDE.md`](CLAUDE.md) and [`docs/README.md`](docs/README.md). Code conforms to the docs.

## Quick start

```bash
cp .env.example .env       # runs fully offline as-is (mock Spotify + dev-login)
make up                    # build + start db, api, frontend (hot reload)
make seed                  # default data: content + demo users + follow graph
# frontend → http://localhost:5173   api → http://localhost:5000
```

Run the tests:

```bash
make test                  # backend pytest + frontend vitest (must be green)
```

Go to production:

```bash
make prod                  # gunicorn + built frontend + postgres (docker-compose.prod.yml)
```

## Enabling real Spotify
Create a Spotify Developer app, then set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and a
matching `SPOTIFY_REDIRECT_URI` in `.env`. No code changes — the mock layer steps aside and
OAuth + live scanning turn on. (Dev-login auto-disables once creds are present.)

## Layout
```
backend/   Flask app (routes → services → repositories/models), scanner, tests
frontend/  React+TS+MUI (Vite), pages/components/hooks, tests
docs/      binding SPECS + decision log + knowledgebase
Makefile   common commands       docker-compose*.yml   local + prod
```

## License
[MIT](LICENSE) © 2026 Watkins Labs
