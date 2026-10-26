# P03: OTA updates, the app's JavaScript delivered without a new install

Status: ready-for-agent

## Problem Statement

Every change to the app reaches a phone only as a new APK. Someone builds it by hand (`expo prebuild` and Gradle, about 25 minutes), attaches it to a GitHub Release (`snunow/app/YY.MM.DD-N`, `infra/production/README.md` § The Production APK), and every tester downloads and installs it again. The servers already go out from a tag: `snunow/<target>/YY.MM.DD-N` runs `release.yml`, which waits for CI, builds the images, deploys them to EKS and waits for the rollout. The app is the only part left out (`release.yml` excludes `snunow/app/**`).

Most changes to the app are JavaScript: screens, logic, words, images. The team is still debugging on Production before launch, so these changes are frequent. An installed app has no way to learn that there is a newer build, and no screen shows which build or which code it is running.

## Solution

The app gets `expo-updates` and takes its JavaScript, with the images it imports, from **EAS Update**, Expo's update service. A release tag publishes the tagged commit's bundle for Android and iOS. An installed app checks for a new bundle when it starts, downloads it in the background, and runs it from the next start.

A bundle goes only to apps whose native part matches it. The runtime version is the app's **fingerprint**, a hash of the native dependencies and configuration that `expo-updates` computes. When the native part changes, no OTA can reach the installed apps. A new APK and iOS build are needed. Two things handle that case:

- The Release workflow notices a native change and makes sure `version` was raised. It then reports that a new build is needed.
- An installed app reads `app-version.json`, which describes the latest native build. If a newer native build exists, it shows **업데이트가 필요합니다** with **업데이트 하기** and **계속 사용하기**.

The 내 정보 screen shows the app's version and the update it runs, so anyone can tell what a phone has.

Words:
- a **bundle** (or update) is the app's JavaScript and assets published to EAS for one runtime version;
- the **native build** is an installed APK or iOS app;
- **`version`** is the native build's version in `app.json`;
- the **fingerprint** is the runtime version computed from the native part.

## User Stories

### Releasing

1. As a developer, I want a pushed `snunow/all/…` tag to publish the app's bundle after every server has been deployed and rolled out, so that a new bundle never calls a server that is not there yet.
2. As a developer, I want a pushed `snunow/app/…` tag to publish only the app's bundle, so that an app-only change needs no server Release.
3. As a developer, I want the bundle published only once CI has passed on the tagged commit, as the servers are, so that a red commit never reaches phones.
4. As a developer, I want a JavaScript-only change to need no build, no GitHub Release and no version change, so that shipping it takes minutes, not half an hour.
5. As a developer, I want bundles for Android and iOS from the same tag, so that both platforms run the same code.
6. As a developer, I want to roll back by running the Release workflow again on an earlier tag, as the servers are rolled back, so that there is one way to undo a Release.

### Native changes

7. As a developer, I want the workflow to fail when the native part changed since the latest native build but `version` did not, so that nobody forgets to raise it.
8. As a developer, I want the workflow to say "a new APK and iOS build are needed" when the native part changed and `version` was raised, so that the native Release is not forgotten either.
9. As a developer, I want the installed app never to receive a bundle built for a different native part, so that an OTA can never crash it.

### On the phone

10. As a User, I want the app to update itself quietly and apply the update the next time I open it, so that a screen never restarts while I use it.
11. As a User whose native build is older than the latest one, I want 업데이트가 필요합니다 with 업데이트 하기 and 계속 사용하기 each time I open the app, so that I learn about the new build and can still go on.
12. As a User on Android, I want 업데이트 하기 to download the latest APK directly, so that installing it takes as few steps as possible.
13. As a User on iOS, I want the same screen to tell me to install the new version, until the team has a way to distribute iOS builds.
14. As a team, I want to be able to hide 계속 사용하기 later for builds below a minimum version, without a new build, so that a build that no longer works can be stopped.
15. As a User, I want the app to start normally when it cannot check for updates (offline, GitHub or EAS unreachable), so that the update check never blocks the app.
16. As a tester, I want 내 정보 to show the version, the update's tag and its commit, so that I can say exactly what I am running when I report a problem.

## Implementation Decisions

### EAS and the app's configuration

- **Expo account and tokens.**
  - Account: the Expo Organization `snu-now`, managed by 안진영.
  - The project is created once with `eas init`, using the Organization's admin robot token, which is kept outside the repository.
  - CI uses the Organization's developer robot token as the repository secret `EXPO_TOKEN`. That token can publish updates but cannot change the account.
- **`app.json` / `app.config.ts`:**
  - `owner: "snu-now"`, plus `extra.eas.projectId`.
  - `runtimeVersion: { policy: "fingerprint" }`.
  - `updates.url: https://u.expo.dev/<projectId>`.
  - `updates.checkAutomatically: "ON_LOAD"` and `updates.fallbackToCacheTimeout: 0`: the app starts on what it has, downloads in the background, and applies the update at the next start.
  - The update channel is sent as the `expo-channel-name` request header. It is set in one place in `app.config.ts`: a build-time setting that defaults to `production`. A later Dev channel only needs another value there and its own publish step.
- **One channel, `production`,** linked to an EAS branch of the same name. The Dev APK gets no OTA in this task.
- **`eas.json`:** as small as `eas-cli` needs for `eas update`. No EAS Build profiles: native builds stay hand-made.
- **Every setting must match the native build.** This covers two kinds of setting, and they matter for different reasons.
  - `EXPO_PUBLIC_*` values are baked into the JavaScript. These are Production's main and socket server URLs (`https://api.snunow.com`) and the Google web and iOS client IDs.
  - The settings `app.config.ts` reads from the environment change the evaluated app configuration, and with it the **fingerprint**. These are `INVITE_LINK_HOST` (Production: `api.snunow.com`, the value the deployed APK was built with) and `GOOGLE_IOS_URL_SCHEME`. `ANDROID_X86_64` is never set for a Production build or a publish.

  Measured on `2.0/Main` with `@expo/fingerprint`, each of `INVITE_LINK_HOST`, `GOOGLE_IOS_URL_SCHEME` and `ANDROID_X86_64` changes the fingerprint. `KAKAO_NATIVE_APP_KEY`, which the map's plugin writes only at prebuild, and the `EXPO_PUBLIC_*` values do not. If CI computed the fingerprint without the build's settings, every JavaScript-only tag would either fail the version check or publish a bundle that no installed app takes.

  - In CI, all of these come from repository variables, and the app job sets every one of them.
  - The hand build's steps in `infra/production/README.md` list the same names and values.

### Publishing from the Release workflow

- **`release.sh check-name`:**
  - `app` becomes a target.
  - `all` means the five servers and the app.
  - Its output gains an `app` flag beside `servers`.
- **`release.yml`:**
  - No longer excludes `snunow/app/**`.
  - A new `app` job runs when the flag is set. For `all` it waits for every server job to succeed. If any server job fails, the app job does not run. Server jobs already wait for `kubectl rollout status`.
  - For an `app` tag, it runs alone.
  - The app job passes the same CI gate as the servers (`release.sh gate`) and uses its own concurrency group, so a newer Release cancels an older one.
- **The app job's steps:**
  1. Install the app's dependencies (pnpm, as CI does).
  2. Compute the Android and iOS fingerprints with `expo-updates`' own fingerprint command, under the build's settings (above). This is the same value as the runtime version.
  3. Read `app-version.json` from its fixed Release (below).
  4. Decide. The decision is a pure `release.sh` function, tested in `release.bats`.
     - Both fingerprints equal the file's → publish.
     - A fingerprint differs and `version` equals the file's `latest` → fail, with a message saying to raise `version` and make a native Release.
     - A fingerprint differs and `version` is higher → publish, and write a notice in the job summary that a new APK and iOS build are needed.
     - The file is missing or unreadable → fail. Ticket 01 uploads the first file by hand, so the workflow never needs a "no baseline" case.
  5. `eas update --channel production --platform all --non-interactive`. The message is the tag name, and the tag and commit are passed in as `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT`.
- **Rollback:** run the Release workflow by hand on an earlier tag. That publishes the earlier commit's bundle again as the newest update.

### The native Release and `app-version.json`

- A native Release stays hand-made, as today, under `snunow/app/YY.MM.DD-N`, with its APK.
- **`app-version.json` lives on a Release of its own**, the tag `app-version`. The app and the workflow read it from `https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/app-version/app-version.json`.
  - The address is fixed, so it does not depend on which Release is marked Latest. GitHub marks the newest Release Latest by default, and the repository already has others (`production-…`, `dev-…`). Any new Release would otherwise move `releases/latest`.
  - The tag sits outside `snunow/`, so it never starts the Release workflow.
  - The `app-version` Release is never marked Latest. A native Release replaces its file with `gh release upload app-version app-version.json --clobber`.
  - Reading it is a plain download, not a GitHub API call, so it has no rate limit. The repository is public.
- `app-version.json`:

  ```json
  {
    "latest": "1.0.0",
    "minimum": "1.0.0",
    "fingerprint": { "android": "<hash>", "ios": "<hash>" },
    "download": { "android": "https://github.com/…/releases/download/snunow/app/26.10.27-1/snunow-app-26.10.27-1.apk", "ios": null }
  }
  ```

  - `latest` is the Release's `version`.
  - `minimum` is the lowest version allowed to go on. To stop old builds, replace the file (`--clobber`); no build or deploy is needed.
  - `fingerprint` is the build's runtime versions.
  - `download.ios` stays `null` until iOS builds are distributed.
- **`version` changes only with a native build.** A JavaScript-only Release keeps it. The first native build with `expo-updates` keeps `1.0.0` as a one-time exception, because the currently installed `1.0.0` APK has no update check that a higher number could trigger. That build's fingerprints go into the first `app-version.json`, which is the workflow's baseline. Before the file is uploaded, the fingerprint CI computes for that commit is checked against the build's.

### The app

- **The update check** runs once at start, with a short timeout, and never blocks the first screen. It fetches `app-version.json` and compares it with the installed `version`, using a pure function `(installed, latest, minimum) → none | recommended | required`:
  - installed ≥ `latest`: nothing.
  - `minimum` ≤ installed < `latest`: 업데이트가 필요합니다 with 업데이트 하기 and 계속 사용하기. It is shown again at every start.
  - installed < `minimum`: the same screen without 계속 사용하기.
  - Any failure (offline, timeout, a malformed file): nothing.
- **업데이트 하기** opens the platform's `download` URL. On Android this downloads the APK. On iOS, where the URL is `null`, the screen only asks the User to install the new version.
- **The screen's design** follows the app's design rules and the wireframe. Check the wireframe for an existing update or notice screen first.
- **내 정보** shows, in small text at the bottom: `앱 <version> · 업데이트 <tag> (<short commit>)`. A build running its embedded bundle shows the tag and commit of the commit it was built from. A Dev or local build shows `개발 빌드`.
- **iOS is built by the Mac owner** with Xcode, as a Production build including `expo-updates`, from the steps this task writes. A free Apple account's 7-day limit does not matter for the check.

### Documentation

- `infra/production/README.md`:
  - § The Production APK gains:
    - `app-version.json` and its `app-version` Release;
    - when to raise `version`;
    - the full list of build settings (the `EXPO_PUBLIC_*` values, `INVITE_LINK_HOST`, `GOOGLE_IOS_URL_SCHEME`, and no `ANDROID_X86_64`). `INVITE_LINK_HOST` is `api.snunow.com`, replacing the old "leave it empty";
    - the iOS build steps for the Mac owner.
  - The Release section gains the `app` target and rollback.
- The root `README.md` mentions that the app updates itself.

## Testing Decisions

- **Unit tests** (`*.unit.test.ts`):
  - the update decision `(installed, latest, minimum)`: equal, newer and older versions, a missing `minimum`, and malformed versions → nothing;
  - the parsing of `app-version.json`;
  - the 내 정보 version line for an OTA, an embedded and a Dev build.
- **`release.bats`:**
  - `check-name` with `app` and `all`;
  - the publish decision for each of its four cases, including failing on a missing or unreadable file.
- **The workflow's first runs** are checked by hand on a real tag: one JavaScript-only change, published and received.
- **On a phone, Android and iOS each:**
  1. Install the new native build.
  2. Push a tag with a visible JavaScript change.
  3. See it after one restart, and see 내 정보 show the new tag.
  4. Replace `app-version.json` with a higher `latest` and see 업데이트가 필요합니다. 업데이트 하기 opens the APK on Android.

  Screenshots go in the PR.

## Out of Scope

- Building APKs or iOS apps in CI (EAS Build, Gradle in Actions); native Releases stay hand-made.
- A Dev channel and OTA for the Dev APK (the configuration is ready for it).
- Distributing iOS builds (TestFlight, App Store).
- Installing an APK from inside the app without the browser, or silently.
- Self-hosting the update server; EAS can be swapped for one later by changing `updates.url`.
- Code signing of updates.

## Further Notes

- The robot tokens were shared in a chat while this spec was written. They should be regenerated once setup is done, and the new ones kept only in the local env file and the `EXPO_TOKEN` secret.
- The iOS fingerprint is computed on Linux in CI and the iOS build is made on a Mac. With Continuous Native Generation (no `ios/` in the repository), the two are expected to match. The first native Release checks this. If they differ, the fix is to record the fingerprint from the Mac build.
- EAS Update's free plan is expected to cover the team's use. Its current limits are checked when the project is created.
