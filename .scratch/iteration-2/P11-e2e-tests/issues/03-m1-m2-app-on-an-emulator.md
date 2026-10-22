# 03: M1 and M2: the app on an Android emulator against its mock data

Parent: [P11 spec](../spec.md)
Status: resolved
Blocked by: P09-05 (mobile: tests named by level, run and measured apart)
Touches: mobile only: two scripts and their `package.json` entries, `maestro/subflows/` and `maestro/integration/`, `.gitignore`, the README. Not the app's code, its Jest tests or CI.
Needs a person: at the start, permission to install Maestro CLI 2.11.0, and a booted emulator of the pinned image.

## What to build

The app's first runs on a device. `pnpm build:mock-apk` in `mobile/` builds a release APK whose server addresses and Google web client ID are blanked, so the app always signs in by its mock and answers from its own mock data (spec: "M1 and M2: the mock APK"). `pnpm test:device` checks the pinned emulator and Maestro, turns the animations off, reinstalls that APK and runs the Maestro flows in `mobile/maestro/integration/`, writing a JUnit report and screenshots (spec: "M1 and M2: the emulator and Maestro").

M1 (US-AUTH-01 scenario 1) is a first run from sign-in through consent and Onboarding to the map, and a relaunch that finds the map without signing in again. M2 (US-FRIEND-01 scenario 2) opens an Invite Link from outside the app, on a cold and on a warm start, and accepting it puts the sender among the Friends. By ADR 0007 these are integration tests, since the app does not reach the servers; a Maestro flow's level is its folder, and nothing goes into `mobile/maestro/e2e/`. Shared steps such as sign-in live in `mobile/maestro/subflows/`, which has no level.

Neither command is part of `pnpm test` or CI; both are run by hand.

## Acceptance criteria

- [x] `pnpm build:mock-apk` runs a script that points `JAVA_HOME` at Homebrew's `openjdk@17`, exports the main server's address, the socket server's address, Google's web client ID and `INVITE_LINK_HOST` as empty strings, unsets `ANDROID_X86_64`, and runs `pnpm expo prebuild --platform android --clean` and `./gradlew assembleRelease`; the APK is `arm64-v8a` alone, takes `KAKAO_NATIVE_APP_KEY` from `mobile/.env`, and is signed with the dev APK's debug key.
- [x] The emulator is the pinned one: `system-images;android-36;google_apis_playstore;arm64-v8a` with the "Medium Phone" profile. The README gives its cold boot for the official run (`-no-snapshot-load`) and the wait until `sys.boot_completed` is 1, and the emulator and image revisions used are recorded in `## Comments`.
- [x] M1 and M2 sit in `mobile/maestro/integration/`, shared steps in `mobile/maestro/subflows/`, and nothing in `mobile/maestro/e2e/`. Every flow names `appId: com.bonnieandclaude.snunow` and finds elements by visible text or accessibility label; Korean appears only in selectors, and nothing is typed in Korean.
- [x] M1 passes as the spec's flow describes it: consent, then "프로필 만들기" with the mock's suggested name, a department chosen by scrolling, then the map screen and its bottom tabs; after a relaunch without clearing state, the map screen appears and the sign-in screen does not.
- [ ] M2 passes on a cold start (the app stopped, `snunow://invite/from-yujian` opened with `openLink`) and on a warm start (opened while on the map): the accept screen shows "유지안님의 친구 초대" and the location notice; after "수락" the map shows "유지안님과 친구가 됐어요" and the Friends list under "내 정보" lists "유지안".
- [x] Each flow starts with a launch that clears the app's state, and a later launch keeps it only where the journey is about what the phone kept; no `retry`, no fixed sleep, `extendedWaitUntil` with a timeout for the first screen after a launch; screenshots at each checkpoint; no step asserts on the map.
- [x] `pnpm test:device` checks that exactly one device is connected, with ABI `arm64-v8a` and API 36, and that `maestro --version` prints 2.11.0; sets the window, transition and animator scales to 0; reinstalls the mock APK; and runs `maestro test --format junit --output <run>/report.xml --test-output-dir <run> maestro/integration` from `mobile/`.
- [x] Each run's folder is named by date and commit and sits in a results folder that `mobile/.gitignore` ignores.
- [x] `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` in `mobile/` pass, and `pnpm test` runs neither new command; no app code, Jest test or CI workflow changes.
- [x] `mobile/README.md` gains a section on device runs: the APK build, the emulator, the Maestro install, `pnpm test:device` and where the results go.
- [x] Every new source file (the Maestro flows and the shell scripts) starts with the `#` AI-generated box, each changed source file gets a new row (`CLAUDE.md`), and the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **Files.** The scripts are `mobile/scripts/build-mock-apk.sh` and `mobile/scripts/test-device.sh`, run by
  `pnpm build:mock-apk` and `pnpm test:device`. The flows are `maestro/integration/m1-first-run.yaml`,
  `m2-invite-link-cold-start.yaml` and `m2-invite-link-warm-start.yaml`; the subflows are `maestro/subflows/sign-in.yaml`
  (the sign-in screen to the map: consent, Onboarding, the location explanation), `map.yaml` (the map screen, waited for
  with `extendedWaitUntil`, 30 s) and `accept-invite.yaml` (the accept screen to the Friends list). Screenshots are named
  by the flow through the subflows' `SHOTS` variable.
- **Sign-in.** "서울대 계정으로 로그인" is the sign-in screen's header, which each flow waits for as its first screen. The
  tap goes to the button, by its accessibility label `서울대학교 구글 계정(@snu.ac.kr)으로 로그인`, as the Jest tests press it.
- **No permission granted.** Every `launchApp` passes `permissions: { all: deny }`. Maestro's default grants all; the app
  then watches the location, and on this emulator Google Play services put its "Location Accuracy" dialog over the map,
  which hid the app from Maestro (the first run failed on it). Its appearance depends on the emulator's settings. Not
  granted the location, the app shows its own explanation "내 위치를 지도에 표시할까요?" once, and the sign-in subflow answers
  "나중에".
- **The department** is 경제학부, chosen in the list by slow swipes inside it (`swipe` 58 % to 42 % of the screen's height,
  1.5 s), repeated while it is not visible, at most 10 times. `scrollUntilVisible` swipes from the screen's centre and
  flings past rows: with 컴퓨터공학부 it passed once and failed once, the list having scrolled on to 사범대학. The swipe's
  place is the list's on the pinned Medium Phone with the keyboard up. The loop polls a condition; it retries nothing.
- **The map screen** is the 지도 tab `selected`, the AI's input "AI에게 메시지" and the tabs 파티, 행사 and 내 정보. Nothing
  looks at the map's content.
- **The Friends list.** 내 정보 is scrolled to "친구 관리" (its label carries the count, so `친구 관리.*`), the list's header
  reads "친구 13" (`친구 \d+`), and the flow scrolls until "유지안" is visible.
- **Results.** `device-results/<date>T<HHMMSS>-<short commit>/` under `mobile/`, ignored by `mobile/.gitignore`. Maestro
  puts its output in a folder named by its start time, with a folder per flow (screenshots, its log, the emulator's
  logcat). The logcat holds the Kakao key the map sends; the README says to share the report and screenshots only.
- **Reinstall** is `adb uninstall`, then `adb install`, so that an APK signed with another key cannot block it.
- **The `ios` script.** `package.json` already says `expo run:ios`; `expo prebuild` printed
  `Updated package.json | no changes`, so there was nothing to revert.
- **Box rows** are dated 2026-10-22, as the P09–P11 conventions ask. `package.json`, `.gitignore` and the README take no
  box.

### Found: an Invite Link does not open on a cold start (2026-10-23)

M2 on a cold start fails, the same each time (both runs of the flow, and once by hand with `adb shell am start`): with
the signed-in app stopped, `snunow://invite/from-yujian` starts it, the loading screen passes, and the map shows, not
the accept screen. A plain relaunch after it shows the map too, so the token was not kept either. On a warm start the same link
shows the accept screen at once. The Jest test "shows the accept screen after the loading screen, at a start of the
app" passes, since `renderRouter` is given the initial URL directly.

A likely cause, not verified: on Android, expo-router's `getInitialURLWithTimeout()`
(`node_modules/expo-router/build/fork/useLinking.native.js`) races React Native's `Linking.getInitialURL()` against a
150 ms timer and starts at `/` when the timer wins, which a busy cold start can make it do. The fix is in the app's
code, outside this ticket and the spec ("No product code changes"), so the flow stays as the spec describes it and
fails until a follow-up ticket fixes the app. The M2 criterion is left unticked for it; its warm start passes.

### Evidence (2026-10-23)

- **The APK** (`pnpm build:mock-apk` in both slots, 4 minutes with Gradle's cache): prebuild printed
  `env: export EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID GOOGLE_IOS_URL_SCHEME KAKAO_NATIVE_APP_KEY`, so the four blanked
  variables were not taken from `.env`. The bundle (`assets/index.android.bundle`, Hermes) holds none of `.env`'s main
  server address, socket server address or Google web client ID, and no `googleusercontent` or `sslip`, while it holds
  `from-yujian`. All 28 native libraries are under `lib/arm64-v8a/`. `apksigner verify --print-certs`:
  `CN=Android Debug`, SHA-256 `FA:C6:17:45:…:91:03:3B:9C`, the fingerprint in the main server's `.env.example`, and
  SHA-1 `5e8f1606…8cabf625`, which is the Kakao key hash `Xo8WBi6jzSxKDVR4drqm84yr9iU=` the README names. The map drew Kakao's tiles
  in the screenshots. `ANDROID_X86_64` was unset. `shellcheck` passes on both scripts.
- **The emulator.** AVD `Medium_Phone` (`hw.device.name=medium_phone`), `system-images;android-36;google_apis_playstore;arm64-v8a`
  revision 7, Android Emulator 37.1.11.0 (build 15917651), on the Apple Silicon Mac. Cold boot with
  `-no-snapshot-load -no-audio`; `sys.boot_completed` was 1 after 14 to 18 s. Maestro CLI 2.11.0 on Homebrew's JDK 17.
- **Red first.** The first `pnpm test:device` failed M2 warm on `Assertion is false: "지도", selected is visible`, with
  Google's Location Accuracy dialog on top, which led to the permissions above. A copy of M1 whose relaunch cleared the
  state failed on the same assertion, the sign-in screen showing, so the relaunch check can fail.
- **Final `pnpm test:device`** at `cf793ecd`, after a cold boot:

  ```
  [Passed] M2 an Invite Link opened on a warm start (1m 6s)
  [Failed] M2 an Invite Link opened on a cold start (1m 23s) (Assertion is false: "유지안님의 친구 초대" is visible)
  [Passed] M1 first run, then a relaunch to the map (48s)
  1/3 Flow Failed
  ```

  JUnit (`device-results/2026-10-23T004222-cf793ecd/report.xml`): `tests="3" failures="1" time="196.563"`; M1
  `SUCCESS` in 47.7 s, M2 warm `SUCCESS` in 66.1 s, M2 cold `ERROR` in 82.7 s, its 30 s wait for the accept screen run
  out on the map. The APK was built from the integration tip `74381a9b` with this ticket's scripts before their commit;
  the commit changed the build script only by writing its blanks as `''`, the same empty strings.

- `pnpm test:unit` (one slot, `--maxWorkers=4`): 48 suites, 282 tests: 281 passed, 1 todo. `jest --listTests` lists the
  147 files P09-05 counted, none under `maestro/` or `scripts/`: `pnpm test` is `jest` and runs neither new command.
  Full `pnpm test`: CI run 39808477203 at P11-03's merge, fd492a03, passed; every package's `pnpm test` is a job of
  the CI workflow.
- `pnpm lint` (`147 test file(s), each named by its test level.`), `pnpm format:check` (which checks the flows' YAML
  and the README) and `pnpm typecheck` pass. No file under `src/`, `__tests__/` or `.github/` changed.
- Seen in the screenshots, outside this ticket: on Onboarding the chosen department's name starts under the field's
  search icon.

### Agent usage (2026-10-23)

- Agent time: about 46 minutes, an estimate: the implementer subagent of this attempt (45 minutes, measured just
  before its last commit) and an earlier attempt in another workflow, stopped by the orchestrator after a minute,
  before it made a branch. About 15 minutes of it went to waiting for the APK build and the device runs.
- Tokens: input 44,034 thousand in all (cache reads 43,641 thousand, cache writes 392 thousand, uncached under 1
  thousand); output 11 thousand, a lower bound, since the transcript keeps only partial output counts.
