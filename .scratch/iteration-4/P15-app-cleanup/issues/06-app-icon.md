# 06: The app has its own icon, splash and notification icon

Parent: [P15 spec](../spec.md), item 6; seen on the Production APK of `snunow/all/26.11.16-1` (1.0.2) on an Android emulator on 2026-11-18; no board on the team canvas, since no screen changes: the approved drawing is the icon's master and its brief (see "The approved drawing")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none
Native files: yes. `mobile/app.json` and the images it names change, so this needs a native Release with `version` raised from 1.0.2 to 1.0.3 (`CLAUDE.md`, "The app's native files")

## What is on screen now

Everything here is still what Expo's template gave the app.

- The launcher shows Expo's symbol on light blue (`#E6F4FE`), on Android and on iOS. iOS takes it from an Icon Composer bundle that holds the Expo symbol, a grid and a blue gradient.
- On a cold start the splash is Expo's blue (`#208AEF`) with the Expo symbol, 76 wide.
- A push's small icon is tinted Expo's blue (`#208AEF`).
- The web favicon is Expo's.

## The approved drawing

- The team chose the icon on 2026-11-18: the two-line wordmark "SNU / now" on white, whose "o" is the map's person marker.
- The master is an SVG on a 100-unit canvas, with the script that writes it and a brief. Until this ticket puts them in the repository they are on 김태현's machine, at `~/Downloads/snu-now-app-icon/`. The brief gives the measures; where the brief and this ticket differ, this ticket decides.
- Background `#FFFFFF`. Letters `#001A72`, the design system's SNU blue. Pin `#2F6BFF`, the design system's colour for "me", with a white hole.
- The wordmark spans x 19.6–80.4 and y about 26–74 of the canvas, so a circular mask cuts nothing.
- Rejected, and not to be reopened here: an icon built on the SNU emblem, a navy background, and a light-blue background. With white, the icon's edge fades on a light home screen; that was accepted.

## What changes

- **The app icon** is the master, rendered at 1024 × 1024, opaque, with no alpha channel. The master's own PNG has an alpha channel, so it is not used as it is.
- **iOS** uses the same icon: `ios.icon` is removed, so that iOS takes the app icon, and the Icon Composer bundle is deleted.
- **Android's adaptive icon:**
  - Foreground: the wordmark alone, on transparent. It is sized so that the launcher shows the icon as the master does: the master's whole canvas is the 72 dp a launcher shows of the 108 dp layer, which keeps the wordmark inside the 66 dp safe zone.
  - Background: plain white, as a colour. The background image is dropped.
  - Monochrome: the wordmark in one colour, with "SNU", "n", "w" and the pin, and the pin's hole cut out.
- **The splash** is white with the whole wordmark, about 140 wide. No Expo blue and no Expo symbol is left.
- **The notification icon** is the pin alone, a white silhouette on transparent, 96 × 96, with its hole cut out. Its colour becomes `#001A72`.
- **The favicon** is the icon at 48 × 48.
- **The master, its script and the brief** are added to the repository under `docs/design/app-icon/`, outside `mobile/`, so that they are not part of the app's fingerprint. Every image above is derived from the master, and the ticket's Comments say how.
- **`version`** in `mobile/app.json` becomes 1.0.3, in the same pull request.

## What stays as it is

- The app's name "SNU Now", its package and bundle identifiers, and its scheme.
- Every other setting in `mobile/app.json`, and `mobile/google-services.json`.
- The sign-in screen's emblem and drawings, and every screen of the app. No app code changes.
- The design catalogue shows the app icon as its sample photo. It will show the new icon, and is left so.
- What a push says and when it is sent.

## The Release

- This is the only native change in the Release. It cannot reach an installed APK through EAS Update.
- The merge and the Release go together: between them, an update published from `4.0/Main` reaches no installed APK.
- After the merge, the agent asks 김태현 for approval, then pushes an `app` Release tag (`snunow/app/YY.MM.DD-N`) on the merged commit. The Release workflow builds the APK and replaces `app-version.json` (`infra/production/README.md`, "The Production APK"). `minimum` is left as it is.
- A phone with 1.0.2 is offered the new APK at its next start. Until it installs it, it takes no further update.
- No iOS build is made by this ticket. The iOS build is made by hand by the Mac owner, and takes the new icon when it is next made.

## Acceptance criteria

- [x] On an Android launcher the app's icon is the "SNU / now" wordmark on white, with the blue pin as the "o". Under the circular mask nothing is cut, and the wordmark is as large within the icon as in the master.
- [x] With themed icons on, the icon is the wordmark in one colour, and the pin's hole shows.
- [x] On a cold start the splash is white with the whole wordmark, and nothing is cut. No Expo blue or Expo symbol shows.
- [x] A received push shows the pin in the status bar and in the shade, tinted `#001A72`.
- [x] The app icon's file is 1024 × 1024 with no alpha channel.
- [x] `mobile/app.json` names no `ios.icon` and no adaptive background image, the Icon Composer bundle is gone, and none of the images it names is Expo's default, the favicon included.
- [x] `docs/design/app-icon/` holds the master, its script and the brief.
- [x] `version` is 1.0.3, and CI's `app-fingerprint` job passes with its notice that `version` was raised.
- [x] Tests, by ADR 0007: no app code changes, so no test is added, and the test of the design catalogue still passes. The icon, the splash and the notification icon are native, so they are checked by hand on an Android emulator with an APK built from the branch, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.
- [ ] The pull request's body shows the launcher and the splash before and after, as screenshots of the emulator, in place of the canvas boards.
- [ ] After the merge and 김태현's approval, the `app` Release is made: its APK installs over 1.0.2 and shows the new icon, and `app-version.json` gives 1.0.3 as `latest`.
- [ ] 김태현 checks the Release's APK on a real Android phone: the launcher under its mask, the themed icon, a notification, the icon on a dark and on a light wallpaper, and the splash on a cold start. This is a person's check; its result is recorded under Comments.

## Comments

### How the images are derived (2026-11-18)

`docs/design/app-icon/make_icon.py` writes every image from the master's geometry: first the SVGs beside it, then the PNGs in `mobile/assets/images/`. The README there gives the venv and the command (`DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib <venv>/bin/python docs/design/app-icon/make_icon.py`, rendered by CairoSVG), and the measures. Two runs write the same bytes.

- **The master** (`snu-now-icon.svg`): written by the script byte for byte as the approved file.
- **`icon.png`**, 1024 × 1024, RGB: the master rendered, the alpha channel dropped. Its mean difference from the approved PNG, laid on white, is under 0.02 of 255 per channel.
- **`favicon.png`**, 48 × 48, RGB: the master rendered at 48.
- **`android-icon-foreground.png`**, 1024 × 1024, RGBA: the wordmark without the white square, at 18 + 0.72 u dp on the 108 dp layer, with the pin's white hole. Its ink spans x 32–76 and y 37–71 dp, at most 26 dp from the centre.
- **`android-icon-monochrome.png`**, 1024 × 1024, RGBA: the same geometry with "SNU", `n`, `w` and the pin all `#001A72`. The pin and its hole are one even-odd path, so the hole is transparent. Every pixel is `#001A72`; only the alpha varies.
- **`splash-icon.png`**, 1024 × 810, RGBA: the wordmark's ink box (x 19.6–80.4, y 26.1–73.4) with 2 units of margin. With `imageWidth` 140 the farthest ink is 79 dp from the centre of the 192 dp circle (radius 96 dp), so the largest width that cuts nothing is about 170.
- **`notification-icon.png`**, 96 × 96, RGBA: the pin alone, its height 80 px with 8 px clear above and below, white, with its hole cut out by an even-odd path.
- **Removed:** `android-icon-background.png` and the Icon Composer bundle `assets/expo.icon/`.

### Hand check on an Android emulator (2026-11-18)

**Setup:**
- The emulator `sdk_gphone64_arm64` (Android 16, Pixel Launcher).
- **Before:** the APK installed on it was the Production APK 1.0.2 (not a debug build).
- **After:** a debug APK built from this branch (`expo prebuild --clean`, then `assembleDebug` with JDK 17), installed over it with `adb install -r`, and the bundle from Metro with the app's own mock data.
- The emulator had its animations off. They were turned on for the check and off again after it.
- The splash was caught by a burst of raw `screencap`s after a tap on the launcher icon.
- The app was added to the home screen from the app drawer. The hotseat's "SNU Now" is an app suggestion, which the launcher draws inside a coloured ring, before and after.

**Launcher (`P15-06-launcher.png`):**
- **Before:** Expo's symbol on light blue, with the grid.
- **After:** the "SNU / now" wordmark on white, with the blue pin as the "o", uncut by the circle.
- In the app drawer the wordmark's ink measured 97 × 75 px in a circle 157 px across. The master at that size gives 95.5 × 74.3 px at the same place, so it is as large as in the master.

**Themed icons on** (Wallpaper & style, "Themed icons"; `P15-06-launcher.png`):
- **Before:** Expo's symbol in one colour.
- **After:** the wordmark in the theme's one colour on its tinted plate, with the pin's hole showing the plate.
- This launcher themes icons on the home screen only, not in the app drawer.

**Splash on a cold start (`P15-06-splash.png`):**
- **Before:** Expo's blue `#208AEF` with the Expo symbol.
- **After:** white, with the whole wordmark centred. Its ink measured 346 × 268 px, which is what 140 dp gives at 420 dpi, so nothing is cut. No Expo blue or symbol shows.

**Push (`P15-06-notification.png`):**
- `/push-check` was granted the permission and gave a token.
- A push was sent through Expo's push API with the app in the background, to the channel `default`.
- The status bar shows the pin with its hole.
- The shade shows the pin, white, on a circle of `#001A72` (sampled as 0, 26, 114). Its record has `color=0xff001a72`.

The screenshots are in the pull request's body. The raw ones were kept outside the repository.

### Notes (2026-11-18)

- **The layers' SVGs:** the master's folder also holds the four layers' SVGs that the script writes (`android-icon-foreground.svg`, `android-icon-monochrome.svg`, `splash-icon.svg`, `notification-icon.svg`), so that each PNG can be written again from them. The handoff's master PNG is not kept: `icon.png` is that render without alpha.
- **iOS:** the handoff's brief left it open whether to rebuild the Icon Composer bundle or drop `ios.icon`. The ticket's choice was followed: `ios.icon` is dropped and the bundle deleted.
- **`app-fingerprint`:** CI's check was run locally with `release.sh fingerprint-and-decide`, the repository's production app variables and the published `app-version.json`. It gave `publish-needs-build`: version 1.0.3 is above the latest native build's 1.0.2, so CI passes with its notice that `version` was raised.
- **Still to do:**
  - The pull request, with the three screenshots in its body.
  - The `app` Release after the merge and 김태현's approval.
  - 김태현's check on a phone: the launcher under its mask, the themed icon, a notification, the icon on a dark and on a light wallpaper, and the splash on a cold start.
