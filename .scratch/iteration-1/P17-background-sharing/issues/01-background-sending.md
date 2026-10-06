# 01: Sending the User's position in the background, under a notification

Parent: [P17 spec](../spec.md)
Status: ready-for-human
Blocked by: none

## What to build

While the app is open, P19 sends the User's position every 5 seconds while the Master Switch is on. This ticket keeps
sending it once the app goes to the background, so that a User with the phone in a pocket stays on the map of their
Friends. It runs only on Android, in a development build, and only when the User turns it on.

The User turns it on with a new switch row on 내 정보, `백그라운드에서도 공유`, under the Master Switch. The app asks for
the background location permission only then, after a short explanation. While it runs, Android shows a permanent
notification. It stops at once when the Master Switch goes off, when the row goes off, at sign-out, and when the main
server ends the Session. When Android ended it because the User closed the app, nothing restarts it while the app is
closed, and the next time the app opens it says that background sharing had stopped.

The phone's part, which no test can run, is checked by a person with the verification list of the spec, copied under
"For a person" below.

No frame draws any of this: every word below is new and marked so.

## Acceptance criteria

### The background task

- [x] The background sending uses Expo's location module with its task module (`expo-task-manager`, added with
      `pnpm expo install`), as a foreground service. The task is defined in the bundle's global scope, so that it runs
      also when Android starts the app without its screens.
- [x] The foreground service's notification is permanent while the task runs. Its words are new: the title
      `친구에게 내 위치를 공유하고 있어요` and the text `앱을 열어 내 정보에서 끌 수 있어요`. Pressing it opens the app,
      where the Master Switch is.
- [x] The task asks the phone for a position every 30 s, against the 5 s while the app is in front. While the app is
      in front the task sends nothing, because the sending of P19 does; once it is in the background the task sends
      the newest position of each batch that has an accuracy, to the same `POST /positions` with `latitude`,
      `longitude`, `accuracy` and `measuredAt`.
- [x] Before every upload the task reads what the phone keeps: whether the User is signed in, the Master Switch and the
      User's choice of background sharing. It sends nothing and stops itself when any of them is off.
- [x] The answers, as in P19:
  - a position kept, with or without `offCampus`, goes on;
  - 409 `MASTER_SWITCH_OFF` keeps the Master Switch off on the phone and stops the task;
  - a 401 is renewed by the client on its own, also in a start of the app without its screens, where the tokens are
    first read from the phone's storage; a 401 that the renewal cannot mend, and a 401 `SESSION_REPLACED`, which is
    not renewed, end the Session as for every request, and the task stops as on sign-out;
  - a 403 stops the task;
  - the 400s and no answer drop that position, and the next one is sent.
- [x] The task stops at once, with its notification:
  - when the Master Switch is turned off, by the User or by `MASTER_SWITCH_OFF`;
  - when the row `백그라운드에서도 공유` is turned off;
  - when the background permission is no longer granted;
  - at sign-out, before the Session ends;
  - when the Session ends, whatever ended it.

  A sign-out and an end of the Session also forget the choice, so that the next User on the phone starts without it.
- [x] The decisions, whether to send, to skip or to stop before an upload, what to do after an answer, which position
      of a batch to send, and whether to say that background sharing had stopped, are functions without device calls,
      tested with Jest.

### 내 정보

- [x] Under the Master Switch, on Android where background location is available, the switch row
      `백그라운드에서도 공유` (new words) with the description `화면이 꺼져도 30초마다 위치를 보내요` (new). It is
      disabled while the Master Switch is off. It shows on while the User chose it and the background permission is
      granted.
- [x] Turning it on with the background permission granted turns it on. Without it, a short explanation comes first,
      a Dialog with new words:
  - title `백그라운드에서도 위치를 공유할까요?`;
  - body `휴대폰을 주머니에 넣어 두어도 친구가 내 위치를 볼 수 있어요. 다음 화면에서 위치 권한을 '항상 허용'으로 바꿔 주세요. 공유하는 동안에는 알림이 계속 보여요.`;
  - `나중에` and `계속`. `계속` shows the system's prompt.

  Where the system no longer prompts, the body is `휴대폰 설정에서 위치 권한을 '항상 허용'으로 바꾸면 백그라운드에서도 공유돼요.`
  and `설정 열기` opens the phone's settings. A refusal, and `나중에`, leave the row off and show the toast
  `위치 권한을 '항상 허용'해야 백그라운드에서 공유할 수 있어요` (new).
- [x] The foreground permission stays the first one asked, by the Master Switch of P19. A User who refused the
      background permission keeps the sending while the app is open.

### Telling the User it stopped

- [x] When the app starts again while the phone kept that background sharing was running, the process that ran it has
      ended, as when the User swiped the app away: the signed-in screens show the Dialog `백그라운드 위치 공유가
      멈췄어요` with the body `앱을 완전히 닫으면 공유가 멈춰요. 백그라운드로 보내 두기만 하면 계속 공유돼요.` and
      `확인` (all new). The background sharing starts again only because the app is open, the row still on.
- [x] Nothing restarts the task while the app is closed: the foreground service is destroyed with the app.

### Configuration and records

- [x] `app.json`: the location plugin enables Android's background location and foreground service permissions. iOS
      is left out, as the spec says.
- [x] `mobile/README.md`, "The User's position": the background sending and how to see it, the need for a development
      build, and that the main server's address must be https on a phone (Android refuses plain connections; the
      tunnel gives https).
- [x] P06's `todo.md` §3: the sending row says that the background is sent too.
- [x] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

### For a person

On one physical Android phone, with a second account watching on another phone or an emulator. For each step, record
the phone model, the Android version, the result, and a screenshot or a short recording.

- [ ] Turn sharing on, lock the screen, walk for 10 minutes: the watcher sees the Avatar move throughout.
- [ ] Switch to another app for 10 minutes: the Avatar keeps moving.
- [ ] Turn the Master Switch off from the notification or the app: the Avatar disappears from the watcher's map at
      once.
- [ ] Leave the phone locked for more than 1 hour, then walk: the Avatar moves; the Session was renewed.
- [ ] Close the app by swiping it away: sharing stops; the app says so when opened again.
- [ ] Sign in with the same account on another phone or an emulator: the first phone stops sharing and shows the
      sign-in screen with the reason.
- [ ] Refuse the background permission: sharing works while the app is open only.
- [ ] Walk out of the Campus Boundary: the Avatar disappears; it returns on coming back.

## Comments

### Result (2026-10-06)

Where things are, in `mobile/`:

- `index.ts` is the bundle's entry (`package.json`'s `main`): it imports `src/position/background-task.ts`, which
  defines the task and stops it at any end of the Session, then `expo-router/entry`.
- `src/position/background-rules.ts`: `BACKGROUND_EVERY_MS`, `beforeUpload`, `afterUpload`, `newestUpload` and
  `stoppedWhileClosed`, without device calls.
- `src/position/background.ts`: the availability, the background permission, and `startBackground` /
  `stopBackground(forget)` with the foreground service's notification. `phone.ts` exports `permissionOf` for it.
- `src/position/background-upload.ts`: one run of the task.
- `src/position/background-sharing.tsx`: `BackgroundSharingProvider`, inside `PositionSending` in the signed-in
  layout, and `useBackgroundSharing()`; it holds the stopped dialog.
- `src/screens/me/background-row.tsx`: the row and its explanation, in the 위치 공유 card. 로그아웃 calls
  `stopBackground(true)` before `signOut`.
- `src/storage/kept.ts` keeps `masterSwitch`, `backgroundChosen` and `backgroundRunning`; an older record reads them as
  false.
- `app.json`: `isAndroidBackgroundLocationEnabled` and `isAndroidForegroundServiceEnabled` on the location plugin.
  `expo-task-manager` ~57.0.21 was added.
- Tests: `__tests__/background-sharing-test.ts` (the rules, and runs of the task against the fake main server: the
  tokens read in a start without screens, in front, the Master Switch read first, the renewal on 401,
  `SESSION_REPLACED`, `MASTER_SWITCH_OFF`); `api/sign-in-test.ts` follows the new kept fields.

Decisions made while building:

- The updates run whenever the three conditions hold, also while the app is in front, because Android lets an app
  start a foreground service only from the front. The task skips its upload while the app is in front, so the 5 s
  sending of P19 and the 30 s background sending never both send. The notification therefore shows as soon as the row
  is on, not only once the app is in the background.
- The renewal is the client's (`http.ts`), which the task goes through, not a second one in the task. What the task
  decides after a 401 is only to stop, since the client already ended the Session.
- The task reads the Master Switch from the phone's storage, which the provider writes from the Lobby before it
  starts the updates, since a start of the app for the task alone has no Lobby.
- "Android ended the task" is found as a new start of the app while the phone kept that the updates were running: the
  process that ran them ended. This also covers Android ending the process for memory. The service is created with
  `killServiceOnDestroy`, so a swipe ends it; Expo's task module may register the updates again when the app next
  starts, which the provider or the task's first run follows.
- The blocked form of the explanation opens the phone's settings and leaves the row off; the User turns it on again
  on return, as with the Master Switch of P19.
- The row is disabled while the Master Switch is off and keeps showing the choice.
- A sign-out and any end of the Session forget the choice, so the next User on the phone chooses again.

Not done or not checked:

- Nothing ran on a phone, an emulator or against a running main server; the criteria under "For a person" are open.
- Android 13 and later show a foreground service's notification only with the notification permission, which the app
  does not ask for (no notification module is installed). Without it the service still runs and Android lists it
  among the running apps. The person's check will show which applies.
- After a `SESSION_REPLACED` met by the task in a start of the app without screens, the sign-in screen opens on the
  next open without the dialog about the other phone; with the screens alive in the background it shows.
- `pnpm test` once over the whole suite: 76 of 81 files passed; `main-walk`, `main-markers`, `me`, `position-sending`
  and `master-switch` failed in that run, which took up to 246 s per file under load, and each passed when run on its
  own afterwards.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 1 hour of agent time in one session. Tokens: about 5 M input, of
which about 4.7 M cache reads and 0.25 M cache writes, and about 0.06 M output. No subagents.
