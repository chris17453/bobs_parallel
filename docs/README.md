# Parallel — Documentation

**Parallel** is a TikTok-style, lazy-loading, infinite-scroll music discovery app. Content
is scanned from the Spotify API by a Python job; users follow each other and see friends'
likes. React + MUI frontend, Flask + Postgres backend, fully containerized.

These SPEC documents are **binding**. All development must conform to them. If a change
needs to deviate, update the relevant SPEC and the [DECISIONS](./DECISIONS.md) log in the
same change — the docs are the source of truth, not the code.

## Index

| Doc | Purpose |
|-----|---------|
| [SPEC-product.md](./SPEC-product.md) | What we're building, features, UX standards |
| [SPEC-architecture.md](./SPEC-architecture.md) | System shape, components, data flow |
| [SPEC-backend.md](./SPEC-backend.md) | Flask layering, service classes, conventions |
| [SPEC-frontend.md](./SPEC-frontend.md) | React/TS/MUI structure, theme, nav, data layer |
| [SPEC-data-model.md](./SPEC-data-model.md) | Entities, relationships, pagination model |
| [SPEC-api.md](./SPEC-api.md) | REST endpoints contract |
| [SPEC-testing.md](./SPEC-testing.md) | TDD policy, smoke tests, no-flake rules |
| [SPEC-infra.md](./SPEC-infra.md) | Docker, Compose, Makefile, deploy, PWA |
| [SPOTIFY-SETUP.md](./SPOTIFY-SETUP.md) | Going live with real Spotify (env-drop) |
| [DECISIONS.md](./DECISIONS.md) | Chronological decision log (the "why") |
| [KNOWLEDGEBASE.md](./KNOWLEDGEBASE.md) | Retained lessons — positive & negative |

See the root [`CLAUDE.md`](../CLAUDE.md) for the working agreement that points back here.
