# SPEC — Data Model

Postgres (prod/dev). SQLite in-memory only for unit tests. SQLAlchemy ORM.

## Entities

### User
| Column | Type | Notes |
|--------|------|------|
| id | str PK | Spotify id, `local-<username>`, or `dev-you` |
| username | str unique nullable | set for local accounts |
| display_name | str | required |
| email | str nullable | from Spotify only; we don't send email |
| avatar_url | str nullable | |
| password_hash | str nullable | local accounts only (pbkdf2) |
| is_seed | bool | demo/default-data flag |
| created_at | datetime | |

### Follow (asymmetric)
`(follower_id, followed_id)` composite PK → `users.id`. `follower_id` follows `followed_id`.

### FeedItem (cached Spotify content)
| Column | Type | Notes |
|--------|------|------|
| id | int PK autoinc | also the pagination cursor |
| spotify_id | str unique | upsert key |
| kind | str | `track` \| `album` \| `artist` |
| title | str | |
| subtitle | str nullable | artist name etc. |
| image_url | str nullable | |
| preview_url | str nullable | 30s mp3 (tracks) |
| spotify_url | str nullable | |
| popularity | int | search ordering |
| created_at | datetime | |

### Like
`(user_id, item_id)` composite PK. `user_id`→users, `item_id`→feed_items.

### PasswordReset
| Column | Type | Notes |
|--------|------|------|
| token | str PK | random urlsafe, single-use |
| user_id | str FK | |
| expires_at | datetime | short TTL |
| used | bool | invalidated on use |

## Pagination model (binding)
- **Cursor = last seen `FeedItem.id`**, walking **strictly descending** (`id < cursor`).
- Response: `{ items: [...], next_cursor: int|null, has_more: bool }`.
- Never offset-based — stable under concurrent inserts, which a live feed has.

## Default data (seeded by `make seed`)
- **Content:** ≥120 mixed feed items (tracks/albums/artists) from the mock scanner
  (or real new-releases/search when creds exist). Deterministic, so demos are reproducible.
- **People:** demo users (Nova, Kaz, Mira, Dex, Juno) each with ~12 likes (seeded RNG=42).
- **Graph:** `dev-you` follows a couple of demo users so the Following feed is non-empty.
- Everything keyed/idempotent so re-seeding never duplicates.
