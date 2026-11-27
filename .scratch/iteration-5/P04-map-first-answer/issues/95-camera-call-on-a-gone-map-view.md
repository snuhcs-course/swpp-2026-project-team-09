# 95: A camera call on a map view that is already gone leaves no unhandled rejection

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. `mobile/src/map/` is JavaScript only. The app's fingerprint (`npx expo-updates fingerprint:generate --platform android`) lists `modules/snu-now-map/android` and its `app.plugin.ts`, the config plugins, the assets and the native dependencies, and no file under `src/`. Releases: an app OTA update.

## What happens now

On 2026-11-28, a font-size change on the emulator restarted the app, and a dev build showed a red toast: the map module's `SnuNowMapView.moveCamera` had been called on a view tag that no longer existed.

A change of the font size recreates Android's Activity. The native map view goes before the JavaScript one unmounts, and a camera call made in between reaches the module with a tag that has no view. The module rejects the call. `native-map.tsx` sends each call as `void view.current?.moveCamera(…)`, so the rejection is unhandled: LogBox shows it in a dev build, and it is reported as an error of the app.

The fault is older than the answer camera's framing (P10 ticket 30, PR 728). That framing makes no call after the map unmounts: its one timer is cleared on unmount, and every move goes through the view's ref or waits for the camera's rest.

## Cause

expo-modules-core rejects a call on a view tag with no view as follows:

- **Android:** `Exceptions.ViewNotFound`, code `ERR_VIEW_NOT_FOUND`. The call's wrappers (`ArgumentCastException`, `FunctionCallException`) keep that code.
- **iOS:** `ViewNotFound`, wrapped in `ArgumentCastException`, whose code (`ERR_ARGUMENT_CAST`) the call takes. Its words stay in the message: "Unable to find the 'SnuNowMapView' view with tag '211'".

## What to build

- `map/view-calls.ts` `sentToView` sends a call to the map module's view:
  - It takes the rejection of a gone view: the code `ERR_VIEW_NOT_FOUND`, or the words "Unable to find the … SnuNowMapView view with tag".
  - It keeps every other rejection. A caller that does not wait leaves that one unhandled, so it is reported as before.
- The three calls of the handle in `native-map.tsx` go through it: a move, the module's own fit before the view is laid out, and a fit worked out here and sent as a move.

## The class

Every call on a native view's ref in the app was read. The map module's view has only two view functions, `moveCamera` and `fitTo`; markers, bounds and zoom limits are props. Its three call sites are all in `native-map.tsx`, and all three are now guarded. The app's other native code (`native-ocr.ts`, `web-cookies.ts`, `push/device.ts`) calls module functions, which take no view tag that can go away.

## Acceptance criteria

- [x] A test fails on the code before: a move, a module fit and a fit sent as a move, each rejected because the view is gone on Android or on iOS, leave an unhandled rejection (4 failed).
- [x] With `sentToView`, they leave none, and any other failure of a call is kept as it came, not swallowed (`map-native-gone-view.unit.test.tsx`, 9 of 9).
- [x] The map's other unit tests pass: `map-native-scale`, `map-native-view`, `map-native` (22 of 22).
- [x] No native file changes; lint, format and types pass on the app.
- [ ] On the emulator after the update: a font-size change with an answer on the map shows no red toast.

## Comments

Built in PR #731 from the 2026-11-28 report of the toast. PR 728 (P10 ticket 30) was checked first and left as it is.

### Agent usage (2026-11-28)

- Agent time: about 15 minutes (an estimate), in one session, from 06:14 KST, the PR's opening included. The check of PR 728's framing before it took about 5 more.
- Tokens, to the PR's opening: 110 input, 40,939 output; cache reads 23,603,503, cache writes 77,074. No subagents.
