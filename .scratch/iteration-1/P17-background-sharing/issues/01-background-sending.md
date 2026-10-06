# 01: Sending the User's position in the background, under a notification

Parent: [P17 spec](../spec.md)
Status: ready-for-agent
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

- [ ] The background sending uses Expo's location module with its task module (`expo-task-manager`, added with
      `pnpm expo install`), as a foreground service. The task is defined in the bundle's global scope, so that it runs
      also when Android starts the app without its screens.
- [ ] The foreground service's notification is permanent while the task runs. Its words are new: the title
      `친구에게 내 위치를 공유하고 있어요` and the text `앱을 열어 내 정보에서 끌 수 있어요`. Pressing it opens the app,
      where the Master Switch is.
- [ ] The task asks the phone for a position every 30 s, against the 5 s while the app is in front. While the app is
      in front the task sends nothing, because the sending of P19 does; once it is in the background the task sends
      the newest position of each batch that has an accuracy, to the same `POST /positions` with `latitude`,
      `longitude`, `accuracy` and `measuredAt`.
- [ ] Before every upload the task reads what the phone keeps: whether the User is signed in, the Master Switch and the
      User's choice of background sharing. It sends nothing and stops itself when any of them is off.
- [ ] The answers, as in P19:
  - a position kept, with or without `offCampus`, goes on;
  - 409 `MASTER_SWITCH_OFF` keeps the Master Switch off on the phone and stops the task;
  - a 401 is renewed by the client on its own, also in a start of the app without its screens, where the tokens are
    first read from the phone's storage; a 401 that the renewal cannot mend, and a 401 `SESSION_REPLACED`, which is
    not renewed, end the Session as for every request, and the task stops as on sign-out;
  - a 403 stops the task;
  - the 400s and no answer drop that position, and the next one is sent.
- [ ] The task stops at once, with its notification:
  - when the Master Switch is turned off, by the User or by `MASTER_SWITCH_OFF`;
  - when the row `백그라운드에서도 공유` is turned off;
  - when the background permission is no longer granted;
  - at sign-out, before the Session ends;
  - when the Session ends, whatever ended it.

  A sign-out and an end of the Session also forget the choice, so that the next User on the phone starts without it.
- [ ] The decisions, whether to send, to skip or to stop before an upload, what to do after an answer, which position
      of a batch to send, and whether to say that background sharing had stopped, are functions without device calls,
      tested with Jest.

### 내 정보

- [ ] Under the Master Switch, on Android where background location is available, the switch row
      `백그라운드에서도 공유` (new words) with the description `화면이 꺼져도 30초마다 위치를 보내요` (new). It is
      disabled while the Master Switch is off. It shows on while the User chose it and the background permission is
      granted.
- [ ] Turning it on with the background permission granted turns it on. Without it, a short explanation comes first,
      a Dialog with new words:
  - title `백그라운드에서도 위치를 공유할까요?`;
  - body `휴대폰을 주머니에 넣어 두어도 친구가 내 위치를 볼 수 있어요. 다음 화면에서 위치 권한을 '항상 허용'으로 바꿔 주세요. 공유하는 동안에는 알림이 계속 보여요.`;
  - `나중에` and `계속`. `계속` shows the system's prompt.

  Where the system no longer prompts, the body is `휴대폰 설정에서 위치 권한을 '항상 허용'으로 바꾸면 백그라운드에서도 공유돼요.`
  and `설정 열기` opens the phone's settings. A refusal, and `나중에`, leave the row off and show the toast
  `위치 권한을 '항상 허용'해야 백그라운드에서 공유할 수 있어요` (new).
- [ ] The foreground permission stays the first one asked, by the Master Switch of P19. A User who refused the
      background permission keeps the sending while the app is open.

### Telling the User it stopped

- [ ] When the app starts again while the phone kept that background sharing was running, the process that ran it has
      ended, as when the User swiped the app away: the signed-in screens show the Dialog `백그라운드 위치 공유가
      멈췄어요` with the body `앱을 완전히 닫으면 공유가 멈춰요. 백그라운드로 보내 두기만 하면 계속 공유돼요.` and
      `확인` (all new). The background sharing starts again only because the app is open, the row still on.
- [ ] Nothing restarts the task while the app is closed: the foreground service is destroyed with the app.

### Configuration and records

- [ ] `app.json`: the location plugin enables Android's background location and foreground service permissions. iOS
      is left out, as the spec says.
- [ ] `mobile/README.md`, "The User's position": the background sending and how to see it, the need for a development
      build, and that the main server's address must be https on a phone (Android refuses plain connections; the
      tunnel gives https).
- [ ] P06's `todo.md` §3: the sending row says that the background is sent too.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

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
