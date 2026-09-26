# Mobile and admin prototype

Status: ready-for-agent
State: reviewed
Assignee: clients

## Scope

Implement the assigned part of [the contract](../../../docs/prototype-api.md) in an isolated worktree; coordinate contract changes and report build/tests and limitations. Root reviews before squash integration.

## Comments

- 2026-09-27 implementation started.

## Implementation

- Mobile: Expo SDK 54 / RN 0.81.5 development build, native Google school login, Google Maps, four Korean tabs, parties/friends/shared quests/matching consent, actual meals and pixel-based shuttle schematic.
- Location: explicit foreground/background opt-in, durable upload-consent gate, SecureStore token, HTTPS background uploads, token/task cleanup and fresh authorization snapshots.
- Admin: Next.js 15, browser Google login, server-enforced admin access, event draft/publish/cancel/edit and integration refresh/status.
- Each app has an independent pnpm manifest/lockfile and setup README; admin has Dockerfile and secret-safe Docker ignore.

## Verification

- Mobile TypeScript, Expo dependency compatibility, Android native prebuild, Android bundle export passed.
- Next.js production build/types passed; HTTP smoke verified configuration-required login UI without keys.
- Google OAuth, configured Maps, physical-device background location and authenticated end-to-end interactions need real credentials. Background location deliberately requires HTTPS; LAN HTTP supports foreground use only. Coordinator is separately attempting the native APK build.

- Review follow-up: display persisted Party.sharingEnabled; reject older location snapshots by request generation, session token, local consent and app state; expire visible locations with a separate timer; guard permission/subscription completion after logout. Snapshot privacy/expiry tests and TypeScript pass. Admin server stopped for Compose.
