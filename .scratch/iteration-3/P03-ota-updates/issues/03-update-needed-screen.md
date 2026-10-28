# 03: 업데이트가 필요합니다 when a newer native build exists

Parent: [P03 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

When a phone's native build is older than the latest native build, the app says so every time it starts. The screen reads 업데이트가 필요합니다 and has two buttons. 업데이트 하기 downloads the latest APK on Android; on iOS the screen only asks the User to install the new version. 계속 사용하기 closes it. Below the file's `minimum`, 계속 사용하기 is hidden. If the check fails, the app starts as usual. The screen is JavaScript only, so it reaches the ticket 01 APK as an OTA. See the spec's "The app".

## Acceptance criteria

- [x] At start, the app fetches `app-version.json` from the `app-version` Release (`releases/download/app-version/app-version.json`) with a short timeout, without blocking the first screen.
- [x] A pure function maps `(installed, latest, minimum)` to `none`, `recommended` or `required`. Malformed or missing data gives `none`. Unit tests cover equal, newer and older versions, a missing `minimum`, malformed versions and a malformed file.
- [x] `recommended`: the screen with 업데이트 하기 and 계속 사용하기, shown again at every start. `required`: the same screen without 계속 사용하기.
- [x] 업데이트 하기 opens the platform's `download` URL. When the URL is `null` (iOS today), the screen shows the install-it-yourself text and no button.
- [x] Offline, a timeout, an unreachable GitHub or a malformed file shows nothing and the app starts as usual.
- [x] The screen follows the app's design rules. The wireframe is checked first for an existing update or notice screen.
- [ ] Checked on the ticket 01 APK:
  - the screen arrives through an OTA;
  - replacing `app-version.json` with a higher `latest` shows it;
  - 업데이트 하기 downloads the APK;
  - restoring the file hides the screen again.

  Screenshots go in the PR.

## Comments

### Agent usage (2026-10-28)

- **Agent time** (estimate): about 2 hours. The building subagent took about 35 minutes of work plus two full test runs of about 40 minutes each. The two reviews took about 2 minutes. Fixes and the PR took about 20 minutes. Time spent waiting for the person is not counted.
- **Tokens** (estimate):
  - Subagents, measured: building and fixes about 130,000, reviews about 130,000.
  - Main session: about 80,000 input and 15,000 output, not counting cache reads. Cache reads were about 3,000,000 and cache writes about 100,000. These are estimates from the number of turns.

### Notes (2026-10-28)

- **Device check.** The check on the ticket 01 APK happens after merge. Code that has not been reviewed is never published to `production`. To see the screen, publish the merged code with a Release tag. Then replace `app-version.json` with `"latest": "1.0.1"`, check the screen, and put the file back with `"latest": "1.0.0"`. The screenshots go in a PR comment.
- **Installed version.** It comes from `Constants.expoConfig.version`. That is right because `version` is part of the fingerprint: changing 1.0.0 to 1.1.0 changes `d0581b58…` to `5d2e4656…`, measured. So a bundle with another `version` never reaches an older build.
- **Two dialogs at once.** If the session's "다른 기기에서 로그인했어요" dialog and this one open together, the one opened later sits on top. Making the session's dialog win would need a change to the Session context, which was left out.
