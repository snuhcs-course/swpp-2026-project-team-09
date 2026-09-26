# 캠퍼스 Android prototype

Node 22 and pnpm 10.28.0. Expo SDK 54 / React Native 0.81.5. This app requires an Expo **development build**, not Expo Go.

```sh
cp .env.example .env
pnpm install --frozen-lockfile
pnpm android
pnpm start
```

For an Android emulator the example URLs use `10.0.2.2`; a real phone needs a reachable machine LAN address or HTTPS tunnel. API URLs omit `/v1`. The public main server is port 3000, Socket.IO 3002, matching 3004. No supplied OAuth or API configuration yields an explicit configuration screen without a fake user.

## Provider configuration

- Create Google OAuth web client credentials and put its client ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and the main server's `GOOGLE_WEB_CLIENT_ID`. The server validates the actual school account and school hosted-domain claim.
- Register an Android OAuth client for package `kr.ac.campus.prototype` and the SHA-1 of the development signing certificate. `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` records that setup; the native Google Sign-In SDK selects the Android client by package/signature, so this ID is not passed as a runtime option. Enable Google Play services on the emulator/device.
- Set `GOOGLE_MAPS_ANDROID_API_KEY` with Maps SDK for Android enabled and the package/SHA-1 restrictions. This is native build configuration; rebuild after changing it. No map is rendered if the key was absent at build time.
- `pnpm exec expo prebuild --platform android --no-install` regenerates ignored native files. Android SDK and a compatible JDK are required to produce an APK.

## Screens

Google login → 지도 / 행사 / 약속·파티 / 생활. The map displays real events and currently authorized peer locations, profile avatars, and shared quest cards. Parties can be created/joined/left; friends requested/accepted; quests created/edited; matching requires explicit automatic-join consent. Date forms take ISO strings with timezone. No invented external data is included.

Meals and shuttle positions are fetched on request from the main server's actual worker proxy. Blank meal fields mean unavailable information. The shuttle schematic renders source `x/y` as diagram pixels, never latitude/longitude or arrival estimates. Source and fetch time are shown.

## Location privacy and limitations

Location sharing starts OFF on cold app launch. Turning it on requires OS foreground permission; the global server toggle and separate friend/party preferences determine visibility. Party OFF does not turn off a mutually sharing friend. Relationship changes and socket hints reload server-authorized snapshots. Disconnect, auth failure, app-state change, and mutation clear old markers; polling reconciles snapshots every 30 seconds, and markers expire at two minutes with an independent timer even when no refresh completes. Snapshot application checks the latest request generation, current token, foreground app state, and local sharing consent. Party switches display the server-persisted own preference; an unknown preference is not guessed.

Background sharing is a separate opt-in and requires an **HTTPS main API URL**, an Android development build, and background permission. HTTP LAN/10.0.2.2 is supported for foreground prototype use only; configure a TLS tunnel or local TLS endpoint to verify background behavior. Android shows the location foreground-service notification. OS power management can still defer updates. Background uploads use HTTPS, not a persistent socket.

Every upload checks persisted consent. OFF clears consent before stopping the task and notifying the server; logout deletes the token before remote calls. If offline, other users can see the last previously shared position until the server TTL expires. No new upload is intentionally submitted after local opt-out. Background 401/403 stops the task; 401 clears credentials. JWTs live in SecureStore, not source files.

Run `pnpm test` for snapshot authorization/expiry regression checks.

Verified: TypeScript, Expo dependency compatibility, Android prebuild, Android JS bundle export. Google login, map rendering, and location behavior require real credentials and device verification; they are not claimed as exercised without those credentials.
