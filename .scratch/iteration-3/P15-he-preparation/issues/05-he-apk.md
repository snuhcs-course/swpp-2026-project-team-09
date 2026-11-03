# 05: Build the HE APK

Parent: [P15 spec](../spec.md) ("The HE APK")
Status: ready-for-agent
Blocked by: 01, 02 (their app changes go into the APK)

## What to build

The APK the evaluators use, and a ZIP of it for eTL. It is the HE branch's app:

- it talks to swpp-a;
- it takes no over-the-air update;
- it opens to the account list.

The PM uploads the ZIP by 2026-11-03 23:59 and installs the APK.

## Acceptance criteria

- [ ] **Build:** from an HE branch commit that holds 01 and 02, as the Dev APK guide builds, with JDK 17 and the shared debug keystore. It uses:
  - the HE server's address for both server URLs;
  - an empty `INVITE_LINK_HOST`;
  - `UPDATE_CHANNEL=he`.
- [ ] **Tree:** the app's native files are untouched. What prebuild changes in the tree is restored, and nothing of the build is committed.
- [ ] **Channel:** the built app's update channel reads `he`.
- [ ] **Location:** the APK and its ZIP sit outside the repository, at a path given to the PM.
- [ ] **Emulator check:** the APK installs and opens to the sign-in screen, and either Google button opens the account list.
- [ ] **Record:** the ticket's Comments record the commit, the build settings without secret values and the APK's SHA-256.
