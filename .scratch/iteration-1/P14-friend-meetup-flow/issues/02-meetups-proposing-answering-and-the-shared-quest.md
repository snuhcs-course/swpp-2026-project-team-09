# 02: Meetups: proposing to a Friend, answering under 초대, and the Shared Quest

Parent: [P14 spec](../spec.md)
Status: ready-for-agent
Blocked by:

- P19's ticket 01 (The shell, the shared components, the Quest full screen and the Friend panel);
- the P13 ticket that builds the 파티 tab's 초대 tab;
- the P13 ticket that builds a Quest's room, if that is a separate ticket.

## What to build

A User proposes a Meetup to one Friend from the Friend's row in the Friend panel or from the Friend's card on the map. The proposal has a title, a place, a start time and an optional end time. The place is chosen from the list of Places or by pointing on the map.

The Friend sees the proposal under the 파티 tab's `초대` and accepts or declines it. The proposer sees the Meetups they sent there too, each with its state, and withdraws one while it waits. A sent Meetup cannot be edited, and the screen says so.

An accepted Meetup is a Shared Quest that both Friends hold: it appears in both Quest lists and in both 내 파티 tabs, and either Friend cancels it from its room. Proposals, answers and withdrawals appear on both phones without a press, through `meetups-changed` and `quests-changed`.

On screen a Meetup is a `파티 초대`, as the frames call what a User is invited to. In code and documents it is a Meetup. Words marked "(new)" are not in any frame. Every other word is the frame's, verbatim.

The frames:

- `PartyAppt`: the 파티 만들기 form opened from a Friend, in its `비공개` arrangement with that Friend chosen. The Meetup form follows it with the fields a Meetup has;
- `PlacePicker`, `PlacePickerMap` and `PlacePickerEmpty`: 장소 선택 in its event mode, list and map;
- `PartyInvites`: the 초대 tab's received cards;
- `MainFriends` and `Main`: the calendar button on a Friend's row, and `파티 만들기` on the Friend's card.

The server routes, all served already (`main-server/README.md`, "Meetup", "Places" and "Quests"):

- `POST /meetups`, which needs an `Idempotency-Key`;
- `GET /meetups`;
- `POST /meetups/:id/accept|decline|withdraw`;
- `GET /places`, `GET /places/search?q=` and `GET /places/at`;
- `GET /quests` and `DELETE /quests/:questId`, through P13's screens;
- the socket's `meetups-changed` and `quests-changed`.

Each new operation goes into the API client with its mock, which keeps Meetups in memory, computes `expired` from the app's clock, makes the Shared Quest on accepting and refuses as the main server does. P19's ticket 02 also reads `GET /meetups`. The app has one operation and one query for it, which whichever ticket lands first adds. `GET /places` and `GET /places/search` belong to P19's ticket 03. Whichever of P19's ticket 03, P13's Sub Quest form and this ticket lands first adds them, with the Place picker.

## Acceptance criteria

### Opening the form

- [ ] The calendar button on a Friend's row in the Friend panel, `{이름}님과 파티 만들기`, closes the panel and opens the form for that Friend. It replaces the toast P19's ticket 01 left.
- [ ] `파티 만들기` on a Friend's card on the map opens the form for that Friend. It replaces the card's toast.
- [ ] The form is a screen above the tabs. Closing it, or sending, returns to the map as it was.

### The Meetup form (`PartyAppt`)

- [ ] It has ✕ `닫기` and `파티 만들기`, and these fields in order:
  - `제목`, up to 30 characters, with the placeholder `제목`;
  - `언제`, a button reading `날짜·시간 선택` or the chosen start. It opens the date·time sheet: `언제` with its preview, 21 day chips from today, `00시`…`23시`, `00분`…`50분` in steps of 10, and `확인`;
  - `끝나는 시간` (new), optional: a button reading `선택 안 함` (new) or the chosen end. It opens the same sheet titled `끝나는 시간` (new), and the chosen end has ✕ `끝나는 시간 빼기` (new);
  - `어디서`: a button reading `장소 선택` or the chosen place, which opens 장소 선택's list, and beside it the 50-wide map button `지도에서 선택`, which opens 장소 선택's map;
  - `친구 초대` with the hint `1명에게 요청`: the one Friend, as a selected chip that cannot be removed. There is no friend search or list.

  The date·time sheet is shared with P13's forms. Whichever lands first makes it a shared part, and the other uses it.
- [ ] `사진`, `관련 행사`, `본문`, `인원`, `공개 범위`, `게시판` and `태그` are not shown: a Meetup has none of them.
- [ ] The footer's `파티 만들기` (52, navy) stays disabled until the form has a title, a start and a place. Before it sends:
  - a start that has passed shows `시작 시간이 지났어요. 다시 골라 주세요` (new);
  - an end not after the start shows `끝나는 시간이 시작 시간보다 늦어야 해요` (new) under the field.
- [ ] Sending posts `POST /meetups` with `receiverId`, `title`, `startsAt`, `endsAt` when chosen, and `place`. The place is `{ placeId }` for a Place, or `{ latitude, longitude, label }` for a point. The form keeps one `Idempotency-Key` until the main server answers, so that a retry after no answer cannot propose twice.
- [ ] On success the form closes, and the toast says `{이름}님에게 파티 초대를 보냈어요` (new). The refusals keep the form open:
  - 400 `MEETUP_START_PASSED`: `시작 시간이 지났어요. 다시 골라 주세요` (new);
  - 404 `FRIEND_NOT_FOUND`: `{이름}님과 더 이상 친구가 아니에요` (new);
  - 404 `PLACE_NOT_FOUND`: `장소를 다시 골라 주세요`, the timetable form's words;
  - no answer or another failure: `보내지 못했어요. 다시 시도해 주세요` (new).

### 장소 선택 in its event mode (`PlacePicker`, `PlacePickerMap`, `PlacePickerEmpty`)

- [ ] The list is the picker of P19's ticket 03: `뒤로`, `장소 선택`, the search `건물 이름, 동 번호` (`장소 검색`, ✕ `검색어 지우기`), and the rows `장소 목록` with the name and `{number}동`. The event mode adds the first row `지도에서 직접 찍기` (teal, map icon) while the search is empty.
- [ ] A search that finds nothing shows `‘{q}’에 맞는 장소가 없어요`, `건물 이름이나 동 번호로 다시 찾거나, 지도에서 직접 찍어 보세요` and the outlined button `지도에서 직접 찍기`.
- [ ] The map view is a full-screen `<Map>` from P06's map component, a second map view while 지도's stays mounted. It has:
  - a teal pin fixed at the centre, which lifts while the map moves;
  - the floating `뒤로` and the pill `지도를 움직여 핀에 맞추기`;
  - a bottom sheet with a pin icon in a teal circle, the place's name, its hint, and `이 위치로 정하기` (teal, 52).

  It opens on the User's position when known, else on the campus.
- [ ] Each time the camera stops, the app asks `GET /places/at` for the centre:
  - `inside`: the name reads `{name} {number}동`, or the name alone without a number, and the hint `건물 위치예요`. Choosing it gives the Place, `{ placeId }`;
  - `near`: `{name} 근처` and `직접 찍은 위치 · 가장 가까운 건물 기준`. Choosing it gives the point with the label `{name} 근처`;
  - `none`: `지도에서 고른 위치` (new) and `직접 찍은 위치` (new). Choosing it gives the point with that label.

  While the answer is on its way, `이 위치로 정하기` is disabled. Opened from the list's row it goes back to the form, as does the list's choice.

### Received Meetups under 초대 (`PartyInvites`)

- [ ] Under `받은 초대 · {n}` the tab lists the Quest invitations (P13), then the Meetups proposed to the User that are still `proposed`, in the main server's order. n counts both, and so does the tab's red count pill `초대 {n}`.
- [ ] A Meetup's card has:
  - the proposer's Avatar and `{name}님이 비공개 파티에 초대했어요`;
  - the title in 18/600;
  - the meta `{when} · {place}`, where `{when}` reads as the date·time sheet's preview does (`내일 12:10`), with `–{end}` when the Meetup has an end;
  - the note `파티장이 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.`, the words of the join sheet;
  - `거절` (secondary) and `수락` (primary).
- [ ] `수락` sends `POST /meetups/:id/accept`, and the toast says `파티에 참여했어요`. The Meetup leaves the list, and the Shared Quest arrives with `quests-changed`. `거절` sends `POST /meetups/:id/decline`, and the card goes without a toast, as in the frame.
- [ ] A 409 `MEETUP_NOT_PROPOSED` or a 404 `MEETUP_NOT_FOUND`, a Meetup withdrawn or expired meanwhile, shows `이미 취소됐거나 지난 초대예요` (new) and fetches the Meetups again.
- [ ] With neither invitations nor Meetups, the tab shows P13's empty state, `받은 초대가 없어요`.

### Sent Meetups

- [ ] Below the received ones, under `보낸 초대 · {n}` (new), the tab lists the Meetups the User proposed, except those withdrawn and those whose start passed more than 7 days ago. Under the header is the note `보낸 초대는 고칠 수 없어요. 바꾸려면 초대를 취소하고 다시 보내 주세요.` (new).
- [ ] A card has:
  - the receiver's Avatar and `{name}님에게 보낸 초대` (new);
  - the title;
  - the meta, as above;
  - the state as a Badge: `응답 대기` for `proposed` (tone warning), `수락함` (new) for `accepted` (tone live), `거절함` (new) for `declined` (tone neutral) and `기간 지남` (new) for `expired` (tone neutral).
- [ ] While the Meetup is `proposed`, the card has `초대 취소`. It sends `POST /meetups/:id/withdraw`, and the toast says `{name}님 초대를 취소했어요`, the words of the room's 초대 중. A 409 `MEETUP_NOT_PROPOSED`, a Meetup answered meanwhile, shows `이미 답한 초대예요` (new) and fetches the Meetups again.
- [ ] The section is left out when nothing is in it.

### The Shared Quest

- [ ] An accepted Meetup's Quest is shown by the screens that show every Quest, and this ticket adds nothing to them:
  - the floating Quest list and the Quest full screen, with the kicker `비공개 파티 · {the Friend}` (P19's ticket 01);
  - 내 파티 and the Quest's room (P13).
- [ ] Either Friend cancels it from its room's footer (P13): `파티 없애기` for the proposer, who leads it, and `나가기` for the other. Both drop it through P13's code. This ticket adds no control there.
- [ ] Refresh:
  - `meetups-changed` fetches the Meetups again, and the app's signal table (`live-updates.tsx`) gains it;
  - `quests-changed` fetches the Quests again, as today;
  - both are fetched when the connection opens again and when the app returns to the front.

### Records and checks

- [ ] P06's `todo.md` §3 gains a row for each new operation, with its route. §4 loses the calendar button and the card's `파티 만들기`. `mobile/README.md` ("Screens and the flow between them", "Data") describes the Meetup form, 장소 선택's map, and the Meetups under 초대.
- [ ] Jest tests through `startApp` on the real routes:
  - against the mocks:
    - the form opened from the panel's button and from the card;
    - the disabled `파티 만들기`, the start in the past, the end before the start, and the end added and removed;
    - a Place chosen through search and through the map, with each of `inside`, `near` and `none`;
    - the sent toast;
  - against the fake server and the fake socket (`mobile/__tests__/support/`):
    - `POST /meetups` with its body, a Place and a point, and its `Idempotency-Key`, kept across a retry after no answer;
    - each refusal of proposing, accepting, declining and withdrawing, with its words;
    - a received Meetup accepted: the toast, the card gone, and after `quests-changed` the Quest in the floating Quest list and the Quest full screen as `비공개 파티 · {the Friend}`;
    - a received Meetup declined;
    - a sent Meetup withdrawn;
    - a sent Meetup's Badge going from `응답 대기` to `수락함`, `거절함` and `기간 지남` as `meetups-changed` arrives;
    - the other Friend's drop of the Quest arriving as `quests-changed` and changing this User's row;
    - this User's drop through the room's footer.
- [ ] Two Users on the emulator and a phone against the main server: one proposes from the Friend panel, the other accepts under 초대, and both see the Quest in their Quest lists. This is recorded under Comments, with a screenshot in the pull request.
- [ ] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - the form's fields that a Meetup lacks, and the one fixed Friend in place of the friend list;
  - `어디서` without free text, since the main server takes a Place or a point;
  - `끝나는 시간`;
  - the sent toast in place of `비공개 파티를 만들었어요 · 1명에게 초대 요청`, since nothing is made until the Friend accepts;
  - the received card without `{ago}` (a Meetup has no time of sending) and without its body (a Meetup has none);
  - the sent section and its note;
  - every word marked (new).
- [ ] Screenshots of the web target are in the pull request under Test Results, each compared with its frame: the form, 장소 선택's list and map, and the 초대 tab with received and sent Meetups.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.
