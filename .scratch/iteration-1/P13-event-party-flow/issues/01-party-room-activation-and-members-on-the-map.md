# 01: The 파티 room, its 활성화, and the members on the map

Parent: [P13 spec](../spec.md)
Status: ready-for-human
Blocked by: P19-01 (The shell, the shared components, the Quest full screen and the Friend panel), P19-02 (내 정보, the Master Switch with the position sent while the app is open, and 알림), P08-16 (Recruiting boards, the Quest's description, and the Leader's endings)

## What to build

Every Quest the User holds gets its room, the frame's 파티 room. From it the Holders see the plan (`일정`, the Sub Quests), who is coming (`멤버`), and whether the Quest's Party runs. Any Holder opens the Party (`파티 활성화`), and the others enter it with one tap. Once in, the members see each other's Avatars move on the map, an Avatar that stopped reporting dims and then goes, and `활성 파티` on the map leads back to the room.

The Leader adds, edits and cancels Sub Quests, answers requests to join, sees and cancels the invitations sent, removes Holders, hands the role over and ends the Quest for everyone. Any Holder marks a Sub Quest done for themselves and leaves the Quest.

The room is reached from every place that shows one of the User's Quests and so far said "준비 중이에요": the rows of the floating Quest list (P06) and of the Quest full screen (P19-01), the Quest's card on the map, the `활성 파티` pill, a Party member's card (`파티 열기`), and the 알림 rows of P19-02 that name a running Party or requests to join.

This ticket builds the room for the User's own Quests. Ticket 02 adds the room's recruiting parts (`모집글 보기`, the description, editing the settings) and the 파티 tab that lists the rooms; ticket 03 adds the Global Event's card.

The frames are `PartyDetail` (the room inside `Party`), `PartyLeave`, the room's sheets and the 일정 form inside `Party`, `PlacePickerMap` for `지도에서 선택`, and, on the map, `Main` and `MapZoomed` (the `활성 파티` pill, a member's Avatar and card).

The server routes:

- `GET /quests/:questId`, `DELETE /quests/:questId` (drop);
- `POST /quests/:questId/sub-quests` with its `Idempotency-Key`, `PUT` and `DELETE /quests/:questId/sub-quests/:subQuestId`, `POST /quests/:questId/sub-quests/:subQuestId/done`;
- `PUT /quests/:questId/leader`, `DELETE /quests/:questId/holders/:userId`, `POST /quests/:questId/end` (P08-16);
- `GET /quests/:questId/join-requests` (P19-02 adds it to the client), `POST /quests/:questId/join-requests/:id/accept` and `/decline`;
- `GET /quests/:questId/invitations` and `DELETE /quests/:questId/invitations/:id` (P08-16);
- `POST /parties`, `GET /parties/mine`, `GET /parties` (with `leader`, P08-16), `POST /parties/:partyId/join`, `POST /parties/mine/leave`, `PUT /parties/mine/sharing`, `DELETE /parties/mine/members/:userId`, `POST /parties/mine/end` (P08-16);
- `GET /places/at` for the map view;
- on the socket: `position`, `position-removed`, `quests-changed`, `party-changed`.

Each new operation goes into the API client with its mock, so that the room runs in Expo Go and on the web against the mocks and in a build against the main server.

## How the room maps to the server

- The room is a Quest's. Its `파티장` is the Quest's Leader, its `멤버` are the Quest's Holders, and its `일정` are the Quest's Sub Quests.
- `활성화` is the domain Party opened for the Quest. Any Holder opens it with `POST /parties` `{ title: <the Quest's title>, capacity: 8, joinPolicy: 'closed', questId }`. Closed keeps out everyone but the Holders, who enter at once by the server's rule, and capacity 8 never stops a Holder.
- The room reads the Party's state from two answers: the User is in it when `GET /parties/mine` names the Quest, and it runs without the User when an entry of `GET /parties` names the Quest. That entry's `leader` names who opened it.
- The two rules of decision 4 live in one module of the quests feature, which every screen asks: who edits Sub Quests (the Leader) and who opens the Party (any Holder).
- `활성화 끄기` ends the Party for every member in one request (`POST /parties/mine/end`), and `파티 없애기` ends the Quest for every Holder in one request (`POST /quests/:questId/end`). The phone never removes members one by one.
- The server stores no decline of a running Party. `거절` is kept on the phone, by the Party's id, and sends nothing.

## Acceptance criteria

### Reaching the room

- [x] The room is a screen above the tabs, at an address that names the Quest, so that the map, the lists, 알림 and the 파티 tab open it. Its app bar has `뒤로` and `파티`.
- [x] A press on a row of the floating Quest list or of the Quest full screen, on any Quest but a Class Quest, opens the room. A Class Quest's row keeps its behaviour.
- [x] On the map, a Quest's card opens the room with its primary button where P06 left `파티 열기` or `참여하기` saying "준비 중이에요". A closed card keeps `길찾기`.
- [x] `활성 파티` opens the room of the Party's Quest. A Party member's card, `파티 열기`, does the same. A Party tied to no Quest (its last Holder dropped it, or its Leader ended it) has no room: the pill then opens the danger dialog `활성화에서 나갈까요?` of the room.
- [x] P19-02's 알림 rows for a running Party and for requests to join open the room, in place of their toasts.
- [x] A Quest the User no longer holds, after a removal, a drop on another phone or the Leader's end of it, closes the room with the toast `파티에서 빠졌어요`.

### The head of the room

- [x] The Badges: `파티 · {holders}/{capacity}명` (tone party) for an Open or Approval Quest, `파티 · {holders}명` for a Closed one, `내가 만든 파티` (warning) when the User leads it, and `🔒 비공개` for a Closed one. Then the title in 22/700. A Quest for a Global Event shows the event's title as an official Badge; ticket 03 makes it the event's card.

### 활성화

- [x] The box (labelled `파티 활성화`) shows one of four states:
  - **None runs**: `아직 활성화하지 않았어요` / `켜면 멤버에게 알림이 가고, 수락한 멤버끼리 위치를 공유해요`, and `파티 활성화` for every Holder.
  - **The User is in it** (green): `활성화 중` / `{n}명이 서로 위치를 공유하고 있어요`, n counting the members who are `visible` and the User, or `멤버의 응답을 기다리는 중이에요` when nobody else is. The Party's Leader has `활성화 끄기`, every other member `활성화에서 나가기` (danger outline). A switch row `내 위치 공유` turns the User's switch for the Party (`PUT /parties/mine/sharing`), showing the change at once and turning back after a failure.
  - **It runs without the User, who has not answered** (the frame's waiting state): `{name}님이 파티를 활성화했어요`, {name} being the `leader` of the Party's entry in `GET /parties`, with `거절` and `참여`. `거절` turns the box to the next state on this phone and stays so for that Party.
  - **It runs without the User, who declined** (grey): `활성화 중인 파티예요` / `나는 참여하지 않는 중 · 위치를 공유하지 않아요`, and `참여`.
- [x] `파티 활성화` opens the confirm sheet `파티를 활성화할까요?` / `멤버 {n}명에게 알림이 가요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.`, n the other Holders, with `취소` and `활성화`. When the User is in another Party, the body adds `한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘{title}’ 활성화에서는 나가게 돼요.`, and confirming leaves it first. When the Lobby's Master Switch is off, the body adds `내 정보에서 위치 공유를 켜야 멤버에게 내 위치가 보여요`. Done: the toast `파티를 활성화했어요 · 멤버 {n}명에게 알림`.
- [x] `참여` enters at once with the toast `활성화에 참여했어요 · 위치 공유 시작`. When the User is in another Party, it first asks `‘{title}’ 활성화에 참여할까요?` / `참여한 멤버끼리 서로 위치를 볼 수 있어요.` with the same line about the other Party, and the button `나가고 참여`.
- [x] `활성화에서 나가기` asks `활성화에서 나갈까요?` / `내 위치 공유가 멈추고 멤버 위치도 볼 수 없어요.` and `파티에는 그대로 남아요.` on the next line, with `취소` and `나가기` (red). Done: `활성화에서 나왔어요 · 위치 공유 멈춤`.
- [x] `활성화 끄기` asks `활성화를 끌까요?` / `모든 멤버의 위치 공유가 멈춰요.` and `파티는 그대로 남아요.`, with `취소` and `끄기` (red). `끄기` sends `POST /parties/mine/end`. Done: `활성화를 껐어요`.
- [x] The refusals, each in Korean with its toast:
  - 409 `PARTY_EXISTS_FOR_QUEST` (another Holder opened it at the same moment): the app enters the Party the body names and says `이미 활성화된 파티에 참여했어요`;
  - 409 `QUEST_ENDED`: `일정이 모두 끝난 파티는 활성화할 수 없어요`;
  - 409 `ALREADY_IN_PARTY`: `이미 다른 활성화에 참여 중이에요`, and the Party is fetched again;
  - 409 `PARTY_FULL`: `활성화 자리가 다 찼어요`;
  - 404 `PARTY_NOT_FOUND`: `활성화가 끝났어요`, and the Parties are fetched again;
  - 403 `NOT_PARTY_LEADER`: `활성화를 켠 사람만 끌 수 있어요`;
  - 404 `NOT_IN_PARTY`: `활성화가 끝났어요`, and the Party is fetched again;
  - anything else, or no answer: `요청하지 못했어요. 다시 시도해 주세요`.

  The words of every refusal of P13 live in one table of the app, which tickets 02 and 03 extend.

### 일정

- [x] The section `일정` lists the Sub Quests on a timeline: a dot, the next one ahead in `#B63A07` with a halo; the time in 12/700 (`17:40`, `18:00–20:00`, or none); what in 15/600; where in 13 muted. A done or ended Sub Quest is dimmed. Empty: `일정 없음`.
- [x] Every Holder marks a Sub Quest ahead done with a check button labelled `완료로 표시`, for themselves (`POST …/done`).
- [x] The Leader alone sees `+ 추가` (labelled `일정 추가`) and, on each Sub Quest but the attending one, ✎ `일정 수정` and ✕ `일정 삭제`. Deleting asks the danger dialog `일정을 삭제할까요?` with `취소` and `삭제`.
- [x] The form opens inline, on a grey box:
  - `내용`, up to 30, placeholder `301동 앞에서 만나기`;
  - `언제`, a button that opens the date·time sheet;
  - `어디서`, the input `직접 입력` with a 50-wide map button `지도에서 선택`;
  - `취소` and `추가` or `수정`, disabled until `내용` and `언제` are filled, and while `어디서` holds a name without a point, with the line `지도에서 위치를 골라 주세요`.

  It sends `{ title, startsAt, place }`: a Place from the map view as `{ placeId }`, or a point as `{ latitude, longitude, label }` with the input's words as the label. An add carries a fresh `Idempotency-Key`, kept for the retries of that one add.
- [x] The **date·time sheet** is a shared bottom sheet that ticket 02 and P14 reuse: `언제` with a preview (`오늘 19:00`); 21 day chips from today (`오늘`, `내일`, then `{요일} {일}`, Sunday in `#C42B2B`, Saturday in `#2A4BA8`); an hour list `00시`…`23시`; a minute list `00분`…`50분` in steps of 10; `확인`. Korea's time throughout.
- [x] The **map view** (`PlacePickerMap`) is a screen above the room: a full-screen map with a fixed teal pin at the centre that lifts while the map moves, a floating back button, the pill `지도를 움직여 핀에 맞추기`, and a bottom sheet. When the camera stops, it asks `GET /places/at`. Inside a Place, the sheet shows `{name} {number}동` and `건물 위치예요`, and the choice is that Place. Near one, `{name} 근처` and `직접 찍은 위치 · 가장 가까운 건물 기준`, and the choice is the point labelled so. At none, `지도에서 고른 위치` with the same hint. `이 위치로 정하기` (teal) returns the choice. It is a screen of its own, so that the Place picker's `지도에서 직접 찍기` (P19-03) and P14's Meetup form open it too. It draws the map through `@/map`, as every screen does.
- [x] The refusals: 409 `LAST_SUB_QUEST` `일정이 하나뿐이라 삭제할 수 없어요`; 409 `ATTENDING_SUB_QUEST` `행사 일정은 바꿀 수 없어요`; 404 `PLACE_NOT_FOUND` `장소를 다시 골라 주세요`; 404 `SUB_QUEST_NOT_FOUND` `이미 삭제된 일정이에요`, with the Quest fetched again; 403 `NOT_QUEST_LEADER` `파티장만 할 수 있어요`.

### 신청, 초대 중, 멤버 and leaving

- [x] **신청 {n}**, for the Leader of an Approval Quest: rows with the Avatar, the name and department, and the time of the request (`10분 전`); `거절` and `수락`. Accepting says `{name}님을 멤버로 추가했어요`; 409 `QUEST_FULL` says `자리가 다 찼어요`. Hidden with no request.
- [x] **초대 중 {n}**, for the Leader: the invitations sent into the Quest (`GET /quests/:questId/invitations`), with the Avatar, the name and department, and the time of the invitation (`10분 전`); `초대 취소` (`DELETE /quests/:questId/invitations/:id`), which says `{name}님 초대를 취소했어요`. 404 `QUEST_INVITATION_NOT_FOUND` says `이미 끝난 초대예요` and fetches the list again. Hidden with no invitation.
- [x] **멤버 {n}** with `{k}자리 남음` for an Open or Approval Quest. While a Party runs and the User is not in it, the lock note `활성화에 참여해야 멤버 위치를 볼 수 있어요`. Rows:
  - the Avatar; the Leader's with a gold ring, a crown and the pill `파티장`;
  - the name and the department;
  - the state in 13, while the User is in the Party: `위치 공유 중` (green) for a member the User sees, `위치 꺼짐` for a member the User does not see, `공유 일시정지` for the User with the switch off, and `응답 대기` (brown) for a Holder not in the Party;
  - for the Leader, on every other row, `내보내기` (red outline), which removes the Holder (`DELETE /quests/:questId/holders/:userId`) and, when the Leader leads the Party and the Holder is in it, also from the Party. Toast `{name}님을 내보냈어요`;
  - for the Leader, on every other row, `파티장 넘기기`, which asks `{name}님에게 파티장을 넘길까요?` with `취소` and `넘기기` and sends `PUT /quests/:questId/leader`. Toast `{name}님이 파티장이 됐어요`.
- [x] A press on a member the User sees closes the room, shows 지도 and selects that member's Avatar with its card, as the Friend list does. A member the User does not see says `{name}님은 위치가 꺼져 있어요`.
- [x] The footer's full-width danger button:
  - `나가기` for every Holder but the Leader. It asks `파티에서 나갈까요?` / `내 파티 목록에서 사라져요.`. Confirming leaves the Party first when it is the Quest's, then drops the Quest. Toast `파티에서 나왔어요`.
  - `파티 없애기` for the Leader, who hands the role over first to leave without ending the Quest. It asks `파티를 없앨까요?` / `파티가 사라지고 모집글도 내려가요.`, with ` 활성화 중이라 위치 공유도 바로 멈춰요.` added while the User is in its Party. Confirming first ends the Party when the User leads it (`POST /parties/mine/end`) or leaves it when the User is only in it, then ends the Quest for every Holder (`POST /quests/:questId/end`). Toast `파티를 없앴어요`.

  Both go back to where the room was opened from.

### On the map

- [x] A Party member's Avatar moves as `position` messages arrive, as P06-12 built, and leaves on `position-removed`. A member who is also a Friend shows once, as the Friend.
- [x] An Avatar, a Friend's or a member's, whose `measuredAt` is older than 2 minutes is dimmed, and its card's line says `마지막 위치 {n}분 전`. At 10 minutes it is removed. The age is checked again every 15 seconds and when a position arrives. The dimmed look is a marker image of its own, made as the others are.
- [x] `활성 파티` and its words stay as P06 built them: `{n}명 공유 중` or `응답 대기`.
- [x] `quests-changed` fetches the open room's Quest, its requests to join and, for the Leader, its invitations again; `party-changed` fetches the Parties again (P06-12 and P19-02 already map both).

### Records and checks

- [x] P06's `todo.md` §3 gains a row for each new operation with its route, and §4 loses the controls this ticket connects. `mobile/README.md` ("Screens and the flow between them", "Data") describes the room, 활성화, the dimming and the map view.
- [x] Jest tests, through `startApp` on the real routes, against the fake server and the fake socket of `__tests__/support/`:
  - each way into the room listed above;
  - the four 활성화 states with the Leader's name, `거절` kept after the room is opened again, opening with and without another Party, `PARTY_EXISTS_FOR_QUEST` leading into the existing Party, entering, leaving, `활성화 끄기` with the one request it sends, and each refusal's words;
  - the sharing switch, turned and failed;
  - 일정: the Leader adding with the date·time sheet and the map view (the `Idempotency-Key`, the body sent), editing, deleting with each refusal; another Holder seeing no edit control; marking done;
  - 신청: accepting, declining, `QUEST_FULL`;
  - 초대 중: the list, `초대 취소`, `QUEST_INVITATION_NOT_FOUND`, hidden for another Holder;
  - 멤버: each state, `내보내기`, `파티장 넘기기`, a press moving the map;
  - `나가기` and `파티 없애기` with the requests they send, with the User leading the Party, only in it and in none, and the room closing when the User is removed elsewhere or the Quest is ended;
  - an Avatar appearing, moving, dimming after 2 minutes with its line, disappearing at 10 minutes, and on `position-removed`, with fake timers.
- [x] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - `거절` kept on the phone only: the server stores no decline, so another phone of the User shows the waiting state again;
  - `파티 채팅`;
  - the member's walking time (`· 301동까지 도보 8분`);
  - the words the frame does not draw: `완료로 표시`, `파티장 넘기기`, the switch row, the refusals, the Master Switch line, `지도에서 위치를 골라 주세요`, the toast of `초대 취소`;
  - the Party features without a frame, which are not built: a Party tied to no Quest, entering a Friend's Party, requests to enter and invitations into a Party, and its settings (P13 spec, stories 21, 22, 24 and 34 to 38 for Parties).
- [ ] Screenshots of the web target are in the pull request under Test Results, compared with the frames: each 활성화 state, the 일정 form, the map view, a dimmed Avatar.
- [x] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### Differences from the frame

- `거절` is kept on the phone only, by the Party's id: the main server stores no decline, so another phone of the User
  shows the waiting state again.
- No `파티 채팅`: conversation inside a Party is out of P13's scope.
- No walking time on a member's row (`· 301동까지 도보 8분`): no answer holds it.
- Words the frame does not draw: `완료로 표시`, `파티장 넘기기` with its dialog, the switch row `내 위치 공유`, the
  refusals, the Master Switch line of the opening sheet, `지도에서 위치를 골라 주세요`, `파티에서 빠졌어요`,
  `{name}님은 위치가 꺼져 있어요` in the room and `마지막 위치 {n}분 전`.
- The Party features without a frame are not built: a Party tied to no Quest (only leaving one, from `활성 파티`),
  entering a Friend's Party, requests to enter and invitations into a Party, and its settings (P13 spec, stories 21,
  22, 24 and 34 to 38 for Parties).
- Opening while in another Party always leaves it, with the line `지금 참여 중인 ‘{title}’ 활성화에서는 나가게 돼요`;
  the frame says `내가 켠 ‘…’ 활성화는 꺼져요` when the User leads it. Leaving passes the Party's lead on, and the
  main server has no single request that does both.
- ` 활성화 중이라 위치 공유도 바로 멈춰요.` is added to both leaving sheets while the User is in the Quest's Party;
  the frame adds it whenever one runs. A User outside it shares nothing that would stop.
- `파티 없애기` says `파티가 사라지고 모집글도 내려가요.` for every Quest, as the ticket says; the frame says
  `파티가 사라져요.` for a private one.
- `초대 중` rows show when the invitation was sent (`10분 전`), as the ticket says, where the frame writes `응답 대기`.
- The opening sheet leaves out `멤버 {n}명에게 알림이 가요.` and the toast `· 멤버 {n}명에게 알림` when the User holds
  the Quest alone, as the frame's logic does.
- The map view's pill has the design system's `route` icon, not the frame's four arrows, and its pin is the `pin`
  icon in teal, not the frame's drawn teardrop.
- The room's app bar is the shared sub-screen one: `파티` in 20/700, where the frame draws 18/600.
- A dimmed Avatar is drawn at 45% opacity; no frame draws one.

### Result (2026-10-06)

The frames `Party` (the room, its sheets and the 일정 form, the date·time sheet) and `PlacePicker` (the map view) were
read in the copy of the canvas at version `1791265989-e23c`.

Where things are, in `mobile/`:

- Routes: `src/app/(signed-in)/room/[questId].tsx` and `place-map.tsx`, both sliding from the right.
- `src/screens/room/`: `room-screen.tsx` (the head, the footer, closing when the Quest is gone), `activation-box.tsx`,
  `plan-section.tsx` and `plan-form.tsx`, `people-sections.tsx` (신청, 멤버, 초대 중), `confirm-sheet.tsx`,
  `use-room-actions.ts` (every request with its toast). `src/screens/date-time-sheet.tsx` is the shared sheet;
  `src/screens/place-map/place-map-screen.tsx` the map view.
- `src/features/quests/`: `rules.ts` (decision 4), `refusals.ts` (the one table of refusal words), `room-adapter.ts`,
  `use-room.ts`. `src/features/parties/declined.ts` (`거절` on the phone), `src/features/places/` (the map view's
  answer and the hand-back of its choice).
- `src/api/`: `room-types.ts`, `server/room-client.ts`, `mock/room.ts`, `idempotency-key.ts`; `http.ts` takes headers.
  `questQuery` lives under the Quests' key, so `quests-changed` fetches the open room's Quest; `sent-invitations` was
  added to `quests-changed`.
- The map: `CardMark` of a person has `stale`, the look `person:…:stale` and `MapPerson`'s `stale`; `useMapCards()`
  ages the positions every 15 s; the card's `primary` has the actions `room` and `active-party`;
  `use-active-party-room.tsx`; the main screen reads `?person=`.
- Tests: `room-activation-test.tsx`, `room-joining-test.tsx`, `room-plan-test.tsx`, `room-people-test.tsx`,
  `map-ageing-test.tsx`, with `support/room.ts`; the ways in turned the not-ready cases of `main-controls-test`,
  `main-card-test`, `quests-screen-test` and `notifications-test` into openings of the room. The fake server records
  the `Idempotency-Key`.

Decisions made while building:

- The room is reached for every Quest but a Class Quest; the open Party card's `파티 열기` and `참여하기` both open it.
  A Party member's `파티 열기` does what `활성 파티` does.
- Every refusal and every success fetches the Quest, the Parties, the positions, the requests and the invitations
  again, so one rule covers each "fetched again" of the ticket.
- After `나가기` or `파티 없애기` the room goes back before the Quest's 404 could close it a second time.
- A Place chosen on the map is sent as `{ placeId }` while its words stay; changed words send it as a point with
  those words. Emptying the words drops the choice.
- The age of a position is counted against the later of the phone's clock and the last check, so a position that
  arrives is judged at once.

Checks: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. The whole `pnpm test` ran once: the map's
repeating age check made `settle()` of `__tests__/support/queries.tsx` run timers forever, so it now lets 5 s pass;
`screen-data-test` follows the card's new actions; both then passed alone. `position-sending-test` failed 5 tests in
the whole run and passed alone; CI is the final check.

Not checked: nothing ran in a browser, on a phone or against a running main server, so the screenshots the ticket asks
for are still to be taken. The slide of the screens, the sheet's drag and the pin's lift on a real map were not seen.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 2 hours of agent time in one session. Tokens: about 22 M input, of
which about 21 M cache reads and 0.8 M cache writes, and about 0.2 M output. No subagents.
