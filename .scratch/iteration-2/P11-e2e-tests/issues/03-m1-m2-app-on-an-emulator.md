# 03: M1 and M2: the app on an Android emulator against its mock data

Parent: [P11 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-05 (mobile: tests named by level, run and measured apart)
Touches: mobile only: two scripts and their `package.json` entries, `maestro/subflows/` and `maestro/integration/`, `.gitignore`, the README. Not the app's code, its Jest tests or CI.
Needs a person: at the start, permission to install Maestro CLI 2.11.0, and a booted emulator of the pinned image.

## What to build

The app's first runs on a device. `pnpm build:mock-apk` in `mobile/` builds a release APK whose server addresses and Google web client ID are blanked, so the app always signs in by its mock and answers from its own mock data (spec: "M1 and M2: the mock APK"). `pnpm test:device` checks the pinned emulator and Maestro, turns the animations off, reinstalls that APK and runs the Maestro flows in `mobile/maestro/integration/`, writing a JUnit report and screenshots (spec: "M1 and M2: the emulator and Maestro").

M1 (US-AUTH-01 scenario 1) is a first run from sign-in through consent and Onboarding to the map, and a relaunch that finds the map without signing in again. M2 (US-FRIEND-01 scenario 2) opens an Invite Link from outside the app, on a cold and on a warm start, and accepting it puts the sender among the Friends. By ADR 0007 these are integration tests, since the app does not reach the servers; a Maestro flow's level is its folder, and nothing goes into `mobile/maestro/e2e/`. Shared steps such as sign-in live in `mobile/maestro/subflows/`, which has no level.

Neither command is part of `pnpm test` or CI; both are run by hand.

## Acceptance criteria

- [ ] `pnpm build:mock-apk` runs a script that points `JAVA_HOME` at Homebrew's `openjdk@17`, exports the main server's address, the socket server's address, Google's web client ID and `INVITE_LINK_HOST` as empty strings, unsets `ANDROID_X86_64`, and runs `pnpm expo prebuild --platform android --clean` and `./gradlew assembleRelease`; the APK is `arm64-v8a` alone, takes `KAKAO_NATIVE_APP_KEY` from `mobile/.env`, and is signed with the dev APK's debug key.
- [ ] The emulator is the pinned one: `system-images;android-36;google_apis_playstore;arm64-v8a` with the "Medium Phone" profile. The README gives its cold boot for the official run (`-no-snapshot-load`) and the wait until `sys.boot_completed` is 1, and the emulator and image revisions used are recorded in `## Comments`.
- [ ] M1 and M2 sit in `mobile/maestro/integration/`, shared steps in `mobile/maestro/subflows/`, and nothing in `mobile/maestro/e2e/`. Every flow names `appId: com.bonnieandclaude.snunow` and finds elements by visible text or accessibility label; Korean appears only in selectors, and nothing is typed in Korean.
- [ ] M1 passes as the spec's flow describes it: consent, then "프로필 만들기" with the mock's suggested name, a department chosen by scrolling, then the map screen and its bottom tabs; after a relaunch without clearing state, the map screen appears and the sign-in screen does not.
- [ ] M2 passes on a cold start (the app stopped, `snunow://invite/from-yujian` opened with `openLink`) and on a warm start (opened while on the map): the accept screen shows "유지안님의 친구 초대" and the location notice; after "수락" the map shows "유지안님과 친구가 됐어요" and the Friends list under "내 정보" lists "유지안".
- [ ] Each flow starts with a launch that clears the app's state, and a later launch keeps it only where the journey is about what the phone kept; no `retry`, no fixed sleep, `extendedWaitUntil` with a timeout for the first screen after a launch; screenshots at each checkpoint; no step asserts on the map.
- [ ] `pnpm test:device` checks that exactly one device is connected, with ABI `arm64-v8a` and API 36, and that `maestro --version` prints 2.11.0; sets the window, transition and animator scales to 0; reinstalls the mock APK; and runs `maestro test --format junit --output <run>/report.xml --test-output-dir <run> maestro/integration` from `mobile/`.
- [ ] Each run's folder is named by date and commit and sits in a results folder that `mobile/.gitignore` ignores.
- [ ] `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` in `mobile/` pass, and `pnpm test` runs neither new command; no app code, Jest test or CI workflow changes.
- [ ] `mobile/README.md` gains a section on device runs: the APK build, the emulator, the Maestro install, `pnpm test:device` and where the results go.
- [ ] Every new source file (the Maestro flows and the shell scripts) starts with the `#` AI-generated box, each changed source file gets a new row (`CLAUDE.md`), and the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
