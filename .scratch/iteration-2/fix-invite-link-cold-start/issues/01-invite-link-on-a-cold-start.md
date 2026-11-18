# 01: An Invite Link that starts the stopped app lands on the map, on Android

Status: needs-triage
Found by: [P11-03](../../P11-e2e-tests/issues/03-m1-m2-app-on-an-emulator.md), M2 on a cold start (2026-10-23)
Touches: mobile, most likely how the app reads its initial URL; the cause is not verified.

## What happens

US-FRIEND-01 scenario 2 on Android. A signed-in User's app is stopped, and an Invite Link opened from outside starts
it. The loading screen passes and the map shows, not the accept screen "유지안님의 친구 초대". A plain relaunch after it
shows the map too, so the link's token was not kept either. With the app already running (a warm start), the same link
shows the accept screen at once.

## How to reproduce

On the pinned emulator with the mock APK (`mobile/README.md`, "Device runs"):

- `pnpm test:device` in `mobile/`. M2 on a cold start fails each time, its 30 s wait for the accept screen run out on
  the map; M1 and M2 on a warm start pass. P11-03's run at `cf793ecd`:

  ```
  [Passed] M2 an Invite Link opened on a warm start (1m 6s)
  [Failed] M2 an Invite Link opened on a cold start (1m 23s) (Assertion is false: "유지안님의 친구 초대" is visible)
  [Passed] M1 first run, then a relaunch to the map (48s)
  1/3 Flow Failed
  ```

- Without Maestro: sign in, stop the app, and open `snunow://invite/from-yujian` with `adb shell am start` (a `VIEW`
  intent). The map shows, the same as in the flow.

The flow is `mobile/maestro/integration/m2-invite-link-cold-start.yaml`: a launch that clears the state, the sign-in,
`stopApp`, then `openLink`.

## Why the Jest tests pass

`mobile/__tests__/friends-server.integration.test.tsx`, "shows the accept screen after the loading screen, at a start
of the app", passes: `renderRouter` is given the initial URL directly and never asks Android for it.

## A likely cause, not verified

expo-router 57.0.23's `getInitialURLWithTimeout()` (`node_modules/expo-router/build/fork/useLinking.native.js`) races
React Native's `Linking.getInitialURL()` against a 150 ms timer on Android, a workaround for
facebook/react-native#25675, and starts at `/` when the timer wins. A cold start of a release build can be busy enough
for the timer to win. On iOS it takes `ExpoLinking.getLinkingURL()` and has no race; iOS has not been tried.

## What a fix must show

- M2 on a cold start passes in `pnpm test:device`, and M1 and M2 on a warm start still pass.
- A test that fails before the fix pins the cause, at a seam triage agrees.
- P11-03's M2 criterion is ticked, and the line in `mobile/README.md`'s "Device runs" that says M2 on a cold start
  fails is removed.

## Comments

### Fixed by P15 ticket 10 (2026-11-18)

[P15 ticket 10](../../../iteration-4/P15-app-cleanup/issues/10-invite-link-cold-start-and-page.md) fixed this. The
cause, as confirmed against the installed expo-router 57.0.23 (`mobile/node_modules/expo-router/build/`), is not the
150 ms race this ticket guessed at:

- On Android, `link/linking.js`'s `getInitialURL()` answers a promise (React Native's `Linking.getInitialURL()` raced
  against 150 ms); on iOS it answers `expo-linking`'s `getLinkingURL()` at once.
- `global-state/useStore.js` prefetches the first route's info only when that answer is a string. Otherwise the store's
  route info stays empty until a leaf screen sets it (`useScreens.js`) or a later state change does: React
  Navigation's `onStateChange` is not called for the first state.
- So the signed-in place's layout renders first with `useSegments()` empty, its guard sees no Invite Link and keeps no
  token, and `useOwnPlace`'s Redirect leads to `/` and then to the map. The race only decides whether the router starts
  at the link or at `/`; neither keeps the token.

The fix is `mobile/src/app/+native-intent.ts`: the router's `redirectSystemPath` keeps the token on the phone at a start
of the app, read on Android from expo-linking and then cleared, and gives the address back unchanged.
`mobile/__tests__/invite-link-cold-start.integration.test.tsx` takes Android's way of getting the first address and
failed before the fix. M2 on a cold start passed on the emulator; the run is recorded under ticket 10.
