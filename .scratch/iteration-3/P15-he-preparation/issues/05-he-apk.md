# 05: Build the HE APK

Parent: [P15 spec](../spec.md) ("The HE APK")
Status: done
Blocked by: 01, 02 (their app changes go into the APK)

## What to build

The APK the evaluators use, and a ZIP of it for eTL. It is the HE branch's app:

- it talks to swpp-a;
- it takes no over-the-air update;
- it opens to the account list.

The PM uploads the ZIP by 2026-11-03 23:59 and installs the APK.

## Acceptance criteria

- [x] **Build:** from an HE branch commit that holds 01 and 02, as the Dev APK guide builds, with JDK 17 and the shared debug keystore. It uses:
  - the HE server's address for both server URLs;
  - an empty `INVITE_LINK_HOST`;
  - `UPDATE_CHANNEL=he`.
- [x] **Tree:** the app's native files are untouched. What prebuild changes in the tree is restored, and nothing of the build is committed.
- [x] **Channel:** the built app's update channel reads `he`.
- [x] **Location:** the APK and its ZIP sit outside the repository, at a path given to the PM.
- [x] **Emulator check:** the APK installs and opens to the sign-in screen, and either Google button opens the account list.
- [x] **Record:** the ticket's Comments record the commit, the build settings without secret values and the APK's SHA-256.

## Comments

- **Built (2026-11-03), on `3.0/P15-he-05`.**
  - **Commit:** `4c3e129`, the HE branch with tickets 01 and 02 merged.
  - **Settings** (`mobile/.env`, not committed): `EXPO_PUBLIC_MAIN_SERVER_URL` and `EXPO_PUBLIC_SOCKET_SERVER_URL` both `http://swpp26t09.147-46-242-169.sslip.io`; `INVITE_LINK_HOST` empty; `UPDATE_CHANNEL=he`; `KAKAO_NATIVE_APP_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set from the team's keys; the iOS settings and `EXPO_PUBLIC_RELEASE_TAG`/`_COMMIT` empty, so 내 정보 shows 개발 빌드.
  - **Steps:** the Dev APK guide's, without the scp: `pnpm install --frozen-lockfile`, `expo prebuild --platform android`, `./gradlew assembleRelease`, with Homebrew's JDK 17.0.20.1, Node 24.14.0 and pnpm 12.6.0. The first Gradle run stopped on `OutOfMemoryError: Metaspace` in `expo-updates:kspReleaseKotlin` (the generated `gradle.properties` allows 512 MB). The second ran with `-Dorg.gradle.jvmargs="-Xmx4096m -XX:MaxMetaspaceSize=1536m"` on the command line and passed; no file was changed for it.
  - **Signing:** the template's debug key (`CN=Android Debug`, SHA-1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`, key hash `Xo8WBi6jzSxKDVR4drqm84yr9iU=`).
  - **Tree:** prebuild reported `package.json | no changes`, and `git status` showed nothing after the build.
  - **APK:** `/Users/taehyun/Downloads/snu-now-he/snu-now-he-4c3e129.apk`, 94,354,707 bytes, SHA-256 `39f346c6ef659fb65dc82d7dceaba5deee0c96e566b196636919d4c98182fbd3`. `com.bonnieandclaude.snunow` 1.0.1, `arm64-v8a` only.
  - **ZIP:** `/Users/taehyun/Downloads/snu-now-he/snu-now-he-4c3e129.zip`, holding only the APK, 53,206,262 bytes, SHA-256 `8e800b2e50feb07e0c2718b4a23d61f7d7dfcd426f0eba30982d03d4af6fb3b8`.
  - **Checks in the APK:** the manifest's `expo-channel-name` and `assets/app.config`'s `updates.requestHeaders` both read `he`. The JS bundle holds swpp-a's address and not the Dev Server's. The Google web client ID is in the bundle and the Kakao key in the manifest, compared without printing them.
  - **Emulator check:** on `Medium_Phone` (API 36, arm64), `adb install -r` replaced the 1.0.0 install of 2026-10-23. The app opened to the sign-in screen. Both the logo button and 다른 서울대 계정으로 로그인 opened 계정 고르기 with the seven rows (1라운드 · 김하늘, 1라운드 · 최유나, 2라운드 · 한지우, 2라운드 · 정민재, 예비 · 이도현, 예비 · 박서진, 예비 · 오세린). Back closed it onto the sign-in screen. expo-updates logged `No update available` at launch. No account was picked, since the HE server is not deployed yet.

- **Rebuilt (2026-11-03), on `3.0/P15-he-05`.**
  - **Why:** the code review found that a Session ended from another phone kept the consent and the location explanation. `bfbf85b` on `3.0/P15-he` fixes it in `mobile/src/session/session-events.ts`; the `4c3e129` APK lacks it.
  - **Commit:** `bfbf85b`. `git merge 3.0/P15-he` fast-forwarded the branch to it (`git merge-base --is-ancestor bfbf85b HEAD` holds). Since `4c3e129` only `session-events.ts` and a test changed under `mobile/`; no native file did.
  - **Settings:** `mobile/.env` unchanged: `EXPO_PUBLIC_MAIN_SERVER_URL`, `EXPO_PUBLIC_SOCKET_SERVER_URL`, `INVITE_LINK_HOST`, `UPDATE_CHANNEL`, `KAKAO_NATIVE_APP_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, with the iOS settings and `EXPO_PUBLIC_RELEASE_TAG`/`_COMMIT` empty.
  - **Steps:** as before, with the same JDK 17, Node 24.14.0 and pnpm 12.6.0. `pnpm install --frozen-lockfile` had nothing to do. `expo prebuild --platform android`, run with `CI=1`, cleared `mobile/android` and wrote it again (`package.json | no changes`). `./gradlew assembleRelease` with the extra Metaspace on the command line passed on the first run, in 6 min 43 s.
  - **Signing:** the template's debug key, SHA-1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625` as before.
  - **Tree:** `git status` showed nothing after prebuild and after the build.
  - **APK:** `/Users/taehyun/Downloads/snu-now-he/snu-now-he-bfbf85b.apk`, 94,354,707 bytes, SHA-256 `81953685f94985e3eb0fd6f744cefa342a2df7ce57302a0478fbd3f807908363`. `com.bonnieandclaude.snunow` 1.0.1, `arm64-v8a` only.
  - **ZIP:** `/Users/taehyun/Downloads/snu-now-he/snu-now-he-bfbf85b.zip`, holding only the APK, 53,206,250 bytes, SHA-256 `a154cd327713f6be583e6f9711366d3359c3b28075cf66a285f9336e663ad671`. It replaces the `4c3e129` ZIP for eTL. The `4c3e129` files were no longer in `/Users/taehyun/Downloads/snu-now-he/` (the folder was gone) when this one was built.
  - **Checks in the APK:** the manifest's `expo-channel-name` and `assets/app.config`'s `updates.requestHeaders` both read `he`. The JS bundle holds swpp-a's address once and neither the Dev Server's nor `api.snunow.com`; its only other host is expo-router's `localhost:8081` default.
  - **Emulator check:** on `Medium_Phone`, the app installed was the 1.0.0 of 2026-10-23 again, since the earlier install was not kept in the emulator's snapshot. `adb install -r` replaced it with this APK. The app opened to the sign-in screen, and the logo button opened 계정 고르기 with the seven rows; Back closed it onto the sign-in screen. No account was picked. At launch expo-updates ended in `CheckError` and ran the embedded bundle: EAS Update answers the `he` channel with 404, "There is no channel named he", so no update reaches this APK until that channel is created.
