# 03: Blur behind the glass, and a native Release if it works

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the glass layer).

Native files: `mobile/package.json` (a native dependency) and `mobile/app.json` (`version`), only if the blur works. Releases: a native Release.

Outcome: Android does not blur, and iOS blurs with `expo-glass-effect`, already in the build. No native file changes and no native Release; see Comments.

## What happens now

- The glass layer (ticket 01) is translucent without blur.
- The Android map is the Kakao Maps SDK (`com.kakao.maps.open:android`) in our native module `modules/snu-now-map`. It draws with GL.
- Android blur, as `expo-blur` does it, redraws the views behind it into a bitmap. A GL view may not be redrawn that way, and the blur behind it would then be blank or black.
- iOS blurs at compositing, so the map is blurred there.
- A native change needs `version` raised and a native Release (`infra/production/README.md` § The Production APK). CI's `app-fingerprint` job fails a push that changes the native part without raising `version`.

## What to build

1. Check first.
   - Add the blur dependency in a local development build.
   - Put a `panel` glass over the map (the Assistant's bottom card, after ticket 02, or a test screen) on the Android emulator.
   - Record in this ticket, with screenshots, whether the map shows through blurred, and whether panning stays smooth.
   - The build is heavy: run nothing else heavy at the same time.
2. If it works on Android:
   - Add the blur inside the glass layer, at the `panel` level only. No call site changes.
   - Raise `version` in `mobile/app.json` and make a native Release as the README describes. Nothing else rides with this pull request.
   - Decide `expo-glass-effect` in the same pull request: use it for the iOS blur, or remove it. Ticket 01 left it in place because removing it is a native change.
   - Tell the user that testers reinstall the APK and that the iPhone build is redone by hand.
3. If it does not work on Android: leave the code as it is, and record the result and screenshots here. Ask the user whether iOS should blur alone.

## Must not break

- Updates keep reaching installed APKs until the native Release is out: the blur goes in only with the `version` raise.
- The map stays smooth to pan and zoom under a blurred panel.

## Acceptance criteria

- [x] The emulator check's result and screenshots are in this ticket's Comments.
- [ ] If it works: the `panel` level blurs on Android and iOS, `version` is raised, CI's `app-fingerprint` passes, and the Release publishes the APK.
- [x] If it does not: no code change, and the user has decided about iOS. The user decided more than iOS: Android's panel turns denser and `inner` with it, a JavaScript change (Comments).

## Comments

### The emulator check (2026-11-26)

Android does not blur the map. The panel shows the map sharp through its 50% white, the same as the glass without
blur. It is never blank or black, and panning stays smooth.

How it was checked:

- A local debug build of `5.0/A04-03-blur` (on 01's `5.0/A04-01-glass-layer`, 7772b569) with `expo-blur` 57.0.3,
  the version `npx expo install` gives for Expo 57, on the `Medium_Phone` emulator (Android 16, API 36), mock data.
- Android's `expo-blur` needs the views it blurs wrapped in a `BlurTargetView` and that view's ref passed as
  `blurTarget`; `blurMethod` was `dimezisBlurViewSdk31Plus`, `intensity` 40, `tint` light.
- For the check only, not committed: the map in `Map` wrapped in a `BlurTargetView`, and two `panel` glasses over it,
  one with a `BlurView` inside and one without.
- As a control, a row of coloured React Native stripes was put inside the same `BlurTargetView`, over the map.

What it showed:

- Under the blurred panel the React Native stripes are blurred, so the blur itself works. The map's roads and names
  under the same panel stay sharp ([map and stripes](../references/after/03-map-and-rn-under-blur.jpg),
  [map alone](../references/after/03-map-under-blur.jpg)).
- The reason: the Kakao `MapView` draws in a `KGLSurfaceView`, a `SurfaceView`. Its pixels are on a surface of their
  own, behind the window, and the blur library redraws only the views of the window, where the map is a transparent
  hole. The blur therefore holds no map, and the panel's own white is all that covers it.
- Panning: the map moves as before. While it was panned the app's UI drew no frames (`dumpsys gfxinfo`), because the
  map draws on its own surface, so the blur adds no work and also never follows the map.

What follows from the spec: Android keeps the translucent glass, and no code changes here. iOS, which blurs at
compositing, waits for the user's decision. (The user's decision below changed this: see it.)

### The user's decision (2026-11-26)

- Android: no blur. The panel's white goes from 50% to 80%, so that words on it never run into the map's lines.
- iOS: the panel blurs with `GlassView` from `expo-glass-effect`, the system's Liquid Glass, on iOS 26 and later,
  with no white over it: only the thin line along its top and its shadow. Before iOS 26 it is the Android panel.
- The user chose both values on an iPhone 14 Pro, from a build with a test panel over the map (white over the blur
  at 50%, 42%, 35% and 0%; without blur, 75% and 82%).
- `expo-glass-effect` is already in the native build, left by 01, so this is a JavaScript change: no `version` raise
  and no native Release. `expo-blur` is not added.
- No call site changes: the choice is made inside `Glass`.
- The iOS look is checked by the user on an iPhone, as this Mac checks only the Android emulator.
- With the unblurred panel at 80%, the `inner` level (chips and boxes inside a panel), also 80%, no longer stood
  out on it. The user raised `inner` to 90%.
