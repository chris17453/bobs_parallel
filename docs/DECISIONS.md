# Decision Log

Chronological record of binding decisions and the reasoning. Newest at the bottom. Any code
change that contradicts a decision must add a superseding entry here.

| # | Decision | Why |
|---|----------|-----|
| D1 | Feed content is **mixed** (tracks, albums, artists) | User wants a varied TikTok-style discovery feed |
| D2 | **Spotify OAuth** as primary auth | Real friends/likes tie to real Spotify identity |
| D3 | **Postgres** for all envs (SQLite only for tests) | Production-grade, concurrent-safe, containerized |
| D4 | **Mock Spotify layer** + **dev-login** | Run the whole app offline before creds exist; same contract as real |
| D5 | **Cursor pagination** (last id, descending) | Stable infinite scroll under concurrent inserts; not offset |
| D6 | Frontend **React + TypeScript + Vite + MUI** | Type safety + MUI components, fast dev |
| D7 | Visual identity **Space Grotesk + cyan #00E5C8**, **dark default** | Techy/distinctive; user pick |
| D8 | Nav: **bottom tab bar + top app bar + hamburger drawer** | Native-app feel on phone; drawer holds profile + theme |
| D9 | Social model **follow (asymmetric)** + Following feed of friends' likes | Simplest, TikTok-like; no approval flow |
| D10 | Audio: active card **autoplay muted, tap to unmute** | Mobile browsers block unmuted autoplay |
| D11 | **TanStack Query** for data layer | Standard for cursor infinite-query + optimistic mutations |
| D12 | **Installable PWA**, mobile-first | "Phone support is a must" |
| D13 | v1 **likes only** (no comments/shares) | Scope control; easy to add later |
| D14 | **OOP service-layer** + strict separation of concerns | User standard: classes, thin routes, testable |
| D15 | **TDD** with fast deterministic **smoke tests**, no flakes | User standard: stop constant breakage |
| D16 | Docs are **binding SPECS**; code conforms to docs | User: tie all development to the model |
| D17 | **Local accounts** (signup/login) alongside Spotify | Usable without Spotify creds in dev/prod |
| D18 | **Browser-side identity cache** (localStorage), session in HttpOnly cookie | Instant logged-in render; never cache secrets client-side |
| D19 | **Password reset via QR/capability URL** (no email) | We have no email delivery; single-use + short-TTL tokens |
| D20 | **Default/seed data** (≥120 items, demo users, follow graph), deterministic | Reproducible demos; non-empty feeds out of the box |
| D21 | **Knowledgebase** of positive+negative lessons retained in CLAUDE.md/docs | User: retain learnings at all costs |
| D22 | **Comments + shares are now in scope** (supersedes D13's likes-only) | User asked to layer them in; flat comments + idempotent shares, EngagementService |
| D23 | SPA login route is **`/login`**, not `/auth` | `/auth` collides with the proxied API prefix (KB N8) |
| D24 | **Notifications** on follow (recipient = followed user); bell + unread badge | Brief asked for friends/activity; content isn't user-owned so follow is the clean trigger |
