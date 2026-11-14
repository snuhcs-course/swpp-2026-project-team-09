# 05 (optional): A short trial of crash reporting in the same Release

Parent: [spec](../spec.md) ("Out of Scope": crash reporting)
Status: ready-for-human
Who: the builder
Blocked by: None. It lands only together with 01, in the 11/19 Release, or it is dropped.
Native files: yes

This ticket is optional. Do it only if Crashlytics was chosen as the crash reporter for the 11/19 Release (see the decisions). It must never delay 01. If it is not passing by the evening of 11/18, drop it, and record why under Comments.

## First, a check on paper (at most 20 minutes)

Read React Native Firebase's Expo setup page for the iOS needs of `@react-native-firebase/app` and `@react-native-firebase/crashlytics`. If iOS needs static frameworks (`useFrameworks: 'static'` through `expo-build-properties`), a `GoogleService-Info.plist`, or any other change to how the iOS pods are linked, drop the ticket now and record the reason and the page under Comments. Pick the newest release line whose documented React Native and Kotlin requirements match the versions in `mobile/package.json` and the React Native Gradle setup, and record the page that says so.

## What to build

If the check passes, a time-boxed trial, at most two hours, on a branch of its own off 01's branch. If it passes every check below, its commits join 01's pull request before the merge. Otherwise nothing of it merges, and crash reporting waits for the next native Release.

The trial adds Firebase Crashlytics through React Native Firebase on Android:
- `@react-native-firebase/app` and `@react-native-firebase/crashlytics`, both pinned to the line chosen above.
- Their two config plugins in `mobile/app.json`. They reuse `android.googleServicesFile` from 01.
- One call that records a test crash, reachable only from `/push-check` in a development build.

## Checks the trial must pass

- [ ] The check on paper passed, with its page recorded.
- [ ] `CI=1 pnpm expo prebuild --platform android --no-install` and `./gradlew assembleRelease` succeed, and the app starts without the "Crashlytics build ID is missing" crash.
- [ ] A test crash from a development build appears in the Firebase console's Crashlytics page for the project within about 10 minutes.
- [ ] `CI=1 pnpm expo prebuild --platform ios` and the hand-built iOS app still build and sign as `infra/production/README.md` describes, without a `GoogleService-Info.plist` and without changing how the iOS pods are linked. If iOS needs either, the trial fails.
- [ ] The app's start on a phone is not visibly slower than with 01 alone.
- [ ] CI's `app-fingerprint` passes with the same raised `version` as 01. No second version raise.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/`.

## Must not change

- Anything in 01's push behavior.
- Any screen of the app outside `/push-check`.
- `main-server/`. No key or secret is added anywhere.

## How a reviewer checks it

Read the Comments: the check on paper with its page, each check above with its result, and either the commits that joined 01's pull request or the reason the trial was dropped.

## Comments
