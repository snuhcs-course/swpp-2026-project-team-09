# Mobile event-to-party experience

Status: ready-for-agent
State: implementation reviewed and built; authenticated device and map-key validation pending

User requested continued implementation on 2026-09-27. Work in isolated existing worktrees, review and squash into 0.0/Main. No push. Core product remains the React Native app.

Deliver a map-centered mobile home, dedicated event detail and party/quest flows, usable local date/time forms, honest matching/source states and existing privacy semantics. Add authoritative party counts/membership and concurrent-safe quest edits/cancellation. No fabricated users, feeds or authentication bypass. Existing three flows remain required; this iteration is not full MVP completion.

User delegated map selection after asking about Korean coverage and development convenience. Select Naver native SDK via the community React Native wrapper, compatible with Expo CNG/New Architecture. Google OAuth remains the identity provider. Android OAuth registration and Naver key require user console setup, but do not block unrelated code. Background real-device sharing still needs HTTPS.

Verification: server invariants and integration checks, mobile typechecks/helper regressions, native APK build/cold launch. Separate code/build evidence from actual authenticated phone/map/background validation.

Sources reviewed 2026-09-27:
- https://developers.google.com/maps/coverage (KR driving/walking still marked unavailable/low coverage; does not describe consumer app)
- https://navermaps.github.io/android-map-sdk/guide-en/1.html
- https://rnnavermap.mjstudio.net/docs
- https://rnnavermap.mjstudio.net/docs/installation/expo

## Outcome

Independent worktrees reviewed and integrated. Main18 tests with temporary PG/Redis, mobile11 tests, TypeScript and cross-service HTTP/Socket E2E passed. ARM64 APK native build passed with Naver SDK and Android safe-area handling; local9 containers healthy. Runtime Google sign-in was attempted on a Google-account-free emulator and returned INTERNAL_ERROR before backend exchange; account input/device confirmation remains required. Naver Client ID is still absent. No full MVP completion claim.

APK SHA256: `a2c0157675983a76d7dc2e38cbbe6da46fdc3aec8af9f6a0b4de8ab249ce8a89`. Build uses the unchanged development certificate and USB-forwarded localhost services; background location still requires HTTPS.
