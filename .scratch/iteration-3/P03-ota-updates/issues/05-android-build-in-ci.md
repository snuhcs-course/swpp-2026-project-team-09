# 05: A native change builds and releases the Android APK in CI

Parent: [P03 spec](../spec.md) ("The Android build in CI")
Status: ready-for-agent
Blocked by: 02

## What to build

When a Release tag carries a native change with `version` raised, GitHub Actions builds the Android APK as the hand
build does and checks it: the fingerprint is embedded, and the signer is the shared debug key. It then attaches the
APK to the tag's GitHub Release, replaces `app-version.json`, and publishes the bundle. Phones on the older build then
see 업데이트가 필요합니다, and its 업데이트 하기 downloads the new APK.

A pull request whose native part changed without a raised `version` fails CI. That error is caught when the code is
written, not at release time.

## Acceptance criteria

- [x] On `publish-needs-build`, the `release app` job:
  - builds the APK with prebuild and `assembleRelease` (JDK 21, the runner's Android SDK, the repository variables,
    the secret `KAKAO_NATIVE_APP_KEY`);
  - checks that the embedded `assets/fingerprint` equals the computed Android fingerprint and that the signer is
    `fac61745…3b9c`;
  - attaches the APK to the pushed tag's Release, creating it if missing and replacing an asset of the same name;
  - replaces `app-version.json` (new `latest`, the old `minimum`, both fingerprints, the new APK URL, `ios: null`);
  - publishes the bundle last.

  When a step fails, nothing after it happens.
- [x] A pure `release.sh` function writes the new `app-version.json`, and `release.bats` tests it.
- [x] Only the `release app` job gets `contents: write`.
- [x] A CI job runs on every push and computes both fingerprints with the build settings. It runs the same decision
  against `app-version.json`:
  - fail when the native part changed and `version` did not;
  - pass with a notice when `version` was raised;
  - pass when nothing native changed.
- [x] `infra/production/README.md` describes the automatic Android build, what a person still does (iOS, by hand),
  and the new CI check. § The Production APK says the hand build is now only for when CI cannot build.
- [ ] Checked on a real native Release after ticket 04. That Release raises `version` to `1.0.1` and adds the
  fingerprint's comment stripping that was put off in #128. Its tag builds the APK in CI, and `app-version.json`
  changes. A 1.0.0 phone shows 업데이트가 필요합니다, installs the new APK over the old one, and takes updates
  again.

## Comments

### Agent usage (2026-10-28)

- **Agent time** (estimate): about 1.5 hours. That covers the building subagent (about 13 minutes, plus 2 minutes for each of two rounds of fixes), two reviews (about 2 minutes), and the spec, the setup and the PR. Time spent waiting for the person is not counted.
- **Tokens** (estimate):
  - Subagents: about 270,000, measured (building and fixes 136k, reviews 147k).
  - Main session: about 120,000 input and 25,000 output, not counting cache reads. Cache reads were about 5,000,000 and cache writes about 200,000. These are estimates from the number of turns.

### Status (2026-10-28)

- **Before the PR.** bats passed 26/26, and shellcheck and actionlint were clean. The new `app-fingerprint` CI job ran on GitHub and passed.
- **Dry runs** against the live `app-version.json`:
  - the decision was `publish`;
  - the writer printed valid JSON that keeps `minimum`;
  - `check-apk` passed on the released 1.0.0 APK, and failed on a wrong fingerprint.
- **Still open: the real build.** It happens with the 1.0.1 native Release after this merges.
