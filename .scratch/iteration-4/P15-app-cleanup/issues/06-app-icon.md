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

- [ ] On an Android launcher the app's icon is the "SNU / now" wordmark on white, with the blue pin as the "o". Under the circular mask nothing is cut, and the wordmark is as large within the icon as in the master.
- [ ] With themed icons on, the icon is the wordmark in one colour, and the pin's hole shows.
- [ ] On a cold start the splash is white with the whole wordmark, and nothing is cut. No Expo blue or Expo symbol shows.
- [ ] A received push shows the pin in the status bar and in the shade, tinted `#001A72`.
- [ ] The app icon's file is 1024 × 1024 with no alpha channel.
- [ ] `mobile/app.json` names no `ios.icon` and no adaptive background image, the Icon Composer bundle is gone, and none of the images it names is Expo's default, the favicon included.
- [ ] `docs/design/app-icon/` holds the master, its script and the brief.
- [ ] `version` is 1.0.3, and CI's `app-fingerprint` job passes with its notice that `version` was raised.
- [ ] Tests, by ADR 0007: no app code changes, so no test is added, and the test of the design catalogue still passes. The icon, the splash and the notification icon are native, so they are checked by hand on an Android emulator with an APK built from the branch, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.
- [ ] The pull request's body shows the launcher and the splash before and after, as screenshots of the emulator, in place of the canvas boards.
- [ ] After the merge and 김태현's approval, the `app` Release is made: its APK installs over 1.0.2 and shows the new icon, and `app-version.json` gives 1.0.3 as `latest`.
- [ ] 김태현 checks the Release's APK on a real Android phone: the launcher under its mask, the themed icon, a notification, the icon on a dark and on a light wallpaper, and the splash on a cold start. This is a person's check; its result is recorded under Comments.
