# 04: iOS: a native build with OTA, checked by the Mac owner

Parent: [P03 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 03

## What to build

The Mac owner follows written steps to build a Production iOS app with `expo-updates` and install it on an iPhone, or on the simulator if there is no iPhone. They then see it take a bundle published by a Release tag, and see 업데이트가 필요합니다. The agent writes the steps. The Mac owner builds and checks. See the spec's "The app" and "Further Notes".

## Acceptance criteria

- [ ] `infra/production/README.md` has iOS build steps for the Mac owner:
  - the `.env` values, the same `EXPO_PUBLIC_*` as the APK;
  - `expo prebuild --platform ios`, then building and installing with Xcode on a free or paid Apple account;
  - the 7-day limit of a free account.
- [ ] The iOS build's fingerprint is compared with the `ios` fingerprint CI computes. If they differ, `app-version.json` records the Mac build's value, and the spec's note is updated.
- [ ] Checked on iOS:
  - a JavaScript change pushed with a Release tag shows after one restart;
  - 내 정보 shows its tag;
  - a higher `latest` in `app-version.json` shows 업데이트가 필요합니다 without an 업데이트 하기 button.

  Screenshots go in the PR.
- [ ] The root `README.md` says the app updates itself, and how a native Release differs from a JavaScript-only one.
