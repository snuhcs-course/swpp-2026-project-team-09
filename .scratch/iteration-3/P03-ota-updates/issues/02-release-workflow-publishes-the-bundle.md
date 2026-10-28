# 02: A Release tag publishes the app's bundle

Parent: [P03 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

Pushing `snunow/all/…` deploys the five servers and then, once every server has rolled out, publishes the app's bundle for Android and iOS to the `production` channel. Pushing `snunow/app/…` publishes only the bundle. The publish waits for CI on the commit, as the servers do. It refuses to go out when the native part changed but `version` did not. When the native part changed and `version` was raised, it says that a new build is needed. Running the workflow again on an earlier tag rolls the app back. See the spec's "Publishing from the Release workflow".

## Acceptance criteria

- [x] `release.sh check-name` accepts `app`, treats `all` as the five servers plus the app, and prints an `app` flag beside `servers`. `release.bats` covers this.
- [x] `release.yml` no longer excludes `snunow/app/**`.
- [x] An `app` job runs when the flag is set:
  - for `all`, only after every server job succeeded;
  - for `app`, alone;
  - after the same CI gate as the servers;
  - in its own concurrency group.
- [x] The job sets every build setting from repository variables (the `EXPO_PUBLIC_*` values, `INVITE_LINK_HOST`, `GOOGLE_IOS_URL_SCHEME`; never `ANDROID_X86_64`). It computes the Android and iOS fingerprints with `expo-updates`' fingerprint command and reads `app-version.json` from the `app-version` Release. A pure `release.sh` function decides, and `release.bats` tests each case:
  - publish when the fingerprints match;
  - fail, saying to raise `version` and make a native Release, when a fingerprint differs and `version` is unchanged;
  - publish with a "new APK and iOS build needed" notice in the job summary when both changed;
  - fail when the file is missing or unreadable.
- [x] `eas update --channel production --platform all --non-interactive` publishes with the tag as its message, and `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT` set.
- [ ] The repository secret `EXPO_TOKEN` (the developer robot token) and the variables for every build setting are set. The workflow reads these settings only from them.
- [ ] Checked on a real tag: a JavaScript-only change pushed as `snunow/app/…` reaches the ticket 01 APK after one restart. Running the workflow again on the previous tag brings the previous code back.
- [x] `infra/production/README.md`'s Release section describes the `app` target, the ordering after the servers, the fingerprint check and rollback.
