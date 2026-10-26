# 01: OTA wired into the app, and the first native build that takes it

Parent: [P03 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app takes its JavaScript from EAS Update. A bundle published by hand from a developer's machine reaches an installed Production APK: it downloads in the background and runs from the next start. 내 정보 shows which build and which update the phone runs. This ticket also makes the first native build with `expo-updates` and the first `app-version.json`, which is the baseline the later tickets compare with. See the spec's "EAS and the app's configuration" and "The native Release and `app-version.json`".

## Acceptance criteria

- [ ] An EAS project exists under the Organization `snu-now`, created with the admin robot token, which is kept outside the repository. The `production` channel is linked to an EAS branch of the same name.
- [ ] The app has `expo-updates`, and its configuration sets:
  - `owner`, `extra.eas.projectId` and `updates.url`;
  - `runtimeVersion` with the fingerprint policy;
  - checks on load, with no wait at start;
  - the `expo-channel-name` header, taken from one build-time setting that defaults to `production`.
- [ ] `eas.json` is only as large as `eas update` needs and has no EAS Build profiles.
- [ ] 내 정보 shows `앱 <version> · 업데이트 <tag> (<short commit>)` from `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT`, and `개발 빌드` for a Dev or local build. Unit tests cover an OTA, an embedded and a Dev build.
- [ ] A Production APK with `version` `1.0.0` is built by hand and released as `snunow/app/YY.MM.DD-N`. Its build settings are the full list in the spec: the `EXPO_PUBLIC_*` values, `INVITE_LINK_HOST=api.snunow.com`, `GOOGLE_IOS_URL_SCHEME`, and no `ANDROID_X86_64`.
- [ ] A Release with the tag `app-version`, never marked Latest, carries `app-version.json`. The file holds:
  - the build's Android and iOS fingerprints;
  - `latest` and `minimum`, both `1.0.0`;
  - the APK's direct download URL.
- [ ] Before the file is uploaded, the fingerprints are computed for the build's commit with the same command and settings CI will use, and they equal the build's runtime version. It is noted in the PR how this was checked.
- [ ] Checked on a phone: a bundle published by hand (`eas update --channel production`) with a visible change shows after one restart, and 내 정보 shows its tag.
- [ ] `infra/production/README.md` § The Production APK says:
  - the full list of build settings and their Production values, why they must match CI (they change the fingerprint), and that `INVITE_LINK_HOST` is `api.snunow.com`, replacing "leave it empty";
  - that `version` is raised only for a native build;
  - what `app-version.json` holds, and that it lives on the `app-version` Release and is replaced with `--clobber`.
