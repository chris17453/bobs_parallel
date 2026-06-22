# SPEC — API Contract

Base: `/api` (JSON, cookie session). Auth flows under `/auth`. All list endpoints that
paginate use the cursor model from [SPEC-data-model](./SPEC-data-model.md).

## Auth
| Method | Path | Body | Notes |
|--------|------|------|------|
| GET | `/auth/login` | — | Start Spotify OAuth (or redirect to dev-login if no creds) |
| GET | `/auth/callback` | — | OAuth return; starts session |
| POST | `/auth/signup` | `{username, display_name, password}` | Local account |
| POST | `/auth/login-local` | `{username, password, remember?}` | Local login |
| POST | `/auth/reset/request` | `{username}` | → `{reset_url}` (render as QR) |
| POST | `/auth/reset` | `{token, new_password}` | Consume token, set password |
| POST | `/auth/dev-login` | — | Offline demo user (disabled if Spotify configured) |
| POST | `/auth/logout` | — | Clear session |

## Content / social
| Method | Path | Notes |
|--------|------|------|
| GET | `/api/me` | `{user|null}` |
| PATCH | `/api/me` | `{display_name?, avatar_url?}` → `{user}` (patch semantics; auth) |
| GET | `/api/feed?cursor=&limit=` | Main mixed feed |
| GET | `/api/feed/following?cursor=&limit=` | Items liked by people you follow |
| POST/DELETE | `/api/items/<id>/like` | Like / unlike |
| GET | `/api/items/<id>/comments` | `{comments, comment_count}` (oldest first) |
| POST | `/api/items/<id>/comments` | `{body}` → `{comment, comment_count}` |
| DELETE | `/api/comments/<id>` | Delete own comment → `{ok, comment_count}` |
| POST | `/api/items/<id>/share` | Share → `{item_id, shared, share_count}` (idempotent) |
| GET | `/api/notifications` | `{notifications, unread_count}` (newest first) |
| GET | `/api/notifications/unread-count` | `{unread_count}` (cheap, for badge polling) |
| POST | `/api/notifications/read` | Mark all read → `{ok, unread_count: 0}` |
| GET | `/api/search?q=` | `{items, users}` |
| GET | `/api/users` | Directory to follow |
| GET | `/api/users/<id>` | Profile + counts + likes |
| POST/DELETE | `/api/users/<id>/follow` | Follow / unfollow |
| GET | `/healthz` | Liveness |

## Conventions (binding)
- Errors: `{ "error": "<machine_code>" }` + appropriate HTTP status (401 unauth, 404 missing,
  400 bad input). UI branches on `error`, not on prose.
- Item payload always includes `like_count`, `comment_count`, `share_count`, and (when authed)
  `liked` + `shared`. User payload includes `is_following` when authed.
- Mutations return the updated resource so the client can reconcile without a refetch.
- Limits clamped server-side (`DEFAULT_LIMIT=10`, `MAX_LIMIT=30`).
