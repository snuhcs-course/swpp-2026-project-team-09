# 02: The 파티 tab: recruiting Quests, the boards, 파티 만들기, 내 파티 and 초대

Parent: [P13 spec](../spec.md)
Status: ready-for-human
Blocked by: 01 (The 파티 room, its 활성화, and the members on the map), P08-16 (Recruiting boards, the Quest's description, and the Leader's endings)

## What to build

The 파티 tab, which P19-01 left as a frame with empty bodies, becomes the frame's `Party`. A User finds Quests that gather people, on `찾기` and on the boards of `전체 파티`, reads a recruiting post, and joins it or asks to. A User makes a Quest with `+ 만들기`: in public, posted on a board for anyone to join, or in private, for the Friends the User invites. `내 파티` lists the User's Quests with their next step and their 활성화, and `초대` lists the invitations into Quests, which the User accepts or declines. Every card leads to the Quest's room of ticket 01, and the room gains its recruiting parts.

The frames are `Party` (찾기 with 전체 파티, its boards and `파티 모집글`), `PartyPost`, `PartyJoin`, `PartyMine`, `PartyInvites`, `PartyCreate`, and `PartyAppt` for the form's 비공개 mode.

The server routes:

- `GET /quests/recruiting` and `?board=` (P08-16), `GET /quests` (with `board`, `description` and `createdAt`);
- `POST /quests/:questId/join`;
- `POST /quest-join-requests`, `GET /quest-join-requests`, `POST /quest-join-requests/:id/withdraw`;
- `POST /quests/own` with its `Idempotency-Key`, `PATCH /quests/:questId` with `board` and `description`, and `POST /quests/:questId/end` for `없애기`;
- `POST /quests/:questId/invitations`, `GET /quest-invitations` (P19-02 adds it to the client), `POST /quest-invitations/:id/accept` and `/decline`;
- `GET /friends`, read for `친구 초대`;
- on the socket, `quests-changed`, which now also fetches the recruiting Quests, the User's requests to join and the invitations again.

Each new operation goes into the API client with its mock. The mock's recruiting Quests take the frame's posts on the four boards, so that the tab looks like the frame against the mocks.

## How the tab maps to the server

- `공개` is an Open or an Approval Quest, posted on a board; `비공개` is a Closed Quest. The form's 공개 mode offers both policies as the chips `바로 참여` (Open, the default) and `승인 후 참여` (Approval), which the frame does not draw.
- `참여하기` joins an Open Quest at once and sends a request to an Approval one.
- A post on a board is a recruiting Quest of another User (`GET /quests/recruiting?board=`) or one of the User's own Open or Approval Quests on that board with a Sub Quest ahead (`GET /quests`), since the recruiting list leaves out the Quests the reader holds. Both are ordered by `createdAt`, the newest first.
- A private Quest is made with capacity 8, so that the Leader can invite more Friends later, and the Friends chosen are invited one by one once it is made.

## Acceptance criteria

### The tab

- [x] The app bar's `+ 만들기` opens 파티 만들기, in place of its toast.
- [x] The tabs show their counts: `내 파티 {n}` in a grey pill, n the User's Quests that are not Class Quests, and `초대 {n}` in a red pill, n the invitations waiting. P14 adds the Meetups to `초대`.

### 찾기

- [x] The search field `파티 검색` filters `모집 중인 파티` on the phone, by title and description.
- [x] The section `모집 중인 파티` with `전체 보기 ›` lists the recruiting Quests, the newest first. A card has:
  - the Badge `파티` (tone party), the Global Event's title as an official Badge when it has one, and the fill `{holders}/{capacity}명` in `#B63A07` on the right;
  - the title in 18/600 and the description in two lines of 14;
  - the clock line with the next Sub Quest's time (`오늘 19:30`, or `시간 미정`) and the pin line with its place (or `장소 미정`);
  - the Leader's Avatar and `{Leader}`, or `{Leader} 외 {n}명`, and `자세히 ›`, which opens the post;
  - `참여하기` (primary), which opens the join confirm sheet, or `참여 신청` for an Approval Quest.

  Empty: `결과 없음`.
- [x] **전체 파티** is a screen above the tabs with `뒤로` and `전체 파티`, listing the four boards: `식사 게시판` (`meal`), `진로 게시판` (`career`), `취미 게시판` (`hobby`), `공연 게시판` (`show`). A row has the board's icon, its name, its count of posts, the `N` mark when a post was made today (Korea's date), and a chevron.
- [x] **A board** is a screen with `뒤로`, `{name} 게시판` and `최신순`. A post has:
  - the Leader's name and department and when it was posted: `13:21` today, `10/03 (토) 15:57` before;
  - the Badge `내 파티` when the User leads it, `참여 중` when the User holds it;
  - the title in 17/600, the description in two lines, the meta `오늘 18:30 · {place}`, and the fill.

  A press opens the room for the User's own Quest and the post for another's. Empty: `아직 모집글이 없어요`.
- [x] **파티 모집글** is a screen with `뒤로` and `파티 모집글`:
  - a card with the Leader's Avatar, `{name} · 모집자`, `{department} · {ago}`, the fill, the title in 22/700 and the description in 15;
  - a card with the clock `{time}`, the pin `{place}` and the users line `{Leader} 외 {n}명`;
  - a footer, by who reads it:
    - not a Holder, Open: `참여하기`;
    - not a Holder, Approval: `참여 신청`, or, while the User's request waits, the note `참여 신청을 기다리는 중이에요` with `신청 취소`;
    - the Leader: `없애기` and `수정하기`. `없애기` asks `파티를 없앨까요?` / `모집글과 파티가 함께 사라져요.` with `취소` and `없애기`, and ends the Quest as the room's `파티 없애기` does, with `POST /quests/:questId/end` for every Holder. `수정하기` opens the form in its edit mode;
    - another Holder: the grey note `이미 참여 중인 파티예요`.
- [x] **The join confirm sheet** (users icon): `‘{title}’에 참여할까요?`, the rows 일정, 장소 and 멤버 (`{Leader} 외 {n}명 ({holders}/{capacity}명)`), the note `멤버가 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.`, and `참여하기` with `취소`. Joining says `{title} 참여 완료` and shows `내 파티`. For an Approval Quest the button is `참여 신청`, and the toast `참여를 신청했어요`.

### 파티 만들기 (`PartyCreate`, `PartyAppt`)

- [x] It is a screen above the tabs, with `뒤로` and `파티 만들기`, `파티 수정` or `모집글 수정`. The fields, in order:
  - `제목`, up to 30;
  - `본문`, a text area with `{n}/200`;
  - `언제`, `날짜·시간 선택`, which opens ticket 01's date·time sheet;
  - `인원`, a stepper `−  {n}명  +` from 2 to 8, public only;
  - `어디서`, the input `직접 입력` and the map button `지도에서 선택`, as ticket 01's 일정 form;
  - `공개 범위`, the radio `👥 공개` / `🔒 비공개` with the hint `찾기에 올라가요` / `초대한 친구만 볼 수 있어요`; under 공개, the chips `바로 참여` and `승인 후 참여`;
  - `게시판`, public only: `게시판 선택`, which opens a bottom sheet of the four boards, then `{name} 게시판`; the hint `모집글이 올라갈 곳`;
  - `친구 초대`: the hint `선택`, `1명 이상` (private) or `{n}명에게 요청`; the chosen Friends as removable chips; the search `친구 검색`; the list of Friends (`GET /friends`) with the Avatar, the name, the department and a check. At most 7 in private, and the capacity minus one in public.
- [x] Submitting (52):
  - `파티 올리기`, public, enabled with a title, a description and a board: `POST /quests/own` with `{ title, description, board, capacity, joinPolicy, subQuest: { title, startsAt, place } }` and a fresh `Idempotency-Key`. Toast `파티를 올렸어요`.
  - `파티 만들기`, private, enabled with a title and one Friend at least: the same with `joinPolicy: 'closed'`, capacity 8 and no board. Toast `비공개 파티를 만들었어요 · {n}명에게 초대 요청`.
  - Then each chosen Friend is invited. A refused invitation adds `{n}명은 초대하지 못했어요` to the toast.
  - Then the tab shows `내 파티`.
- [x] The edit mode, from the post's `수정하기` and from the room's `수정` (below), holds the title, the description, the capacity, the Join Policy, the board and `친구 초대`. `언제` and `어디서` are changed in the room's 일정. `수정 완료` sends `PATCH /quests/:questId` with what changed and invites the newly chosen Friends. Toast `모집글을 수정했어요`.
- [x] The refusals: 409 `CAPACITY_BELOW_HOLDERS` `지금 멤버 수보다 적게 정할 수 없어요`; 409 `BOARD_REQUIRED` `게시판을 골라 주세요`; 403 `NOT_QUEST_LEADER` `파티장만 할 수 있어요`; 404 `PLACE_NOT_FOUND` `장소를 다시 골라 주세요`; on inviting, 404 `FRIEND_NOT_FOUND`, 409 `QUEST_INVITATION_ALREADY_SENT` and 409 `ALREADY_HOLDER` counted as not invited; anything else `저장하지 못했어요. 다시 시도해 주세요`, the form staying open.

### 내 파티 (`PartyMine`)

- [x] The chips `전체 N`, `비공개 N` and `공개 N`.
- [x] The groups, with 12 grey headers: first `활성화 중` (the Quest whose Party the User is in; its card has a navy border of 2 with a glow) and `활성화 알림` (Quests whose Party runs without the User), then by the next Sub Quest's day in Korea's time, `오늘`, `내일`, `이번 주`, `다음 주`, `그 이후`, and `시간 미정`.
- [x] A card, tinted `#ECEEF3` when private and `#EFF6FE` when public:
  - the kind pill `🔒 비공개 파티` or `👥 공개 파티`;
  - the Badge `멤버 {n}명` (private), `모집 중 · {holders}/{capacity}명` (public), or `활성화 중 · {n}명 위치 공유` (tone live) while a Party runs; the Global Event's Badge when there is one;
  - the title in 18/600;
  - the next box: a route icon in a circle, `{time} · {n}분 후` (or the day and time) and the next Sub Quest's title and place;
  - the Avatars of the Holders and `나, {name} 외 {n}명`;
  - while a Party runs without the User, the navy strip `{name}님이 활성화했어요`, {name} being the `leader` of the Party's entry in `GET /parties`, with `참여`, which enters as the room's `참여` does.

  A press opens the room. Empty: `참여 중인 파티가 없어요`, `비공개 파티가 없어요`, `참여 중인 공개 파티가 없어요`.

### 초대 (`PartyInvites`)

- [x] `받은 초대 · {n}`, then a card per invitation (`GET /quest-invitations`): the Leader's Avatar, `{name}님이 비공개 파티에 초대했어요` for a Closed Quest or `{name}님이 파티에 초대했어요` for another, and `{ago}`; the title in 18/600; the description in two lines; the meta `{holders}명 참여 중`; `거절` and `수락`.
- [x] `수락` makes the User a Holder and says `파티에 참여했어요`; `거절` declines and removes the card. The refusals: 404 `QUEST_INVITATION_NOT_FOUND` `이미 끝난 초대예요`; 409 `QUEST_FULL` `자리가 다 찼어요`; 409 `QUEST_ENDED` `이미 끝난 파티예요`; 409 `SHARED_QUEST_HELD` `이 행사에 함께 가는 파티가 이미 있어요`. The invitation stays after a refused acceptance, as the server keeps it.
- [x] Empty: the users icon and `받은 초대가 없어요`.

### Joining and asking, wherever they start

- [x] The refusals of joining and asking, added to ticket 01's table: 409 `QUEST_FULL` `자리가 다 찼어요`; 409 `QUEST_ENDED` `이미 끝난 파티예요`; 409 `SHARED_QUEST_HELD` `이 행사에 함께 가는 파티가 이미 있어요`; 409 `ALREADY_HOLDER` `이미 참여 중인 파티예요`; 404 `QUEST_NOT_FOUND` `파티를 찾을 수 없어요`; 409 `QUEST_NOT_OPEN` and `QUEST_NOT_APPROVAL` `참여 방식이 바뀌었어요. 다시 확인해 주세요`; 409 `QUEST_JOIN_REQUEST_ALREADY_SENT` `이미 참여를 신청했어요`; 404 `QUEST_JOIN_REQUEST_NOT_FOUND` `이미 끝난 신청이에요`. After each, the recruiting Quests and the User's Quests are fetched again.

### The room's recruiting parts

- [x] The room's app bar gains `모집글 보기` for an Open or Approval Quest, which opens its post, and `수정` for the Leader.
- [x] Under the title, a non-empty description shows in a quote box.

### Records and checks

- [x] P06's `todo.md` §3 gains a row for each new operation, and the 파티 tab's "준비 중이에요" bodies of P19-01 are gone. `mobile/README.md` describes the tab, the boards and the form.
- [x] Jest tests, through `startApp`, against the fake server and the fake socket:
  - 찾기: the cards, the search, the empty state, `참여하기` through the sheet for an Open and an Approval Quest;
  - 전체 파티: the counts and the `N` mark; a board merging the User's own posts with the others', newest first, with their Badges; the empty board;
  - the post: each footer, withdrawing a request, `없애기` with the request it sends;
  - 파티 만들기: public and private, the enabled rules, the bodies and the `Idempotency-Key` sent, the invitations and a refused one, the edit mode with a `PATCH` of what changed, each refusal;
  - 내 파티: the chips, each group, each Badge, the strip with the Leader's name and its `참여`;
  - 초대: accepting, declining, each refusal, the empty state;
  - each joining refusal's words;
  - `quests-changed` through the fake socket changing 찾기, 내 파티 and 초대.
- [x] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - the official banners, `같이 할 사람을 찾는 중`, `관심 없음` with its hidden count, `추천 이유`, the `공식` tab of 전체 파티 and `공식 모집`;
  - `사진` and `태그`;
  - the capacity from 2 to 8, the main server's limit;
  - the chips `바로 참여` and `승인 후 참여`, and the confirm sheet's note naming any member, by decision 4;
  - `친구 1명 포함` and the Holders' Avatars on others' posts, which the recruiting entry does not hold;
  - the invitation's meta without a time and a place, which the invitation does not hold;
  - the groups `다른 활성 파티` and `지난 일정`;
  - `언제` and `어디서` absent from the edit mode;
  - `관련 행사`, which ticket 03 adds.
- [ ] Screenshots of the web target are in the pull request under Test Results, compared with the frames.
- [x] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### Differences from the frame

- Not built, by decisions 9 and 10, as no route serves them: the official banners, `같이 할 사람을 찾는 중`, `관심 없음`
  with its hidden count, `추천 이유`, the `공식` tab of 전체 파티 and `공식 모집`.
- No `사진` and no `태그`: the Quest has no field for them.
- `인원` runs from 2 to 8, where the frame runs to 12: the main server's limit.
- The chips `바로 참여` and `승인 후 참여`, which the frame does not draw, choose the public Quest's Join Policy. The
  confirm sheet's note says `멤버가 파티를 활성화하면` where the frame says `파티장이`: any Holder opens the Party, by
  decision 4.
- A post shows the Leader's Avatar alone and `{Leader} 외 {n}명` without `· 친구 1명 포함`: the recruiting entry holds
  the Leader and the count of Holders, not the others.
- An invitation's meta is `{n}명 참여 중`, without a time and a place and `{name} 함께`: the invitation does not hold
  them.
- 내 파티 has no `다른 활성 파티` and no `지난 일정`: no answer lists others' running Parties, and `GET /quests` leaves out
  a Quest whose Sub Quests have all ended. The strip is always the navy one with `참여` alone: `거절` and the light
  strip `활성화 중 · 참여하지 않는 중` stay in the room, where the decline is kept.
- The edit mode has no `언제` and no `어디서`: the room's 일정 changes the Sub Quests.
- No `관련 행사`: ticket 03 adds it.
- Words the frame does not draw: the post's footer `참여 신청`, `참여 신청을 기다리는 중이에요` with `신청 취소`, the
  toast `참여를 신청했어요`, the refusals, and `지도에서 위치를 골라 주세요` under `어디서`, as the room's 일정 form says it.
- The post's footer for a Leader has no note (`내가 만든 파티예요 · 참여 요청을 기다리는 중`), and a private Quest has
  no post, so `비공개 파티 · 초대한 친구만 볼 수 있어요` is never shown.
- The sheet of boards has no `게시판 검색` and no counts: it holds four boards.
- The clock line of a card shows the start without `· 약 40분`.
- `초대` lists Quest invitations only; P14 adds the Meetups.
- The post's badges `내 파티` and `참여 중` on a board use the design system's live tone.

### Result (2026-10-06)

The frame `Party` (찾기, 전체 파티 and its boards, 파티 모집글, the join sheet, 파티 만들기, 내 파티, 초대) was read in
the copy of the canvas at version `1791265989-e23c`.

Where things are, in `mobile/`:

- Routes above the tabs: `src/app/(signed-in)/boards/index.tsx`, `boards/[board].tsx`, `post/[questId].tsx` and
  `party-form.tsx` (`?questId=` for the edit mode), all sliding from the right.
- `src/screens/party/`: `party-screen.tsx` (the tabs and their counts), `find-tab.tsx`, `post-card.tsx`,
  `join-sheet.tsx`, `boards-screen.tsx`, `board-screen.tsx`, `post-screen.tsx`, `mine-tab.tsx`, `invites-tab.tsx`,
  `use-party-actions.ts` (joining, asking, withdrawing and answering invitations, each with its toast), and `form/`
  (`party-form-screen.tsx`, `party-form-fields.tsx`, `friend-picker.tsx`, `board-sheet.tsx`). The room's 일정 form
  exports `WhenField`, `WhereField` and `placeOf`, which the form and ticket 03 reuse.
- `src/features/party/`: `boards.ts`, `posts.ts` (a post of a recruiting entry or of the User's own Quest, a board's
  merged posts), `mine.ts` (내 파티's cards and groups), `making.ts` (the body of `POST /quests/own`, what changed for
  `PATCH`), `use-party.ts`.
- `src/api/`: `party-types.ts`, `server/party-client.ts`, `mock/party.ts`, `mock/data/boards.ts` (the frame's posts).
  The Quest, the invitation and the requests read `board`, `description` and `createdAt`. `quests-changed` and a new
  connection also fetch the recruiting Quests and the User's requests again.
- The room: `모집글 보기` and `수정` in its app bar, the description in a quote box.
- Tests: `party-find-test.tsx`, `party-boards-test.tsx`, `party-form-test.tsx`, `party-mine-test.tsx`, with
  `support/party.ts`; `shell-test`, `notifications-test` and `me-test` follow the tabs' counts and `+ 만들기`.

Decisions made while building:

- `QUEST_ENDED` says `이미 끝난 파티예요` where the User enters a Quest (joining, asking, accepting) and keeps the room's
  words elsewhere: `refusalWords` takes words that go before the table, and the words for any other refusal, which the
  form sets to `저장하지 못했어요. 다시 시도해 주세요`.
- A post is found among the User's Quests first, then among the recruiting ones; `없애기` ends the Quest through the
  room's action, so that a Party the User is in for it is ended or left first.
- The invitations after making go out at once, and every refusal of one counts as not invited. Friends who already hold
  the Quest are not listed in the edit mode; the list allows the free places, all 7 of a private Quest.
- `+ 만들기` and joining show 내 파티 by closing the screens above the tabs, or by the tab's address when none is open.
- The mock's recruiting Quests are the frame's 37 posts and its three recommended ones, every third taking requests.

Checks: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. The whole `pnpm test` ran once: 723 of 724 passed;
`me-test` still named the tab `내 파티` without its count, and passed alone once it did.

Not checked: nothing ran in a browser, on a phone or against a running main server, so the screenshots the ticket asks
for are still to be taken.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 1.5 hours of agent time in one session. Tokens: about 10 M input, of
which about 9.5 M cache reads and 0.4 M cache writes, and about 0.15 M output. No subagents.
