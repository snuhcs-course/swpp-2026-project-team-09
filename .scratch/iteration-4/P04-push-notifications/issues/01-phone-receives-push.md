# 01: The phone can receive a push (the native part, 11/19 Release)

Parent: [spec](../spec.md) ("The native part")
Status: ready-for-agent
Who: the server-side member implements it. The builder runs the checks that need a Mac or a phone and makes the Release.
Blocked by: None (can start immediately). Its pull request merges once its review passes, and ships in the 11/19 native Release.
Native files: yes

## What to build

An APK from the 11/19 Release that can receive a push. On a development build, the developer screen `/push-check` asks for the permission and shows the phone's Expo push token. A test push sent from Expo's push tool to that token arrives with the app's notification icon, in the channel "알림" (notifications), and tapping it opens the app. Nothing else in the app changes: no screen asks for the permission yet, and nothing registers a token. Every existing test passes unchanged.

## Files

Create:
- `mobile/google-services.json`: downloaded from the Firebase console (Project settings, General, Your apps) by a member of the project, for the Android app `com.bonnieandclaude.snunow` in the project `snunow-b5827`, and committed. It holds no secret. Committing it gives CI's `app-fingerprint` job, the Release workflow, the dev APK, and every developer the same bytes, which the fingerprint needs.
- `mobile/assets/images/notification-icon.png`: 96 by 96, white on transparent. Derive it from `android-icon-monochrome.png` if that file is white on transparent; otherwise draw it from the app icon's shape.
- `mobile/plugins/ios-without-push.ts`: an iOS config plugin that deletes `aps-environment` from the entitlements with `withEntitlementsPlist`, with the AI-generated box. Import from `expo/config-plugins.js`, as `mobile/plugins/ios-scene-life-cycle.ts` does, since eas-cli loads plugins through Node's ESM loader. One comment says why it is listed before `expo-notifications`.
- `mobile/src/push/device.ts`: the thin wrapper (below), with the box.
- `mobile/src/app/push-check.tsx` and `mobile/src/screens/push-check-screen.tsx`: the developer screen, redirecting to `/` when `__DEV__` is false, as `mobile/src/app/ocr-check.tsx` does.
- `mobile/__tests__/push/device.unit.test.ts`.

Change:
- `mobile/package.json` and the lockfile: `pnpm expo install expo-notifications` in `mobile/`, so the version is the one Expo picks for SDK 57. `expo-constants` is raised to the version that `expo-notifications` asks for (`~57.0.24`), so that one copy of it is installed and `pnpm exec expo-modules-autolinking verify` finds no duplicate.
- `mobile/app.json`:
  - add `"./plugins/ios-without-push.ts"` to `plugins`, and right after it `["expo-notifications", { "icon": "./assets/images/notification-icon.png", "color": "#208AEF", "defaultChannel": "default" }]`. The order matters: a mod registered later runs first and then calls the earlier one, so the plugin listed first runs last and removes the entitlement the notifications plugin added;
  - add `"googleServicesFile": "./google-services.json"` under `android`;
  - `version`: if it still equals `latest` in the published `app-version.json` (1.0.1 today), raise it to 1.0.2. If another native pull request of this Release already raised it, leave it. `version` is raised once per native build.
- `mobile/__tests__/support/jest-setup.ts`: a default `jest.mock('@/push/device', …)` whose functions report unavailable (`pushAvailable` false, `pushPermission` and `askPushPermission` `'unavailable'`, `expoPushToken` null, `onPushTokenChange` a no-op unsubscribe, `unregisterPush` resolved). The jest-expo preset answers `requireOptionalNativeModule` with stand-ins for Expo's notification modules, so without this mock the wrapper would look present in every test. A push test opts in with `jest.mock('@/push/device', () => jest.requireActual('@/push/device'))` and mocks `expo-notifications` itself.
- `mobile/README.md`: a section "Push notifications": the channel, the icon, `/push-check`, how to send a test push from Expo's push tool, that the FCM V1 key lives in EAS only, that iOS has no push, and that a token shown on `/push-check` is never pasted into issues, pull requests, or chats.
- `infra/production/README.md`: one line in "The Production APK" that `google-services.json` is part of the native part and its bytes are in the fingerprint, and one line in "The Production iOS build" that the build has no push entitlement.

## The wrapper `device.ts`

- `CHANNEL_ID = 'default'`. The channel's name is "알림" (notifications), with `AndroidImportance.HIGH`.
- `pushAvailable(): boolean`: whether `requireOptionalNativeModule('ExpoPushTokenManager')` from `expo` returns a module, as `mobile/src/features/timetable-ocr/native-ocr.ts` checks its module. If importing `expo-notifications` throws without its native module, load it lazily behind this check.
- `pushPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'>`. On Android, a permission reported as denied that can still be asked (`canAskAgain`) reads as `undetermined`: Android 13 and later report a permission that was never asked that way, since notifications start disabled there. So `undetermined` means the phone's own prompt can still show.
- `askPushPermission(): Promise<'granted' | 'denied' | 'unavailable'>`: creates the channel first, then asks.
- `expoPushToken(): Promise<string | null>`: creates the channel, then calls `getExpoPushTokenAsync({ projectId })` with the EAS project id from the app's configuration (`extra.eas.projectId`). Null when unavailable, not granted, or when the call fails (offline, for example).
- `onPushTokenChange(listener): () => void`: wraps `addPushTokenListener`, and calls the listener only when the event's token differs from the last one seen. The library sends the event after every fetch of the token, changed or not, so a listener that fetches the token again would otherwise never stop.
- `unregisterPush(): Promise<void>`: calls `unregisterForNotificationsAsync()` when the module is present, and waits at most 3 seconds for it, so that a slow answer never holds a sign-out. Ticket 03 calls it when a Session ends on the phone.
- No function throws.

## Must not change

- Any screen or flow of the app, the acceptance-test flows, and the Maestro flows.
- `mobile/app.config.ts`, unless the plugin cannot be set in `app.json`.
- The FCM V1 key: it is in EAS, put there by people, and is never in the repository or in any file an agent writes.
- `main-server/` and `main-server/eval/`.

## Acceptance criteria

- [ ] `expo-notifications` is a dependency at the version Expo picks for SDK 57, with its plugin settings as above, listed after `./plugins/ios-without-push.ts`.
- [ ] `mobile/google-services.json` is committed and `android.googleServicesFile` points at it.
- [ ] Before the Release, a person has restricted the file's Android API key by API in the Google Cloud console to the FCM Registration API and the Firebase Installations API, and a development build still gets a token after the restriction.
- [ ] After `CI=1 pnpm expo prebuild --platform android --no-install`, the manifest has the default notification icon, color, and channel `default`, and the Gradle files apply the Google services plugin.
- [ ] On the pull request, before it merges, `CI=1 pnpm expo prebuild --platform ios` leaves no `aps-environment` in the generated entitlements file. If it is there, the plugin order is wrong. Xcode builds and signs with the free team as `infra/production/README.md` describes. This check needs a Mac: the builder runs it when the implementer has none.
- [ ] `version` is raised once for the Release, and CI's `app-fingerprint` job passes with the notice that the native part changed and needs a build.
- [ ] Unit tests with `expo-notifications` mocked: the channel is created before the permission is asked and before the token is asked; the token call gets the project id; a failing token call gives null; `unregisterPush` calls the library once, and resolves after 3 seconds when the library does not answer; on Android a denied permission that can still be asked reads as undetermined; the token listener is told only of a token that differs from the last one. For "unavailable", the test mocks `expo` so that `requireOptionalNativeModule` returns null, and every function reports unavailable without throwing.
- [ ] The whole mobile suite passes unchanged.
- [ ] On a development build on a phone, or an emulator with a Google Play image, `/push-check` shows the permission, asks for it, and shows the token. A push sent to that token from Expo's push tool arrives with the notification icon. The app's notification settings list the channel "알림" and no "Miscellaneous" channel. Tapping the push opens the app.
- [ ] The builder merges the pull request once its review passes. For the Release, a commit of the iteration's Main that holds it is tagged `snunow/app/26.11.19-N`, the `release app` job builds the APK in CI, which installs over the 1.0.1 APK, and `app-version.json` names the new version. The iOS build is then made by hand and its fingerprint checked against `fingerprint.ios`, as "The iOS fingerprint" in `infra/production/README.md` describes.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/`.

## How a reviewer checks it

1. Read the diff: the only native changes are the dependency (with `expo-constants` raised beside it), the two plugin entries in that order, `googleServicesFile`, `version`, the icon, the iOS plugin, and `google-services.json`. No key file.
2. Read CI's `app-fingerprint` notice, and the iOS prebuild's entitlements.
3. Install the development build, open `snunow://push-check`, allow notifications, copy the token, and send a test push from Expo's push tool. It arrives, and tapping it opens the app.
4. After the Release, install the APK from the Release page over the old one, and check that it starts and signs in.

## Comments
