# 03: Blur behind the glass, and a native Release if it works

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the glass layer).

Native files: `mobile/package.json` (a native dependency) and `mobile/app.json` (`version`), only if the blur works. Releases: a native Release.

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
   - Tell the user that testers reinstall the APK and that the iPhone build is redone by hand.
3. If it does not work on Android: leave the code as it is, and record the result and screenshots here. Ask the user whether iOS should blur alone.

## Must not break

- Updates keep reaching installed APKs until the native Release is out: the blur goes in only with the `version` raise.
- The map stays smooth to pan and zoom under a blurred panel.

## Acceptance criteria

- [ ] The emulator check's result and screenshots are in this ticket's Comments.
- [ ] If it works: the `panel` level blurs on Android and iOS, `version` is raised, CI's `app-fingerprint` passes, and the Release publishes the APK.
- [ ] If it does not: no code change, and the user has decided about iOS.

## Comments
