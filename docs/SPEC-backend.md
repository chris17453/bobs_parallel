# SPEC — Backend

Flask, app-factory pattern, **strict layering**, OOP service classes.

## Layering (binding)
```
backend/app/
  __init__.py        # create_app() factory: config, extensions, blueprints, CORS
  config.py          # env-driven Config class
  extensions.py      # db (SQLAlchemy) singleton
  models.py          # ORM entities (data only + trivial to_dict)
  repositories.py    # DB query objects (no HTTP, no business rules beyond persistence)
  services/          # business logic as classes — the heart of the app
    feed_service.py      # FeedService: main + following feeds, pagination
    social_service.py    # SocialService: follow/unfollow, likes, profiles
    search_service.py    # SearchService: content + people search
    auth_service.py      # AuthService: signup/login/reset/oauth upsert, hashing
  spotify_client.py  # RealSpotifyClient | MockSpotifyClient behind get_client()
  routes/            # thin HTTP blueprints: parse req -> call service -> jsonify
    auth_routes.py
    api_routes.py
  scanner/scan_spotify.py
  wsgi.py
```

## Rules
- **Routes are thin.** A route parses/validates input, calls exactly one service method,
  serializes the result, maps domain errors → HTTP. No SQL, no business rules in routes.
- **Services are classes** with clear responsibilities (single responsibility per class).
  They receive a db session / repositories; they do not touch `request`/`session` globals —
  the route extracts the current user and passes it in.
- **Repositories** own queries. Services compose repositories; they don't write raw filters
  scattered around. (Pragmatic exception: trivial `session.get` is fine inline.)
- **Domain errors** are explicit exceptions (e.g. `NotFound`, `Unauthorized`, `BadRequest`)
  caught by a single error handler that renders the `{error}` contract.
- **No global mutable state.** The Spotify client is created per-app via `get_client(app)`.
- **Secrets/config from env only.** Defaults are safe-for-dev, never prod secrets.

## Conventions
- `ruff` for lint/format. Type hints on service public methods.
- Time is UTC (`datetime.now(timezone.utc)`).
- Idempotent writes where natural (like/follow/seed are no-ops if already present).
