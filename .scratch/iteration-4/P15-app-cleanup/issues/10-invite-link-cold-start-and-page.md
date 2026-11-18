# 10: An Invite Link reaches its accept screen from a stopped app and from a browser

Parent: [P15 spec](../spec.md), item 10; the cold start was found by P11-03's device run on 2026-10-23 and is the ticket [`fix-invite-link-cold-start`](../../../iteration-2/fix-invite-link-cold-start/issues/01-invite-link-on-a-cold-start.md), which this ticket takes over; the browser's answer was read on Production on 2026-11-18; no board on the team canvas, since no screen of the app changes and the page's words are in this ticket (decided by 김태현 on 2026-11-18)
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none
Release: the page needs a Release of the main server, and the app's part ships over the air. No native file changes and no database migration. Merging, tagging and releasing are 김태현's and are not part of this ticket

## What happens now

- **Sending works.** 친구 추가's "초대 링크 보내기" makes an Invite Link, `https://api.snunow.com/invite/<token>`, and opens the share sheet. The link lasts 24 hours and is used once.
- **Android, the app running:** the link opens the app at the accept screen, "…님의 친구 초대", with 수락 and 거절.
- **Android, the app stopped:** the link starts the app, the loading screen passes, and the map shows. The accept screen never shows, and the token is not kept, so a relaunch shows the map too. P11-03's device run showed this each time.
- **A User who is signed out** when the link starts the app goes the same way through the code. This was not run.
- **In a browser** the link's address answers 404 with the server's JSON, `Cannot GET /invite/…`. That is what these people see:
  - someone whose messenger opens links in its own browser;
  - someone on an iPhone, whose build declares no link that opens the app;
  - someone without the app.
- `mobile/README.md` says the main server has a page there that opens `snunow://invite/<token>`. It does not.

## The cold start's cause

Read on 2026-10-24 with a Jest model of the start, not on a device. It is to be confirmed in the code, not reproduced on a device first (decided by 김태현 on 2026-11-18).

- On Android the router gets the address the app was started with as a promise, later than its first render. On iOS and in the existing Jest tests it has it at once, which is why those pass.
- So the signed-in place's guard, which keeps an Invite Link's token before it leads a User away, renders first with no address. It sees no Invite Link and keeps nothing.
- The guard then leads to the start of the app, and the address is gone.
- The earlier ticket guessed at a 150 ms race in the router. The model showed the same symptom whether that race is won or lost.
- A fix that passed the model: the router's own hook for an address the system starts the app with keeps the token on the phone before the router starts, and gives the address back unchanged. The guard's other half, which opens the accept screen of a kept token once the User is in the signed-in place, then shows it. Giving back another address from that hook did not work in the model. The implementation checks this against the installed router's code and may fix it another way if the code says otherwise; it says so under Comments.

## What changes

**In the app**

- A stopped app started by an Invite Link shows the link's accept screen after the loading screen, for a signed-in User.
- For a User who is signed out, or who has not finished the consent or Onboarding, the accept screen shows once they have.
- This holds for both forms of the link: the https address, which Android opens through App Links, and `snunow://invite/<token>`.

**On the main server**

- `GET /invite/<token>` answers a page, without a sign-in, in place of the 404.
- The page shows the app's wordmark, the title "SNU Now 친구 초대", one button "SNU Now에서 열기", and under it the line "앱이 설치돼 있어야 열려요."
- The button opens `snunow://invite/<token>`. The page does not try to open the app by itself: a browser often blocks that without a press.
- The page does not look the token up. It shows no sender and no status; the app's accept screen does. A token nobody made, a used one and an expired one get the same page.
- The token goes into the page only when it has an Invite Link token's form. For any other, the page says "찾을 수 없는 초대 링크예요" and has no button.
- The page has no link to an APK.
- The page loads nothing from another host, reads well on a phone's width, and asks search engines not to index it.

## What stays as it is

- Making a link, its 24 hours and its one use; the accept screen and its words; the link opened while the app runs.
- Android's App Links: the build's declaration and the server's `assetlinks.json`. A phone that verified the link still opens the app at once, without the page.
- The API's `/invite-links` routes, which still need a sign-in.
- iOS gets no link that opens the app directly. That needs the Associated Domains entitlement, which the free team that signs the iOS build cannot sign. An iPhone goes through the page's button. No iOS build is made or checked for this ticket.
- A tapped push, which is opened by the same place of the app after the same wait.

## Acceptance criteria

- [x] A signed-in User's stopped app, started by an Invite Link, shows that link's accept screen after the loading screen, and 수락 makes the two Friends.
- [x] A signed-out User's stopped app, started by an Invite Link, shows the accept screen after the sign-in, and after the consent and Onboarding where they are still owed.
- [x] The kept token is dropped once its accept screen has shown: a later plain start of the app shows the map.
- [x] A link opened while the app runs, and a tapped push at a cold start, do what they do today.
- [x] `GET /invite/<token>` with a well-formed token, without a sign-in, answers 200 with a page that has the words above and a button to `snunow://invite/<token>`.
- [x] With a token of any other form it answers a page with "찾을 수 없는 초대 링크예요" and no button, and nothing of the address appears in the page unescaped.
- [x] The page is the same for a token nobody made, a used one and an expired one, and names no sender.
- [x] `/.well-known/assetlinks.json` and the `/invite-links` routes answer as before.
- [x] Tests, by ADR 0007:
  - a test of the app that takes Android's way of getting the first address fails before the fix and passes after it, for a signed-in and for a signed-out start;
  - the main server's integration test asks for the page with a well-formed token, a malformed one, and one that tries to carry markup;
  - the existing tests of Invite Links and of a tapped push still pass.
- [x] After the fix, the device run's M2 on a cold start passes on the emulator, and M1 and M2 on a warm start still pass. This is the check on a device; the bug is not reproduced on one before the fix. The run is recorded under this ticket's Comments.
- [x] `mobile/README.md` no longer says that M2 on a cold start fails, and what it and the main server's README say of the page is true of the code.
- [x] The earlier ticket gets a comment that says this ticket fixed it, with the cause as it was confirmed.

## Comments

### Notes from the implementation (2026-11-18)

- **The cause, confirmed in the installed expo-router 57.0.23** (`mobile/node_modules/expo-router/build/`), as the Jest
  model of 2026-10-24 had it:
  - `link/linking.js`'s `getInitialURL()` answers a promise on Android: React Native's `Linking.getInitialURL()` raced
    against 150 ms (`fork/useLinking.native.js`). On iOS it answers expo-linking's `getLinkingURL()` at once.
  - `global-state/useStore.js` prefetches the first route's info only when that answer is a string. Otherwise the
    store's route info stays empty until a leaf screen sets it (`useScreens.js`) or a state change does, and React
    Navigation does not call `onStateChange` for the first state (`react-navigation/core/BaseNavigationContainer.js`).
  - So the signed-in place's layout renders first with `useSegments()` empty, its guard keeps no token, and
    `useOwnPlace`'s Redirect leads to `/`, then to the map. Losing the race only makes the router start at `/`; the
    token is lost either way.
- **The fix is the one the model passed**, `mobile/src/app/+native-intent.ts`. `getLinkingConfig.js` calls its
  `redirectSystemPath({ path, initial })` with the first address on both platforms, before the router renders. At a
  start of the app it keeps an Invite Link's token (`keep({ inviteToken })`) and gives `path` back unchanged.
  - On Android it reads the address from expo-linking's `getLinkingURL()`, falling back to `path`, and calls
    `clearInitialURL()` (since the reviews, at every address; see "From the reviews" below). The native module
    (`ExpoLinkingModule.initialURL`) holds the address for as long as the process lives. On iOS it reads `path`, which
    is already that address.
  - It parses both forms, `https://<host>/invite/<token>` and `snunow://invite/<token>`, and a bare path.
  - The signed-in place's other half, which opens a kept token's accept screen once the User is there, is unchanged,
    and so is the guard's keeping half, which still serves a link opened while the app runs and the User is signed
    out. The layout's comment now points at `+native-intent.ts`. A link opened while the app runs calls the hook with
    `initial: false`, which keeps nothing.
  - A tapped push is not an address: expo-notifications starts the main activity with no data, so the hook keeps
    nothing for it.
- **The page** is `main-server/src/invite-links/invite-page.ts` and `invite-page.controller.ts`, `@Public()`, in
  `InviteLinksModule`.
  - The Invite Link token's form is `INVITE_LINK_TOKEN_FORM = /^[\w-]{43}$/u` in `invite-links.service.ts`, beside the
    `randomBytes(32).toString('base64url')` that makes every token.
  - `invitePage(token)` checks the form itself, so no caller can put another token into the page. Only a matching
    token goes into the button's `href`, and it is made of `[A-Za-z0-9_-]` alone.
  - The wordmark is `docs/design/app-icon/sign-in-wordmark.svg`, inlined at 132 × 103 with `role="img"` and
    `aria-label="SNU Now"`. The colours and the button (52 high, corner 12, `#001A72`) are the app's tokens. The font
    is the phone's own.
  - Headers: `Content-Type: text/html; charset=utf-8`, `X-Robots-Tag: noindex`, and a `Content-Security-Policy` of
    `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, so
    the browser itself refuses any load and any script. The page also has `<meta name="robots" content="noindex">`
    and the phone-width viewport.
- **Decided here, where the ticket says nothing:**
  - A token of another form answers **404** with the page; a well-formed one answers 200. The ticket asks only for "a
    page". The controller sets the status on a passthrough response and returns the page.
  - The not-found page keeps the title "SNU Now 친구 초대" as its heading and says "찾을 수 없는 초대 링크예요" under it.
- **Where each criterion is checked:**
  - `mobile/__tests__/invite-link-cold-start.integration.test.tsx` (new) takes Android's way: `Platform.OS` replaced by
    `android`, `startApp(null)` so the router asks the phone, React Native's `Linking.getInitialURL` answering after
    10 ms or after 300 ms (past the 150 ms race), and expo-linking's `getLinkingURL`/`clearInitialURL` standing in for
    the native module. Its cases:
    - the accept screen after the loading screen for a signed-in User, for both forms and both answers;
    - 수락 making the two Friends;
    - a signed-out User's accept screen after the sign-in, the consent and Onboarding;
    - "opens once": after the accept screen, `inviteToken` is null, and a later start in the same process from the
      home screen shows the map;
    - and a start from the home screen keeping nothing.
    - The first seven failed on the code before the fix, each at the accept screen; the last passes either way.
  - `mobile/__tests__/support/app.tsx`: `startApp` now carries `+native-intent` among the app's files, as the real
    app does, and takes `null` for no address.
  - A link while the app runs and a tapped push: `friends-server.integration.test.tsx`,
    `push/notification-links.integration.test.tsx` and `friends-add.integration.test.tsx` pass unchanged, and so do
    `shell`, `loading` and `consent`, which start the app.
  - The page: `main-server/test/invite-page.integration.test.ts` (new):
    - a well-formed token: 200, the words, one link, to `snunow://invite/<token>`, the headers, and no script, no load
      and no APK;
    - one usable, one used, one expired and one nobody made give the same page with no sender;
    - five tokens of another form give 404, the not-found words, no link and nothing of the address: too short, one
      too long, a `.`, `"><script>alert(1)</script>`, and an `<img onerror>` padded to 43 characters;
    - the `/invite-links` routes answer 401 without a sign-in, and `assetlinks.json` answers.
    - All but the last failed with the controller left out of the module. `invite-links`, `invite-link-refusals` and
      `asset-links` pass unchanged.
  - The device: the run below.
- **Checks:** `tsc --noEmit` clean in `mobile/` (the four stale typed-route errors did not appear in this worktree)
  and in `main-server/`; `oxlint --type-aware` and `prettier --check` clean on every changed file;
  `check-test-levels.ts` passes in both.
- **No native file changed.** `+native-intent.ts` is JavaScript under `src/app/`, so the app's part ships over the
  air. The main server needs a Release for the page.
- **Left open:** a new User who meets the accept screen right after Onboarding may get the map's explanation before
  the location prompt, "내 위치를 지도에 표시할까요?", drawn over the accept screen until they answer it. It is the
  map's dialog for a first run, shown before the accept screen has slid over the map. It appeared in two of the four
  hand runs of that flow below. By the code, a link opened while signed out meets the same order without this change;
  that was not run. Not changed here.

### From the reviews (2026-11-18)

- **An old link reopened, fixed.** On Android `onNewIntent` replaces expo-linking's held address with every link
  opened while the app runs. If the screens later start again in the same process (Back out, then the launcher), the
  hook read that old link as the start's and reopened its accept screen. `+native-intent.ts` now calls
  `clearInitialURL()` at every address, a start or not, reads `getLinkingURL() ?? path` only at a start, and keeps a
  token only at a start; a link opened while the app runs stays the signed-in place's. `d806c50e`.
- **Unit tests.** `mobile/__tests__/native-intent.unit.test.ts` (new), with expo-linking and `@/storage/kept` as
  stand-ins: on Android a starting https link and a starting `snunow://` link keep the token from the held address and
  clear it; a link while running keeps nothing and clears it; a later start after such a link keeps nothing; a start
  from the home screen keeps nothing; on iOS the path is read and expo-linking left alone; the path always comes back.
  The two cases of the new clearing failed on the hook before the change. `main-server/test/invite-page.unit.test.ts`
  (new) takes the token forms, the words, the button and the escaping from the integration test, which keeps what goes
  over HTTP: a well-formed token without a sign-in, a malformed one, one carrying markup, the sameness of used,
  expired and unknown tokens, and the API's sign-in. `c76d16f4`, with `INVITE_LINK_TOKEN_FORM` for the old name and
  the controller returning the page through a passthrough response.
- **A malformed token keeps answering 404 with the page**, the right status for a resource that does not exist; "the
  404" the ticket replaces is today's JSON `Cannot GET`. For 김태현 to confirm.
- **The location explanation over the accept screen after Onboarding is not this ticket's.** The criteria keep the
  accept screen as it is, and a link opened while signed out already meets the same order. It is left for its own
  item.

### Device run (2026-11-18)

**Setup:**

- The mock release APK, built in this worktree with `mobile/scripts/build-mock-apk.sh`'s steps run by hand: JDK 17,
  empty server addresses, Google web client ID and `INVITE_LINK_HOST`,
  `expo prebuild --platform android --clean --no-install`, then `./gradlew assembleRelease`. It was built from the
  commit of the fix, `ead99e98`. `package.json` came out unchanged.
- The pinned emulator: the `Medium_Phone` AVD, `system-images;android-36;google_apis_playstore;arm64-v8a` revision 7,
  emulator 37.1.11, booted cold (`-no-snapshot-load -no-snapshot-save`).
- Maestro 2.11.0, through `mobile/scripts/test-device.sh` itself, which needs no pnpm.

**`test-device.sh`, folder `device-results/2026-11-18T190407-ead99e98`:**

```
[Passed] M2 an Invite Link opened on a warm start (1m 1s)
[Passed] M2 an Invite Link opened on a cold start (59s)
[Passed] M1 first run, then a relaunch to the map (1m 10s)
3/3 Flows Passed in 3m 11s
```

M2 on a cold start showed "유지안님의 친구 초대" after the loading screen, and after 수락 the map said
"유지안님과 친구가 됐어요" and 친구 관리 listed 유지안.

**Hand checks with two flows not committed** (in the same session, same build):

- **A signed-out cold start.** Cleared state, `stopApp`, `openLink snunow://invite/from-yujian`: the sign-in screen
  shows. The sign-in, 동의하고 시작 and Onboarding, with no accept screen on the way. After 저장하고 시작하기,
  "유지안님의 친구 초대". The flow ran four times while it was taught to answer the map's explanation before the
  location prompt, which came over the accept screen in two of them (see "Left open"); the accept screen showed in all
  four, and the last run passed.
- **A plain start after it**, with the state kept: `stopApp`, then `launchApp`. The map, and no accept screen within
  8 s. Passed.
- **The page in the emulator's Chrome.** The page was served by a small local server that serves the built
  `invitePage()` with the controller's headers, reached through `adb reverse`, not by a running main server:
  - With a well-formed token, the wordmark, the title, the button and the line fit the phone's 411 dp width.
  - With the app stopped, its button started the app at the accept screen: the mock knows no such token, so it said
    "찾을 수 없는 초대 링크예요".
  - `/invite/%3Cscript%3Ealert(1)%3C%2Fscript%3E` showed the not-found page, with no button and nothing of the address.
- **Not run on the device:** the https form, since the mock APK declares no App Link; Jest covers it. iOS, as the
  ticket says.

**Re-run after the reviews' change to the hook** (`c76d16f4`): the mock APK built again from the same generated
project (`./gradlew assembleRelease` alone, 33 s), the emulator booted cold, `test-device.sh` twice.

- `device-results/2026-11-18T194504-c76d16f4`: M2 on a warm start and M1 passed. M2 on a cold start reached
  "유지안님의 친구 초대" and accepted (the map's count went from 12 Friends to 13), but its assertion of the toast
  "유지안님과 친구가 됐어요" failed. The toast shows for 2.4 s, and on this slower run Maestro's tap on 수락 took 6.4 s
  to settle, so the toast was gone before the check. A timing flake of the shared accept step, not of the hook.
- `device-results/2026-11-18T195100-c76d16f4`, right after, unchanged: M2 on a warm start (1m 13s), M2 on a cold
  start (1m 45s) and M1 (1m 36s) passed, 3/3.

The screenshots for the pull request and both JUnit reports are in `~/Downloads/p15-10/`.
