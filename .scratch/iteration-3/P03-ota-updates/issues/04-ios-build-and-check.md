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

## Walkthrough for the Mac owner

These are the same steps the Android check followed on 2026-10-28.

How it works: 내 정보's last line shows `앱 1.0.0 · 업데이트 <tag> (<commit>)`. The tag is baked into the JavaScript bundle when it is built. A new Release tag on the same code therefore changes that line, and no code change is needed.

1. Build and install the iOS app from `snunow/app/26.10.28-4` (4e0e516), with `.env` as "The Production iOS build" says, `EXPO_PUBLIC_RELEASE_TAG=snunow/app/26.10.28-4` and `EXPO_PUBLIC_RELEASE_COMMIT=$(git rev-parse snunow/app/26.10.28-4)`. Check the fingerprint (first check above).
2. Open the app. 내 정보 shows `업데이트 snunow/app/26.10.28-4 (4e0e516)`.
3. Publish an update by pushing a new tag on the same commit. This is a Production release, so a person runs it:
   ```bash
   git fetch origin --tags
   git tag snunow/app/YY.MM.DD-N snunow/app/26.10.28-4   # today's date, next free N
   git push origin snunow/app/YY.MM.DD-N
   ```
   Wait until the Release run in GitHub Actions is green, about 5 minutes; it waits for CI first.
4. Open the app once, which downloads the update. Quit it completely by swiping it away in the app switcher, then open it again. 내 정보 now shows the new tag.
5. Roll back by running the earlier tag again. Don't push for this:
   ```bash
   gh workflow run release.yml -R snuhcs-course/swpp-2026-project-team-09 --ref snunow/app/26.10.28-4
   ```
   You can also use Actions → Release → Run workflow → "Use workflow from": the tag. When the run is green, open, quit and open the app again. 내 정보 is back to `-4`.
6. Ask the person who maintains the Releases to set `latest` to `1.0.1` in `app-version.json`, then do the dialog checks above. Ask them to set it back to `1.0.0` right after.
