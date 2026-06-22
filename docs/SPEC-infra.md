# SPEC — Infrastructure

Everything containerized. Local dev = hot reload. Prod = built assets + gunicorn. One Makefile
drives all common actions so onboarding/debugging is `make <thing>`.

## Containers
- **db** — `postgres:16`, named volume, healthcheck.
- **api** — Flask. Dev: `flask run`/reloader. Prod: `gunicorn wsgi:app`.
- **frontend** — Dev: Vite dev server (`:5173`) with HMR, proxies `/api` + `/auth` to api.
  Prod: built static assets served by the api container (same origin → no CORS in prod).

## Files
- `backend/Dockerfile` — slim Python, install reqs, run gunicorn (prod) / flask (dev override).
- `frontend/Dockerfile` — multi-stage: node build → static output (copied into prod image/served).
- `docker-compose.yml` — local: db + api (reload, mounted source) + frontend (Vite HMR).
- `docker-compose.prod.yml` — db + api(gunicorn, serves built frontend). No source mounts.
- `.env` / `.env.example` — all config; compose reads `.env`.

## Makefile targets (binding minimum)
| Target | Does |
|--------|------|
| `make up` | build + start local stack (db, api, frontend) |
| `make down` | stop stack |
| `make logs` | tail all services |
| `make seed` | scan content + seed demo users/likes (default data) |
| `make scan` | scan Spotify content only |
| `make test` | backend pytest + frontend vitest (must pass) |
| `make migrate` | apply DB schema (create_all / migrations) |
| `make fmt` | ruff + prettier |
| `make prod` | build + run prod compose |
| `make psql` | open psql in the db container |
| `make clean` | down + remove volumes |

## Deploy
- Single host or container platform: run `docker-compose.prod.yml`. `PUBLIC_BASE_URL`,
  `FLASK_SECRET_KEY`, Spotify creds, and DB creds supplied via prod env/secrets.
- Cookies `Secure` + HTTPS in prod. Scanner runs as a scheduled task (cron/`make scan`).

## Health & ops
- `/healthz` for liveness/readiness probes.
- Logs to stdout (container-friendly). No secrets in logs.
