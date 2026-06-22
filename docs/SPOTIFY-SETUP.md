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

## ⚠️ Important: preview availability (Spotify API change, 2024-11-27)
Spotify now returns **`preview_url: null`** in multi-get / `SimpleTrack` responses (e.g. album
track lists) under the Client-Credentials flow. To maximize playable audio, our scanner pulls
**tracks via Search** (full `Track` objects, which can still include a preview) and uses New
Releases only for album/artist variety. Even so, **some or all tracks may have no preview** —
those cards still show (art, title, metadata) but simply aren't playable. `make spotify-check`
reports how many of a sample have a preview. Real Spotify **login + profile + search + metadata
all work regardless**; only 30s preview audio is subject to this limitation. (KB N11/P6: when a
preview exists it streams through our same-origin `/api/audio` proxy, CORS-clean.)

## Notes
- Implemented with the **spotipy** library: client-credentials (`SpotifyClientCredentials`) for
  scanning/search; the OAuth **Authorization-code** flow (`/auth/login` → `/auth/callback`)
  powers user login. We deliberately avoid endpoints restricted for new apps (recommendations,
  related-artists, audio-features, featured/category playlists).
- In prod, set `SESSION_COOKIE_SECURE=true` (HTTPS) so the OAuth session cookie is secure.
- Rate limits: scanning hits Spotify's API; for large catalogs, schedule `make scan` rather
  than hammering it. See [SPEC-infra](./SPEC-infra.md).
