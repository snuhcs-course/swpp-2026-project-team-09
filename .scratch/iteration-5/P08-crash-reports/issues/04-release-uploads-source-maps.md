# 04: The Release workflow uploads source maps, so that a stack is readable

Parent: [P08 spec](../spec.md)
Status: done
Blocked by: 02

Native files: none. Releases: none by itself; the next Release uses it.

## What happens now

- The Release workflow's app job (`.github/workflows/release.yml`) builds the APK on a native change
  (`./gradlew assembleRelease`) and publishes the bundle with `eas-cli update --channel production`.
- Its environment holds the server addresses and the Google client ids from Actions variables, and
  `KAKAO_NATIVE_APP_KEY` and `EXPO_TOKEN` from secrets. Nothing of Sentry is there.
- A bundle is minified: a stack from it names `index.android.bundle` and a column.

## What to build

- The app job reads `EXPO_PUBLIC_SENTRY_DSN` from an Actions variable, and gives `SENTRY_AUTH_TOKEN` (a secret) and
  Sentry's organisation and project (variables) to the two steps that need them, and to no other step.
- The APK's build uploads its source map and native symbols through Sentry's Gradle and Metro plugins.
- After `eas update`, a step uploads that update's source maps with Sentry's script for Expo updates
  (`sentry-expo-upload-sourcemaps`; the package's name is checked against 8.36.0's guide).
- With no `SENTRY_AUTH_TOKEN` (a fork, or before ticket 06), both uploads are skipped with a notice and the job goes
  on. With the token, a failed upload after the update fails the job with a message saying that the update is out and
  how to run the upload again.
- The same for the UAT's and the Dev Server's builds is not wanted: they have no DSN.
- `.github/release/` and the infra README's "The Production APK" and the Release's steps say the above; the release
  script's tests cover whatever logic is added to it.

## Must not break

- A Release without the Sentry variables and secret publishes as it does now.
- The order of the app job: the APK before the bundle that only it takes, and the check that no newer commit's bundle
  is published.
- The token never reaches a log: it is passed by environment, never on a command line, and the steps do not echo
  their environment.

## Acceptance criteria

- [x] With the token absent, the job's steps skip the uploads and the job passes. (The release script's test, or a
      dry run described in the pull request.)
- [x] With the token present, the upload step runs after `eas update`, and its failure fails the job with the message
      above. (The release script's test.)
- [x] The workflow passes the token to the upload steps only. (Read from the diff; the pull request says so.)
- [x] The infra README says how to run the upload again by hand for an update.
- [x] CI's `release-script` job passes.
- [ ] After ticket 07's Release: a test error's stack in Sentry names a source file and line of ours. (Ticket 07
      checks it and writes the result here.)

## Comments

### Built (2026-11-24)

- **The DSN** comes from the variable `PRODUCTION_APP_SENTRY_DSN` into the app job's environment as
  `EXPO_PUBLIC_SENTRY_DSN`, beside the other `EXPO_PUBLIC_*` values, so it reaches the APK's bundle and `eas update`'s
  alike. It may be empty: it is not among `fingerprint-and-decide`'s required settings. It does not enter the
  fingerprint: `app.config.ts` reads only `INVITE_LINK_HOST`, `UPDATE_CHANNEL`, `ANDROID_X86_64` and
  `GOOGLE_IOS_URL_SCHEME`, and Sentry's config plugin only `SENTRY_ENVIRONMENT` (read in 8.36.0's `plugin/build`; not
  measured with `fingerprint:generate`, since this ticket installs nothing in `mobile/`).
- **The token, the organisation and the project** (`SENTRY_AUTH_TOKEN` secret, `SENTRY_ORG`, `SENTRY_PROJECT`
  variables) are in the env of two steps only, "Build the APK" and the new "Upload the update's source maps to Sentry",
  and are never on a command line.
- **The APK:** `release.sh sentry-upload` prints `upload` or `skip`; on `skip` (no token) the step exports
  `SENTRY_DISABLE_AUTO_UPLOAD=true` with a notice, which replaces ticket 02's stop-gap. With the token, Sentry's
  `sentry.gradle.kts` runs `sentry-cli react-native gradle --bundle … --sourcemap …`, reading the token from the
  environment.
- **The update:** eas-cli 26.0.0 with SDK 57 runs `expo export --output-dir dist --source-maps --dump-assetmap
--platform ios --platform android --clear` (read in eas-cli's `publish.js`: `--source-maps` defaults to `true`), so
  `mobile/dist` holds each Hermes bundle with its `.map`, and nothing has to change in the `eas update` call. The new
  step runs `release.sh upload-update-sourcemaps dist`, which checks that every bundle has its map (Sentry's script
  passes with only a warning when none has) and runs `sentry-expo-upload-sourcemaps dist` from `mobile/`
  (`@sentry/react-native` 8.36.0's bin, a wrapper over `@sentry/expo-upload-sourcemaps`, which runs
  `sentry-cli sourcemaps upload --debug-id-reference` for each bundle). Debug IDs, an MD5 of the bundle from the Metro
  plugin, tie a stack to its map; no release name is passed.
- **A failed upload after the update** fails the job with `::error::The update is published, but its source maps did
not reach Sentry…`, which says to re-run the job (its ordering check publishes the same bundle again, or skips if a
  newer one is out) or to upload by hand (infra README § Uploading an update's source maps by hand). With the token but
  without `SENTRY_ORG` or `SENTRY_PROJECT`, the upload step fails the same way, and the APK's build stops before
  building.
- **Different from the ticket:** "native symbols" are not uploaded. With the plain plugin, the Android build applies
  `sentry.gradle.kts`, which uploads the JavaScript bundle's map alone; the Sentry Android Gradle Plugin, which uploads
  ProGuard mappings and NDK symbols, is applied only with `experimental_android.enableAndroidGradlePlugin` in
  `app.json`, a native change outside this ticket. The release build is not minified by R8, so Java frames read as
  they are.
- **Not tested here:** the real uploads (no token, no Gradle, no `eas`). The first Release with the token should show,
  in "Build the APK", `Sentry-CLI arguments:` with the token masked and a successful upload, and in the new step
  `sentry: 2 bundles with their maps in dist` followed by Sentry's `✅ Uploaded bundles and sourcemaps`.
- **Checks run:** shellcheck and bats over `.github/release` and `.github/ci`, as CI's `release-script` job does (all
  pass, 5 new tests), and actionlint on `release.yml` with shellcheck (clean).

### Agent usage (2026-11-24)

- Agent time: about 1 hour in one implementation session, an estimate; about 10 minutes of it waited on the bats run.
  The orchestrator's time is not counted here.
- Tokens: 177,293 in all for the implementation session, as its usage reports; the split into input, cache reads, cache writes and output was not available.
