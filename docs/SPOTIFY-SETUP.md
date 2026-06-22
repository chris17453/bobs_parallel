# Going live with real Spotify

The app runs fully offline by default (mock content + dev-login). Switching to **real
Spotify** is an **environment drop — no code changes**. The mock layer steps aside the moment
creds are present (and dev-login auto-disables, so users log in with real Spotify).

## 1. Create a Spotify Developer app
1. Go to <https://developer.spotify.com/dashboard> and log in.
2. **Create app**. Name/description anything.
3. Note the **Client ID** and **Client Secret**.
4. Under **Edit Settings → Redirect URIs**, add the EXACT callback URL the browser will hit:
   - Local dev: `http://localhost:5000/auth/callback`
   - Prod: `https://YOUR_DOMAIN/auth/callback`
   It must match `SPOTIFY_REDIRECT_URI` in `.env` character-for-character.
5. Save.

## 2. Put the creds in `.env`
```dotenv
SPOTIFY_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
SPOTIFY_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback   # or your prod URL
```

## 3. Verify connectivity
```bash
make spotify-check
```
Expected: a token is acquired and a small live scan prints a few real releases. If it fails,
the message tells you whether it's the creds or API access.

## 4. Populate the real feed
```bash
make scan        # content only
# or
make seed        # content + demo users/likes (demo users remain local app accounts)
```
Restart so the app re-reads creds if it was already running: `make down && make up`.

## What changes automatically
| | Mock (no creds) | Real (creds set) |
|---|---|---|
| Feed content | deterministic fake tracks/albums/artists | Spotify new-releases + search |
| Login | dev-login button | Spotify OAuth (dev-login disabled) |
| Search | cached items in Postgres | same cache; re-scan to refresh |

## Notes
- **Client-credentials** flow powers scanning/search (no user context). **Authorization-code**
  flow powers user login (`/auth/login` → `/auth/callback`).
- 30s `preview_url` is only present on some tracks; cards without a preview just don't autoplay.
- In prod, set `SESSION_COOKIE_SECURE=true` (HTTPS) so the OAuth session cookie is secure.
- Rate limits: scanning hits Spotify's API; for large catalogs, schedule `make scan` rather
  than hammering it. See [SPEC-infra](./SPEC-infra.md).
