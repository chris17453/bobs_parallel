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
  components/
    AppShell.tsx        # top app bar (search + hamburger) + bottom nav + drawer
    NavDrawer.tsx       # hamburger drawer: profile link + theme settings
    FeedCard.tsx        # one full-screen card; muted autoplay; like button
    FeedList.tsx        # snap-scroll container + IntersectionObserver sentinel
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
- **Audio:** only the in-view card plays; muted autoplay, tap toggles mute. Pause off-screen.
- **Auth UX:** `AuthPage` hosts Spotify button + local login/signup + "forgot password"
  (→ QR). Identity cached per SPEC-auth; shell renders optimistically, `/api/me` confirms.
- **Accessibility/touch:** ≥44px tap targets, respects `prefers-reduced-motion` for snap.
- **PWA:** `manifest.webmanifest` + icons; installable, standalone display, dark theme color.
