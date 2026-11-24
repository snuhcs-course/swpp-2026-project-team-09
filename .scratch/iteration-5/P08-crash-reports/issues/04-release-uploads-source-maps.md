# 04: The Release workflow uploads source maps, so that a stack is readable

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
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

- [ ] With the token absent, the job's steps skip the uploads and the job passes. (The release script's test, or a
      dry run described in the pull request.)
- [ ] With the token present, the upload step runs after `eas update`, and its failure fails the job with the message
      above. (The release script's test.)
- [ ] The workflow passes the token to the upload steps only. (Read from the diff; the pull request says so.)
- [ ] The infra README says how to run the upload again by hand for an update.
- [ ] CI's `release-script` job passes.
- [ ] After ticket 07's Release: a test error's stack in Sentry names a source file and line of ours. (Ticket 07
      checks it and writes the result here.)

## Comments
