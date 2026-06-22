# SPEC — Authentication

Three ways in, one session model. All issue the same server session + a browser-cached
identity so the UI can render instantly on reload.

## 1. Spotify OAuth (Authorization Code)
- `/auth/login` → Spotify consent → `/auth/callback` upserts the `User` and starts a session.
- Enabled only when `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` are set.

## 2. Local accounts (signup / login)
Because we can't rely on Spotify creds during dev/prod-without-Spotify, users can register
locally.
- **Signup:** `username` (unique, used as id `local-<username>`), `display_name`, `password`.
- Passwords hashed with `werkzeug.security.generate_password_hash` (pbkdf2). **Never** stored
  or logged in plaintext.
- **Login:** username + password → session.
- A dedicated **Login / Signup page** in the frontend hosts all three flows (Spotify button,
  signup form, login form) + the reset entry point.

## 3. Dev-login
- Offline convenience user (`dev-you`). Auto-disabled when Spotify creds are present.

## Password reset — QR / URL based (no email)
We have **no email delivery**, so reset uses a **capability URL** delivered as a QR code:
1. User requests reset for a username → server creates a `PasswordReset` token
   (random, single-use, short TTL e.g. 30 min) and returns a reset URL
   `${PUBLIC_BASE_URL}/reset?token=<token>`.
2. The frontend renders that URL as a **QR code** (and a copyable link). The user scans it with
   a phone (or clicks it) to open the reset page and set a new password.
3. `POST /auth/reset` with `{token, new_password}` consumes the token and updates the hash.
- **Security note (recorded in KNOWLEDGEBASE):** a capability URL is a bearer secret — anyone
  with the link can reset. Tokens are therefore single-use + short-TTL + invalidated on use.
  Acceptable for this app's threat model; revisit if it ever holds sensitive data.

## Browser-side credential caching
- On any successful auth the frontend stores a **non-sensitive identity snapshot**
  (`{id, display_name, avatar_url}`) in `localStorage` under `parallel.auth` so the shell
  renders logged-in immediately on reload, before `/api/me` confirms.
- **Never cache passwords or raw tokens in localStorage.** The session is an HttpOnly cookie;
  localStorage holds only the display identity. `/api/me` remains the source of truth and the
  cache is cleared on 401 or logout.
- "Remember me" (default on) → persistent session cookie; off → session cookie.

## Session
- Flask server-side session via signed cookie, `SameSite=Lax`, `HttpOnly`. `Secure` in prod.
