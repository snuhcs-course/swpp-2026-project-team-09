# 캠퍼스 Android prototype

Node 22 and pnpm 10.28.0. Expo SDK 54 / React Native 0.81.5. This app requires an Expo **development build**, not Expo Go.

```sh
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm android
pnpm start
```

The local example uses `127.0.0.1` on the device with USB/emulator reverse forwarding:

```sh
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3002 tcp:3002
adb reverse tcp:3004 tcp:3004
```

Set `PROTOTYPE_LOCAL_HTTP=true` only for that local development build. The conditional native network policy permits HTTP only to `127.0.0.1`, `localhost`, and Android's host alias `10.0.2.2`; arbitrary LAN HTTP remains blocked. For a remote phone use reachable HTTPS URLs and leave this flag unset. Changing this policy requires rebuilding the native app. API URLs omit `/v1`. Main uses port 3000, Socket.IO 3002, matching 3004. Missing OAuth/API configuration never creates a fake user.

## Provider configuration

- Create Google OAuth web client credentials and put its client ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and the main server's `GOOGLE_WEB_CLIENT_ID`. The server validates the actual school account and school hosted-domain claim.
- Register an Android OAuth client for package `kr.ac.campus.prototype` and the SHA-1 of the development signing certificate. `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` records that setup; the native Google Sign-In SDK selects the Android client by package/signature, so this ID is not passed as a runtime option. Enable Google Play services on the emulator/device.
- Maps use native Naver Map through pinned `@mj-studio/react-native-naver-map` **2.9.0**, whose Android dependency is pinned to Naver SDK **3.23.2**. The wrapper requires React Native New Architecture (enabled) and supports Expo development builds. `expo-build-properties` **1.0.10** adds the official Naver Maven repository. [Wrapper setup](https://rnnavermap.mjstudio.net/docs/installation/expo), [requirements](https://rnnavermap.mjstudio.net/docs).
- In Naver Cloud **Maps**, register the Android package `kr.ac.campus.prototype`, enable **Dynamic Map**, and put the application's Client ID in `NAVER_MAP_CLIENT_ID` in `.env.local`. This must be the current Maps API credential. Never include its Client Secret in the app. The configuration plugin retains Android `com.naver.maps.map.NCP_KEY_ID` and removes the wrapper's legacy `CLIENT_ID` entry. [Official Android setup](https://navermaps.github.io/android-map-sdk/guide-en/1.html).
- Rebuild after changing `NAVER_MAP_CLIENT_ID`. Without it, the map screen explains setup while other tabs remain usable; it never shows fabricated tiles or markers. Naver native 401 indicates key/type/package configuration, 429 service selection or quota, and 800 a missing key. The wrapper does not expose these as a JS callback: native toast/log reports them; map help offers guidance and retry. The 12-second UI timeout detects delayed **native initialization only**, not authentication or tile-loading success. [Official failure handling](https://navermaps.github.io/android-map-sdk/guide-en/1.html).
- `pnpm exec expo prebuild --platform android --no-install` regenerates ignored native files. Android SDK and a compatible JDK are required to produce an APK.

## Screens

Google login → 지도 / 행사 / 약속·파티 / 생활. The map fills its parent pane with real event pins and currently authorized peer profile avatars; taps open the corresponding details. Initial camera framing shows the campus, and recenter uses a real available self position or the campus viewport. Invalid/nonfinite coordinates, drafts, expired positions, and future-dated positions are filtered. Map rendering itself requests no location permission and starts no location tracking. Shared quest cards remain in the surrounding UI. Parties can be created/joined/left; friends requested/accepted; quests created/edited; matching requires explicit automatic-join consent. Date forms use local `YYYY-MM-DD` and `HH:mm` fields with today/tomorrow shortcuts; API payloads retain ISO timestamps. No invented external data is included.

Meals and shuttle positions are fetched on request from the main server's actual worker proxy. Blank meal fields mean unavailable information. The shuttle schematic renders source `x/y` as diagram pixels, never latitude/longitude or arrival estimates. Source and fetch time are shown.

## Location privacy and limitations

Location sharing starts OFF on cold app launch. Turning it on requires OS foreground permission; the global server toggle and separate friend/party preferences determine visibility. Party OFF does not turn off a mutually sharing friend. Relationship changes and socket hints reload server-authorized snapshots. Disconnect, auth failure, app-state change, and mutation clear old markers; polling reconciles snapshots every 30 seconds, and markers expire at two minutes with an independent timer even when no refresh completes. Snapshot application checks the latest request generation, current token, foreground app state, and local sharing consent. Party switches display the server-persisted own preference; an unknown preference is not guessed.

Background sharing is a separate opt-in and requires an **HTTPS main API URL**, an Android development build, and background permission. Local HTTP loopback/10.0.2.2 with the explicit native build flag is for foreground prototype use only; configure a TLS tunnel or local TLS endpoint to verify background behavior. Android shows the location foreground-service notification. OS power management can still defer updates. Background uploads use HTTPS, not a persistent socket.

Every upload checks persisted consent. OFF clears consent before stopping the task and notifying the server; logout deletes the token before remote calls. If offline, other users can see the last previously shared position until the server TTL expires. No new upload is intentionally submitted after local opt-out. Background 401/403 stops the task; 401 clears credentials. JWTs live in SecureStore, not source files.

Android Google Sign-In `DEVELOPER_ERROR` / code 10 means a package/signing/client configuration mismatch. Check the installed APK's actual signing SHA-1 and package, register that Android OAuth client, and keep `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` a **web** client from the same project. A debug, release, or Play-signed APK may use different certificates. Changing account selection is not a substitute for fixing that registration. The SDK's configuration doctor can inspect the actual APK. [SDK troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting), [configuration doctor](https://react-native-google-signin.github.io/docs/config-doctor).

Run `pnpm test` for snapshot authorization/expiry regression checks and `node --experimental-strip-types --test src/map/map-data.test.mjs` for event coordinate/privacy filtering.

Naver runtime work is checked separately from the earlier Google-map build. Google login, authenticated Naver tile rendering, marker interaction, and location behavior still require real credentials and device verification; dependency resolution and a successful native build alone do not verify those behaviors.

The earlier prototype passed Android debug and standalone ARM64 release-variant builds using the generated development keystore. Those results precede this Naver SDK migration. See the root README for the coordinator’s current native-build results and package/signature details. No store-ready or physical-device validation is claimed here.


## Photo drafts

Timetable and private calendar forms can choose a single image with the native photo picker. The selected image is normalized to JPEG (maximum edge1600px, decoded2MiB) and sent only to the approved local API. No full-gallery/camera/microphone permission is requested. The app shows a draft and the original photo with enlargement; missing dates remain editable and a separate save is required. The local2B model currently misreads some timetable boundaries and characters, so compare every field. Cancelling or changing sessions discards pending results. Photo import preserves timetable version conflicts and removes old event coordinates. This feature needs the native image-picker/manipulator modules and a rebuilt APK; an existing binary without these modules cannot run it.
