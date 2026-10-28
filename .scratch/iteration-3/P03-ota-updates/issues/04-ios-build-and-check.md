# 04: iOS: a native build with OTA, checked by the Mac owner

Parent: [P03 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 03

## What to build

The Mac owner follows written steps to build a Production iOS app with `expo-updates` and install it on an iPhone, or on the simulator if there is no iPhone. They then see it take a bundle published by a Release tag, and see 업데이트가 필요합니다. The agent writes the steps. The Mac owner builds and checks. See the spec's "The app" and "Further Notes".

## Acceptance criteria

- [x] `infra/production/README.md` has iOS build steps for the Mac owner:
  - the `.env` values: the full list of build settings, the same as the APK and CI, because they change the fingerprint;
  - `expo prebuild --platform ios`, then building and installing with Xcode on a free or paid Apple account;
  - the 7-day limit of a free account.
- [ ] The iOS build's fingerprint is compared with the `ios` fingerprint CI computes. If they differ, `app-version.json` records the Mac build's value, and the spec's note is updated.
- [ ] Checked on iOS:
  - a JavaScript change pushed with a Release tag shows after one restart;
  - 내 정보 shows its tag;
  - a higher `latest` in `app-version.json` shows 업데이트가 필요합니다 without an 업데이트 하기 button.

  Screenshots go in the PR.
- [x] The root `README.md` says the app updates itself, and how a native Release differs from a JavaScript-only one.

## Checks for the Mac owner

Build and install the app as `infra/production/README.md`, "The Production iOS build", says, then:

- [ ] On the Mac, `npx expo-updates fingerprint:generate --platform ios`, with the build's `.env` exported, prints the same hash as `fingerprint.ios` in `app-version.json`, at the time of writing `ffd1bd8fa94e7c53c2109b8a357959d60e817ece`. If not, report the Mac's hash; it replaces the file's, and the spec's note in "Further Notes" is updated.
- [ ] At the first start, 내 정보 shows `앱 1.0.0 · 업데이트 <tag> (<commit>)` with the tag and short commit of the Release built, the embedded bundle's own.
- [ ] After a person pushes a Release tag (`snunow/app/…`) with a visible JavaScript change and its run has published, open the app, which downloads the update, then quit it from the app switcher and open it again: this one restart shows the change, and 내 정보 shows the new tag.
- [ ] With `latest` in `app-version.json` temporarily `1.0.1`, uploaded by whoever maintains the Releases (`gh release upload app-version app-version.json --clobber`), the next start shows 업데이트가 필요합니다 with only 계속 사용하기: no 업데이트 하기, and text asking to install the new version. Put `latest` back to `1.0.0` right after the checks below.
- [ ] While `latest` is still `1.0.1`, with 업데이트가 필요합니다 open, sign in with the same account on another device so that the session's "다른 기기에서 로그인했어요" dialog comes. Record what iOS shows: both dialogs, one after the other, or only one (UIKit presents one modal at a time, so the second may be dropped).
- [ ] `latest` is `1.0.0` again.
- [ ] Screenshots of each check are attached to the PR.
