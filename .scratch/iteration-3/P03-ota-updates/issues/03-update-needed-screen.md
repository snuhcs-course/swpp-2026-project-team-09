# 03: 업데이트가 필요합니다 when a newer native build exists

Parent: [P03 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

When a phone's native build is older than the latest native Release, the app says so every time it starts. The screen reads 업데이트가 필요합니다 and has two buttons. 업데이트 하기 downloads the latest APK on Android; on iOS the screen only asks the User to install the new version. 계속 사용하기 closes it. Below the Release's `minimum`, 계속 사용하기 is hidden. If the check fails, the app starts as usual. The screen is JavaScript only, so it reaches the ticket 01 APK as an OTA. See the spec's "The app".

## Acceptance criteria

- [ ] At start, the app fetches `releases/latest/download/app-version.json` with a short timeout, without blocking the first screen.
- [ ] A pure function maps `(installed, latest, minimum)` to `none`, `recommended` or `required`. Malformed or missing data gives `none`. Unit tests cover equal, newer and older versions, a missing `minimum`, malformed versions and a malformed file.
- [ ] `recommended`: the screen with 업데이트 하기 and 계속 사용하기, shown again at every start. `required`: the same screen without 계속 사용하기.
- [ ] 업데이트 하기 opens the platform's `download` URL. When the URL is `null` (iOS today), the screen shows the install-it-yourself text and no button.
- [ ] Offline, a timeout, an unreachable GitHub or a malformed file shows nothing and the app starts as usual.
- [ ] The screen follows the app's design rules. The wireframe is checked first for an existing update or notice screen.
- [ ] Checked on the ticket 01 APK:
  - the screen arrives through an OTA;
  - replacing `app-version.json` with a higher `latest` shows it;
  - 업데이트 하기 downloads the APK;
  - restoring the file hides the screen again.

  Screenshots go in the PR.
