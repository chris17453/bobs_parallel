# SPEC — Product

## Vision
A TikTok-feel music discovery app. An endless, full-screen, vertically snapping feed of
Spotify content. Tap to play previews, like things, follow people, and browse a "Following"
feed built from the likes of people you follow.

## Core features
1. **Infinite feed** — mixed content: tracks, albums, artists. Lazy-loaded, cursor-paginated.
2. **Audio preview** — the active card autoplays a 30s preview **muted**; tap to unmute.
3. **Now-playing player + visualizer** — a persistent mini-player bar (above the bottom nav)
   showing the current track (art, title, artist) with play/pause, a 30s-preview scrubber, and
   mute, **plus a live audio visualization** (frequency bars). It is the single audio source:
   the in-view card drives it, and it stays put as you scroll. The visualizer uses Web Audio
   `AnalyserNode` FFT data when the audio is CORS-enabled, and falls back to a playback-synced
   animation otherwise (preview hosts often lack CORS → analyser would read silence).
3. **Search** — top app bar; searches content (title/artist) and people.
4. **Social (follow model — asymmetric)** — follow anyone, no approval.
5. **Following feed** — items liked by people you follow.
6. **Profile** — your likes, follower/following counts; other users' profiles likewise.
7. **Likes** — like/unlike any feed item.
8. **Comments** — threaded comments on any feed item; author may delete their own.
9. **Shares** — share a feed item; share count shown on the card.
10. **Notifications** — activity feed; a new follower notifies the followed user. App-bar bell
    with an unread badge; opening marks them read.

## UX standards (binding)
- **Mobile-first. Phone support is mandatory** — design for ~390px width first, scale up.
- **Installable PWA** — manifest + responsive; feels like an app on a phone.
- **Dark mode is the default**, with a light toggle in theme settings.
- **MUI** is the component library. No ad-hoc component frameworks alongside it.
- **Navigation:** bottom tab bar (Feed / Search / Friends / Profile) + top app bar
  (search field + hamburger). The **hamburger drawer** holds profile shortcut + theme settings.
- **Typography:** Space Grotesk. **Accent color:** cyan `#00E5C8`.

## Out of scope for v1 (explicitly deferred)
- Real Spotify playback beyond 30s previews.
- Push notifications.
- Nested comment replies / reactions (comments are flat for now).

## Auth
- Primary: **Spotify OAuth** (Authorization Code).
- Until creds exist: **dev-login** seeds a local user so everything is usable offline.
  Dev-login auto-disables once real Spotify creds are configured.
