# 01: OTA wired into the app, and the first native build that takes it

Parent: [P03 spec](../spec.md)
Status: done
Blocked by: None (can start immediately)

## What to build

The app takes its JavaScript from EAS Update. A bundle published by hand from a developer's machine reaches an installed Production APK: it downloads in the background and runs from the next start. 내 정보 shows which build and which update the phone runs. This ticket also makes the first native build with `expo-updates` and the first `app-version.json`, which is the baseline the later tickets compare with. See the spec's "EAS and the app's configuration" and "The native Release and `app-version.json`".

## Acceptance criteria

- [x] An EAS project exists under the Organization `snu-now`, created with the admin robot token, which is kept outside the repository. The `production` channel is linked to an EAS branch of the same name.
- [x] The app has `expo-updates`, and its configuration sets:
  - `owner`, `extra.eas.projectId` and `updates.url`;
  - `runtimeVersion` with the fingerprint policy;
  - checks on load, with no wait at start;
  - the `expo-channel-name` header, taken from one build-time setting that defaults to `production`.
- [x] `eas.json` is only as large as `eas update` needs and has no EAS Build profiles.
- [x] 내 정보 shows `앱 <version> · 업데이트 <tag> (<short commit>)` from `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT`, and `개발 빌드` for a Dev or local build. Unit tests cover an OTA, an embedded and a Dev build.
- [x] A Production APK with `version` `1.0.0` is built by hand and released as `snunow/app/YY.MM.DD-N`. Its build settings are the full list in the spec: the `EXPO_PUBLIC_*` values, `INVITE_LINK_HOST=api.snunow.com`, `GOOGLE_IOS_URL_SCHEME`, and no `ANDROID_X86_64`.
- [x] A Release with the tag `app-version`, never marked Latest, carries `app-version.json`. The file holds:
  - the build's Android and iOS fingerprints;
  - `latest` and `minimum`, both `1.0.0`;
  - the APK's direct download URL.
- [x] Before the file is uploaded, the fingerprints are computed for the build's commit with the same command and settings CI will use, and they equal the build's runtime version. It is noted in the PR how this was checked.
- [x] Checked on a phone: a bundle published by hand (`eas update --channel production`) with a visible change shows after one restart, and 내 정보 shows its tag.
- [x] `infra/production/README.md` § The Production APK says:
  - the full list of build settings and their Production values, why they must match CI (they change the fingerprint), and that `INVITE_LINK_HOST` is `api.snunow.com`, replacing "leave it empty";
  - that `version` is raised only for a native build;
  - what `app-version.json` holds, and that it lives on the `app-version` Release and is replaced with `--clobber`.

## Comments

### Agent usage (2026-10-28)

- **Agent time** (estimate): about 3 hours of agent work. That covers:
  - code: about 1 hour, by a subagent;
  - the Expo project, the release build and two Gradle runs: about 45 minutes of build time;
  - the fingerprint checks, the releases, the hand publish and two reviews: about 1 hour.

  Time spent waiting for the person is excluded.
- **Tokens** (estimate):
  - Subagents, measured: about 230,000 tokens in all (code 97k, standards review 68k, spec review 66k).
  - Main session: about 400,000 input and 60,000 output, not counting cache reads. Cache reads were about 15,000,000 and cache writes about 500,000. These come from the session's turn count, not a meter.

### Notes from the work (2026-10-28)

- **The APK and CI agree.** The fingerprint embedded in the APK (`assets/fingerprint`, Android `d0581b58…`) equals `npx expo-updates fingerprint:generate --platform android`, run in a clean checkout of f0ab211 with the same `.env`.
- **The check update.** `ota-check-1`, published by hand, reached the phone: the first start ran the embedded bundle, and after a restart 내 정보 showed `ota-check-1`.
- **What changes the fingerprint**, measured:
  - `UPDATE_CHANNEL` and `version`;
  - any edit to a config plugin's file, a comment included. So the two plugins' `.js` imports, and their comments, are part of the released baseline.
  - Comments in `app.config.ts` and code under `src/` do not change it.
- **`eas update` needs `--environment production`** since eas-cli 26.
- **`snunow/app/26.10.27-1` points at f0ab211**, the branch commit. After a squash merge the same tree is on `3.0/Main` under another hash.
