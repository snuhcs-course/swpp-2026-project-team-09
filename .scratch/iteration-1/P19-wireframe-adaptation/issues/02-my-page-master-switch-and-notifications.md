# 02: 내 정보, the Master Switch with the position sent while the app is open, and 알림

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (The shell, the shared components, the Quest full screen and the Friend panel)

## What to build

The 내 정보 tab becomes the `Profile` frame. It has:

- the User's profile, with `프로필 편집`;
- the week of classes from the main server;
- the switch `친구와 위치 공유`, which is the Master Switch;
- the rows that lead to the User's Friends, Quests and Parties;
- `로그아웃`.

While the switch is on and the app is open, the app sends the User's position to the main server about every five seconds, so that Friends see the User's Avatar move. Until now the app sent nothing. P17 adds sending in the background on top of this.

The bell on the app bar opens `알림`. It is composed on the app from lists the main server already serves, with no server change and no read or unread state. The 파티 slot's badge on the bottom navigation is counted from the same lists, in place of the mock's fixed number.

The frames are `Profile`, `ProfileShare` (the same screen reached from the Friend panel's `공유 설정`), `ProfileEdit`, and the `알림` panel inside `Profile`.

The server routes:

- `POST /lobby`: its `masterSwitch` and `profile.friendId`, which the app's `Lobby` type gains;
- `PATCH /users/me/profile`;
- `PUT /users/me/master-switch`;
- `POST /positions`;
- `GET /timetable/classes` and `GET /places`, both read only here;
- `GET /friend-requests`, `GET /quest-invitations`, `GET /meetups`, `GET /quests/:questId/join-requests` and `GET /parties`;
- `GET /quests`: its `leader`, `capacity` and `joinPolicy`, which the app's `Quest` type gains;
- `POST /auth/sign-out`, through the sign-in module's `signOut`.

Each new operation goes into the API client with its mock, so that the screen runs in Expo Go and on the web against the mocks and in a build against the main server (`mobile/README.md`, "From a mock to the main server").

## Acceptance criteria

### 내 정보 (`Profile`)

- [ ] The app bar holds `내 정보` and the bell. The bell is labelled `알림`, or `알림 {n}개` with a red count (`9+` above 9), and it opens 알림.
- [ ] The profile card shows:
  - the Avatar in its large size, with the name's letters;
  - the name in 20/700;
  - the meta line `{학과} · {yy}학번` (`컴퓨터공학부 · 22학번`), or the department alone without an admission year;
  - the Badge (tone friend, check icon) `SNU 계정 인증됨`;
  - the outlined `프로필 편집`.

  They come from the Lobby's profile.
- [ ] The 시간표 card holds the heading `시간표` and the frame's week grid:
  - columns Mon–Fri headed `월` … `금`, today's in navy bold;
  - 216 high from 09 to 18, with the hour labels 9, 11, 13, 15 and 17;
  - a block per class time, coloured by the class's place in the timetable from the frame's palette `#001A72 #0E7383 #865600 #6B46C1 #B8336A #0369A1 #4D7C0F`. The palette becomes tokens, which ticket 03 shares.

  A block reads `{과목명}` over `{동 번호}-{강의실 without 호}` (`301-118`), or over the Place's number alone, or the room alone. Times on Saturday and Sunday and hours outside 09–18 are not drawn.

  The data is `GET /timetable/classes`, with `GET /places` for the numbers. A failure shows the shared error state inside the card.
- [ ] The card's three tiles: `직접 입력` shows "준비 중이에요" until ticket 03 opens the timetable from it. `이미지로 불러오기` and `빈 시간 말하기` show "준비 중이에요".
- [ ] The 위치 공유 card has the heading `위치 공유` and the switch row `친구와 위치 공유` with the description `{n}명`, the number of Friends. It has no `비공개 구역 관리` row.
- [ ] Reached from the Friend panel's `공유 설정` (`ProfileShare`), the screen scrolls so that the card is at the top. It outlines the card in 3 `#3D63D6`, and the outline fades after 1.2 s.
- [ ] The activity rows each have an icon, a label, a value and a chevron:
  - `친구 관리 {n}`, where n is the number of Friends: shows "준비 중이에요" until P14;
  - `참여 중인 파티 {n}`, where n counts the User's Quests that are not Class Quests: opens 파티 at `내 파티`;
  - `내 퀘스트`: opens the Quest full screen of ticket 01.

  `관심 행사` and `알림 설정` are not built.
- [ ] `로그아웃` is red text. It opens the danger dialog `로그아웃할까요?` with `취소` and `로그아웃`. Confirming stops the sending, signs out with `signOut` and `leave`, and shows sign-in.

### 프로필 편집 (`ProfileEdit`)

- [ ] It is a screen above the tabs, with `뒤로` and `프로필 편집`.
- [ ] The `기본 정보` card holds:
  - `이름`, up to 30;
  - `학과`, Onboarding's department search;
  - `학번`, Onboarding's choices with `그 외`.

  The `관심사` card holds removable chips, `#관심사` with `추가`, and `추천`. They reuse Onboarding's fields and start from the Lobby's profile.
- [ ] `저장` (52, navy) sends the changed fields with `PATCH /users/me/profile`. The answer's profile replaces the Lobby's in the cache, and the screen goes back. A failure shows `저장하지 못했어요. 다시 시도해 주세요` and stays.
- [ ] The photo, `과정` and `성별` are not built: the main server stores none of them.

### The Master Switch and sending the position

- [ ] The switch starts from the Lobby's `masterSwitch`. Turning it changes it with `PUT /users/me/master-switch`, showing the new state at once. After a failure, the switch turns back and the toast says `위치 공유를 바꾸지 못했어요`. After a change, the Friends and the positions are fetched again.
- [ ] Turning it on needs the location permission, through P06's flow:
  - unasked: the explanation, then the system's prompt;
  - blocked: the explanation's form that opens the phone's settings;
  - a refusal leaves the switch off and shows `위치 권한을 허용해야 공유할 수 있어요`.

  The switch is sent on only once the permission is granted.
- [ ] While the switch is on, the permission is granted and the app is in front, each new position of `usePosition` goes to `POST /positions` with `latitude`, `longitude`, `accuracy` and `measuredAt`. That is at most one upload every `POSITION_EVERY_MS` (5 s), even where a phone tells a position every second. Only one upload is in flight at a time: a newer position replaces one that waits.

  The position hook gains the phone's accuracy and the time of the measurement. The development walk gives an accuracy of 10 and the time it moves.
- [ ] The sending lives in the signed-in layout, beside the `PositionProvider`. It runs on every tab, not only on 내 정보.
- [ ] The answers:
  - `offCampus: true` shows the line `캠퍼스 밖이라 위치가 공유되지 않아요` under the switch until an upload is kept again;
  - 409 `MASTER_SWITCH_OFF` turns the switch off, stops the sending and fetches the Lobby again;
  - 400 `POSITION_TOO_OLD`, `POSITION_IN_THE_FUTURE` or `POSITION_TOO_INACCURATE`, and no answer at all, drop that position, and the next one is sent;
  - a 401 is the client's, as for every request.
- [ ] The sending stops at once when:
  - the switch is turned off;
  - the app goes to the background;
  - the User signs out;
  - the Session ends.

  It starts again when the app returns to the front with the switch on.
- [ ] The mock keeps the switch in memory. It answers `offCampus` by the campus rectangle and refuses with `MASTER_SWITCH_OFF` while the switch is off, as the main server does.

### 알림 and the 파티 badge

- [ ] The bell opens 알림, a screen above the tabs with `뒤로` and `알림 {n}`. Its rows each have:
  - a round icon of 40 on its tinted ground;
  - a title in 15/600 and a sub-line in 13;
  - a chevron.

  They come in this order:
  - **A Party running for a Quest the User holds, which the User is not in** (`GET /parties`, where `holdsQuest`): a `pin` in navy on `#EEF2FB`. The title is `파티가 활성화됐어요` and the sub-line `{the Party's title} · 참여하면 위치를 공유해요`. The frame's `{name}님이 파티를 활성화했어요` needs the name of whoever opened it, and no answer holds it. The press leads to the Quest's room, and says "준비 중이에요" until P13.
  - **A Friend Request received** (`GET /friend-requests`, `received`): a `user` in navy on `#EEF2FB`, with the title `{name}님의 친구 요청` and the sub-line `{학과}`. The press leads to 친구 관리 › 친구 요청, and says "준비 중이에요" until P14.
  - **A Quest invitation** (`GET /quest-invitations`): a `calendar` in `#865600` on `#FFF4D6`, with the title `{the Leader's name}님의 파티 초대` and the sub-line `{the Quest's title}`. The press opens 파티 at `초대`.
  - **A Meetup proposed to the User and waiting** (`GET /meetups`, `received`, state `proposed`): the same look, with the title `{the proposer's name}님의 파티 초대` and the sub-line `{title} · {when}`, such as `학관 점심 · 내일 12:10`. The press opens 파티 at `초대`.
  - **Requests to join a Quest the User leads** (`GET /quests/:questId/join-requests`, for each of the User's Quests whose `leader` is the User and whose Join Policy is Approval): a `users` in `#B63A07` on `#FDEDE4`, with the title `참여 신청 {n}명` and the sub-line `{the Quest's title}`. A Quest without requests has no row. The press leads to the room, and says "준비 중이에요" until P13.
- [ ] With no rows it says `새 알림이 없어요`. A list that fails is left out. When every list failed, the shared error state shows, with `다시 시도`.
- [ ] The lists are fetched again:
  - `friends-changed` refetches the Friend Requests;
  - `quests-changed` refetches the Quests, the invitations and the join requests;
  - `meetups-changed` refetches the Meetups;
  - `party-changed` refetches the Parties.

  The app's signal table (`live-updates.tsx`) gains these. The lists are also fetched when the app returns to the front.
- [ ] The bell's count is the number of rows. The 파티 slot's badge, on every tab, is the number of rows except the Friend Requests. It replaces the mock `getPartyNews`, which is removed. Neither ever fails a screen: while loading and after a failure there is no badge.

### Records and checks

- [ ] P06's `todo.md` §3 is updated:
  - rows are added for each new operation, with its route;
  - the Lobby's row loses "Its `masterSwitch` waits";
  - the 파티 number's row says it is composed from the lists above;
  - the paragraph that says sending is built later becomes a row for sending.

  §4 loses the 내 정보 row. `mobile/README.md` ("The User's position", "The connection to the socket server", "Data") says that the position is sent while the switch is on and the app is in front, and how.
- [ ] Jest tests:
  - the screen against the mocks: the profile card with and without an admission year, the grid's blocks and today's column, each row's press, `로그아웃` with both answers, `공유 설정` arriving at the card, 프로필 편집 saved and failed;
  - the switch: turned on with each permission answer, turned off, a failed change;
  - the sending, with fake timers and a given position: one upload every 5 s while on and in front; none while off, in the background, after sign-out or after the Session's end; each answer (`offCampus`, `MASTER_SWITCH_OFF`, the three 400s, no answer);
  - 알림: each kind of row with its words and its press, the empty and the failed states, the bell's count and the 파티 badge, a signal arriving through the fake socket and changing a row;
  - each new operation against the fake server of `__tests__/support/`, and the Lobby's new fields.
- [ ] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - no `2026-2학기` (no semester is stored);
  - no `비공개 구역 관리`, `관심 행사` or `알림 설정`;
  - the 프로필 편집 fields the main server does not store;
  - the activation row's title;
  - the sub-lines without a year or time where no answer holds them;
  - the words for the switch's refusals and the off-campus line, which no frame draws.
- [ ] A sign-in on the emulator against the main server, with a second User who is a Friend watching: the switch is turned on, the second User's map shows the Avatar moving, and turning the switch off removes it. This is recorded under Comments, with a screenshot in the pull request.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.
