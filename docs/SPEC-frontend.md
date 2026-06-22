# SPEC — Frontend

React + **TypeScript** + **Vite** + **MUI**. Mobile-first, dark-default, PWA.

## Structure
```
frontend/src/
  main.tsx              # bootstrap, providers (Theme, Query, Auth, Router)
  theme.ts              # MUI theme: Space Grotesk, cyan #00E5C8, dark default + light
  api/client.ts         # fetch wrapper (credentials: 'include'), typed endpoints
  api/types.ts          # FeedItem, User, FeedPage, etc.
  auth/AuthContext.tsx  # session state + localStorage identity cache (SPEC-auth)
  hooks/useFeed.ts      # TanStack useInfiniteQuery over cursor pages
  player/PlayerContext.tsx  # global now-playing state; owns the single <audio> element
  components/
    AppShell.tsx        # top app bar (search + hamburger) + bottom nav + drawer + MiniPlayer
    NavDrawer.tsx       # hamburger drawer: profile link + theme settings
    FeedCard.tsx        # one full-screen card; drives the player; like button
    FeedList.tsx        # snap-scroll container + IntersectionObserver sentinel
    MiniPlayer.tsx      # persistent now-playing bar (above bottom nav): art/title, play/pause,
                        #   scrubber, mute, and the Visualizer
    Visualizer.tsx      # canvas freq bars; Web Audio AnalyserNode + playback-synced fallback
    QRCode.tsx          # render reset URL as QR
  pages/
    FeedPage.tsx  SearchPage.tsx  FriendsPage.tsx  ProfilePage.tsx  AuthPage.tsx  ResetPage.tsx
```

## Standards (binding)
- **MUI only** for components/theming. Use `sx`/`styled`, no competing CSS frameworks.
- **Theme:** dark is default; toggle in the hamburger drawer persists to `localStorage`
  (`parallel.theme`). Font Space Grotesk (self-host or Google Fonts). Primary `#00E5C8`.
- **Navigation:** MUI `BottomNavigation` (Feed/Search/Friends/Profile) + `AppBar`
  (search field + hamburger menu icon) + `Drawer`. Bottom nav hidden where it would obstruct
  (e.g. auth pages).
- **Data layer:** **TanStack Query**. Feed uses `useInfiniteQuery` keyed by feed type;
  `getNextPageParam` reads `next_cursor`. Mutations (like/follow) optimistic with rollback.
- **Lazy load:** `IntersectionObserver` sentinel near the list end triggers `fetchNextPage`.
- **Audio (single source):** a global `PlayerContext` owns the only `<audio>` element. The
  in-view feed card sets the current track (muted autoplay); the **MiniPlayer** gives explicit
  play/pause, scrubber, and mute and persists across navigation. No per-card `<audio>` tags.
- **Visualizer:** `AnalyserNode` FFT → canvas bars when CORS allows; otherwise a deterministic
  playback-synced animation. `AudioContext` is created/resumed on a user gesture (autoplay
  policy) and reused (browsers cap the number of contexts).
- **Auth UX:** `AuthPage` hosts Spotify button + local login/signup + "forgot password"
  (→ QR). Identity cached per SPEC-auth; shell renders optimistically, `/api/me` confirms.
- **Accessibility/touch:** ≥44px tap targets, respects `prefers-reduced-motion` for snap.
- **PWA:** `manifest.webmanifest` + icons; installable, standalone display, dark theme color.
