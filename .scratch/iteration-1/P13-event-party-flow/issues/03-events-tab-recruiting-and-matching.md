# 03: The 행사 tab: Global Events, recruiting for one, and AI 매칭

Parent: [P13 spec](../spec.md)
Status: ready-for-human
Blocked by: 02 (The 파티 tab: recruiting Quests, the boards, 파티 만들기, 내 파티 and 초대), P12-01 (The administrative API: Global Events, Places, Collection status, Users and friendships)

## What to build

This closes the flow the iteration exists for. The 행사 tab, which P19-01 left empty, lists the published Global Events from the main server. From an event's card a User:

- reads its page (`자세히`);
- sees the Quests gathering for it and joins one, or recruits one of their own (`파티 찾기/모집`);
- asks for Matching with a group size (`AI 매칭`), goes on using the app while the request waits, sees it as `매칭 중`, and withdraws it. When matched, the Shared Quest appears in the User's lists.

The map's event card leads to the same recruiting (`같이 갈 사람 찾기`), 파티 만들기 gains `관련 행사`, and a Quest's room shows its event's card.

The frames are `Events` and `EventsFest` (the tab, the 파티 찾기/모집 sheet, the AI 매칭 sheet and the `AI 매칭 신청` list), the event picker and the `관련 행사` field inside `Party`, and the event card in `Main` and `MapZoomed`.

The server routes:

- `GET /global-events` (P12-01): `{ id, title, description, startsAt, endsAt, place, latitude, longitude, sourceUrl }`, which replaces the mock list for the map and the tab;
- `GET /quests/recruiting?globalEventId=`;
- `POST /quests` with `{ globalEventId }`, then `PATCH /quests/:questId`, `POST /quests/:questId/sub-quests` and `POST /quests/:questId/invitations`;
- `POST /matching-requests`, `GET /matching-requests`, `GET /matching-requests/:globalEventId`, `POST /matching-requests/:globalEventId/withdraw`;
- on the socket, `global-events-changed` (already mapped) and `matching-changed`, which fetches the requests and the Quests again.

Each new operation goes into the API client with its mock. The mock keeps Matching requests in memory and refuses as the main server does.

## How recruiting for an event maps to the server

- A Quest for a Global Event is made by attending it (`POST /quests`), which gives the User's Quest for the event, Closed and titled as the event, and then changed by its Leader: `PATCH` with the capacity, the Join Policy, the board and the description; a Sub Quest for meeting before the event when `언제` is given, titled `모이기`; and the invitations.
- A User holds one Quest for an event. Before recruiting, the app looks at the User's Quests: a Quest for the event that others hold too is that event's 파티, and `+ 파티 모집` opens its room with `이 행사에 함께 가는 파티가 이미 있어요`. A Quest the User holds alone for the event is the one the form changes.
- When a step after attending fails, the Quest stays. The app shows the refusal and opens its room, where the Leader finishes.

## Acceptance criteria

### The list

- [x] `listGlobalEvents` asks `GET /global-events` in a build that asks the main server. The announcers stay the app's own: a card shows its source only for an event that list names.
- [x] The app bar holds `행사`, the sparkle button `AI 매칭 신청 내역` with a navy count of the waiting requests, and the search button. Search replaces the title with the field `행사 검색` and ✕ `검색 닫기`, and filters by title, place and description.
- [x] The chips `전체`, `오늘`, `이번 주` and `파티 모집 중` filter the list. `이번 주` runs to Sunday in Korea's time. `파티 모집 중` keeps the events with a recruiting Quest.
- [x] A card has:
  - the Badge `같이 갈 파티 {n}개` (tone party) when n recruiting Quests are for it, the Badge `내 파티` when the User holds a Quest for it, and the source in 12 on the right;
  - the title in 18/600;
  - the clock line `오늘 18:00–20:00` and the pin line with the place;
  - `자세히` (outlined), which opens `sourceUrl` in the browser and is left out without one; `👥 파티 찾기/모집` (navy, growing); `✦ AI 매칭`, or `매칭 중` with the disabled look while the User's request for the event waits, which then opens the `AI 매칭 신청` list.
- [x] Empty after a search or a filter: `검색 결과가 없어요`. With no event at all: `예정된 행사가 없어요`. Loading and failure: the shared states.
- [x] The tab can be opened focused on one event: the card is scrolled into view with a navy border of 2 and a glow for 2.6 s.

### 파티 찾기/모집

- [x] The sheet shows `{event title}` in 12 and `모집 중인 파티 {n}`. Its rows:
  - first, the User's Quest for the event, if any, with the Badge `내 파티` when the User leads it or `참여 중`;
  - then the recruiting Quests for the event, with the Leader's name in grey and the fill.

  Each row has the title and the meta `{Leader} · {time} · {place}` of the next Sub Quest, and a chevron. A row opens the room for the User's own Quest and the post of ticket 02 for another's, from which the User joins. Empty: `아직 모집 중인 파티가 없어요`.
- [x] `+ 파티 모집` opens 파티 만들기 with the event chosen, or the room as above.

### 관련 행사 in 파티 만들기

- [ ] The form of ticket 02 gains `관련 행사` before `제목`: `행사 선택` opens the event picker, a screen with `뒤로`, `행사`, the search `행사 검색` and the cards of the list without their buttons. Choosing shows a box with a navy border: the source when known, the title, `{time} · {place}`, and ✕ `행사 빼기`.
- [ ] With an event, `제목` shows the event's title and cannot be changed, and `언제` and `어디서` are where to meet before it, both optional. Submitting attends, then changes the Quest as described above, with the same toasts as ticket 02. In edit mode the event cannot be changed.
- [x] The map's event card `같이 갈 사람 찾기` opens the form with that event chosen, in place of its toast. Its line `같이 갈 파티 {n}개 모집 중` and its marker's count come from the recruiting Quests for the event.

### AI 매칭

- [x] The sheet shows `{event}` and `✦ AI 매칭`, then `인원` with the chips `2명`, `3명` and `4명`, and this explanation: `같은 행사에 가려는 사람 중 관심사가 비슷한 사람과 인원에 맞춰 파티를 만들어 드려요. 같은 인원으로 모집 중인 공개 파티에 자리가 있으면 그 파티에 먼저 들어가요. 매칭되면 내 파티에 생기고, 멤버에게 내 이름과 학과가 보여요.` `매칭 신청` is enabled once a size is chosen.
- [x] `매칭 신청` sends `POST /matching-requests` with `{ globalEventId, size }`. Toast `매칭을 신청했어요 · 결과는 알림으로 와요`, and the card shows `매칭 중`.
- [x] The refusals: 409 `GLOBAL_EVENT_STARTED` `이미 시작한 행사예요`; 409 `SHARED_QUEST_HELD` `이 행사에 함께 가는 파티가 이미 있어요`; 409 `MATCHING_REQUEST_WAITING` `이미 매칭 중이에요`; 404 `GLOBAL_EVENT_NOT_FOUND` `행사를 찾을 수 없어요`, with the events fetched again; 502 without a code `매칭 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요`.
- [x] **The `AI 매칭 신청` list** is a screen above the tabs, with `뒤로` and `AI 매칭 신청 {n}`. A card per waiting request (`GET /matching-requests`): the pill `● 매칭 중` and `방금 신청` within a minute or `{n}분 전` after; the event's title in 17/600; `{time} · {place}`; the chip `{size}명`; `신청 취소`. Empty: `신청한 매칭이 없어요`.
- [x] `신청 취소` asks `매칭 신청을 취소할까요?` with `아니요` and `신청 취소`, and withdraws. Toast `매칭 신청을 취소했어요`. 409 `MATCHING_REQUEST_NOT_WAITING` and 404 `MATCHING_REQUEST_NOT_FOUND` say `이미 매칭이 끝났어요` and fetch the requests again.
- [x] On `matching-changed`, the requests and the Quests are fetched again. A request the app knew as waiting that is now matched (`GET /matching-requests/:globalEventId`) shows the toast `{event} 파티가 만들어졌어요`, and its Quest appears in the Quest list and in `내 파티`.

### The room's event

- [x] A Quest for a Global Event shows the event in the room as the design system's `EventCard` (official: the source when known, the title, the time, the place). A press opens the 행사 tab focused on it.

### Records and checks

- [x] P06's `todo.md` §3 says that the Global Events come from the main server and adds the Matching operations; §4 loses `같이 갈 사람 찾기`. `mobile/README.md` describes the tab, the sheets and Matching.
- [ ] Jest tests, through `startApp`, against the fake server and the fake socket:
  - the list from `GET /global-events`, each chip, the search, both empty states, `자세히` opening `sourceUrl`;
  - the sheet with the User's own Quest and others, a row into the post and joining from it, `+ 파티 모집` with and without a Shared Quest for the event;
  - recruiting with an event: the requests in order (attend, `PATCH`, the Sub Quest with its `Idempotency-Key`, the invitations), the title locked, and a failure after attending opening the room;
  - the map card's `같이 갈 사람 찾기` and its count;
  - AI 매칭: asking with each size, each refusal, `매칭 중` on the card, the list, withdrawing with both answers, and a match arriving through the fake socket with its toast and its Quest;
  - the room's event card focusing the tab.
- [x] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - the tabs `진로`, `이벤트` and `축제`, the category Badge, the eligibility line and the tags, which the main server does not store;
  - ☆ and `관심 행사`;
  - the AI 매칭 sheet's `선호 상대`, `분위기·목적` and `하고 싶은 말`, and editing a request (`수정`, `수정 완료`), by decision 9;
  - `자세히` opening the browser in place of the info sheet;
  - the title kept as the event's, and `모이기`;
  - the Badge `내 파티` on the card, `예정된 행사가 없어요`, the explanation in the AI 매칭 sheet and the toast of a match, which no frame draws;
  - `공식 모집 중` and `같이 볼 파티`.
- [ ] A run on two emulators against the main server is recorded under Comments, with screenshots in the pull request: one User recruits for a published Global Event, the other joins from the 행사 tab, one opens the Party in the room, and each sees the other's Avatar move.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### Differences from the frame

- No tabs `진로`, `이벤트` and `축제`, no category Badge, no eligibility line and no tags: the main server stores no
  category, eligibility or tags for a Global Event. One list with the filters, by decision 9.
- No ☆ and no `관심 행사` (`EventsSaved`): the main server keeps no saved events.
- The AI 매칭 sheet asks only `인원` with `2명`, `3명` and `4명`; no `선호 상대`, `분위기·목적` or `하고 싶은 말`, and a
  request is not edited (`수정`, `수정 완료`) but withdrawn and asked again, by decision 9. The cards of the
  `AI 매칭 신청` list therefore show the size alone, without the summary tags and the note.
- `자세히` opens the event's `sourceUrl` in the browser in place of the info sheet, by decision 9.
- The card's Badge reads `같이 갈 파티 {n}개` for every count, where the frame's data computes `파티 {n}개`.
  `공식 모집 중` and `같이 볼 파티` are not shown: the main server has no official recruiting and no kind of event that
  would say "볼".
- The sheet's rows have no `공식` Badge and no join sheet for an official recruiting, for the same reason.
- A row of another's Quest asks `‘{title}’에 참여할까요?` with the note of ticket 02's join sheet and joins or asks
  to from the sheet itself, where the frame opens the 모집글 of ticket 02, which is built in parallel.
- `매칭 중` has the grey look of a control that is done, as the ticket says; the frame tints it navy.
- Words no frame draws: the Badge `내 파티` on a card, `예정된 행사가 없어요`, the explanation in the AI 매칭 sheet, the
  refusals, the toast `{event} 파티가 만들어졌어요`, and `이 행사에 함께 가는 파티가 이미 있어요` on `+ 파티 모집`.
- The title kept as the event's and the Sub Quest `모이기` belong to 파티 만들기 with an event, which ticket 02's form
  carries.

### Result (2026-10-06)

The frame `Events` was read in the copy of the canvas at version `1791265989-e23c`.

Where things are, in `mobile/`:

- `src/api/`: `server/event-client.ts` (`GET /global-events`, the recruiting Quests, joining, Matching, with the
  checks of their answers) and `mock/events.ts` (the requests for Matching in memory, refused as the main server
  refuses them); `RecruitingQuest` and `MatchingRequest` in `types.ts`; the keys `recruiting-quests` and
  `matching-requests` in `queries.ts`. `matching-changed` fetches the requests, the Quests and the recruiting Quests
  again, and `quests-changed` the recruiting Quests too.
- `src/features/events/`: `adapter.ts` (the filters, the search, the cards, the rows of 파티 찾기/모집, the rows of the
  list, `eventTime`, which the map's card shares), `use-events.ts`, `matching-watch.tsx` (the toast of a match,
  mounted in the signed-in layout).
- `src/screens/events/`: `events-screen.tsx`, `events-bar.tsx`, `event-item.tsx`, `recruiting-sheet.tsx`,
  `matching-sheet.tsx`, `matching-screen.tsx` (`/matching`), `use-event-actions.ts`, `use-focus.ts`
  (`/events?focus=<id>`) and `use-party-create.ts`. `src/screens/room/room-event.tsx` is the room's `EventCard`.
- The map counts an event's 파티 from `GET /quests/recruiting`; its card's primary action is `recruit`. The design
  system gained the icon `sparkle`; `TabScreen` takes a `bar` in place of the app bar.
- Tests: `events-tab-test.tsx`, `events-recruiting-test.tsx`, `events-matching-test.tsx`, with `support/events.ts`.
  `startApp` and `openMain` take more screens, for a screen another task builds. `answerMainScreen` answers the three
  new lists empty.

Decisions made while building:

- 파티 만들기 is ticket 02's and is built in parallel. `+ 파티 모집` and `같이 갈 사람 찾기` open
  `/party/create?eventId=<id>` once the app has that route, and say "준비 중이에요" until then: `useOpenPartyCreate()`
  looks for it in Expo Router's sitemap. So `관련 행사`, the event picker inside the form, and attending then
  changing the Quest are left to the form; their criteria and the test of that flow stay unticked here.
- The cards count the recruiting Quests of the whole list (`GET /quests/recruiting`); the sheet asks for one event
  (`?globalEventId=`). Both are under one key, so a signal fetches both again.
- A match is noticed by the requests: one that waited and no longer does is read once more, and only `matched` makes
  the toast. A withdrawal is read too and says nothing.
- Joining an Open Quest opens its room. The refusals of joining and of Matching joined the one table of
  `src/features/quests/refusals.ts`; `refusalWords` takes a step's own words for a code, as `QUEST_ENDED` says
  `이미 끝난 파티예요` when joining.

Checks: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. The three new test files and the touched ones
(`main-card-test`, `screen-data-test`, `server-features-test`, `shell-test`, `client-test`, `main-markers-test`,
`room-activation-test`) pass.
The whole `pnpm test` ran once: 709 of 714 passed. `main-markers-test` counted the event's pin by the Parties and
`room-activation-test` found the event's title once, so both follow the recruiting Quests and the room's
`EventCard` now and pass alone; `main-walk-test` timed out in the whole run and passed alone, as before this ticket.

Not checked: nothing ran in a browser, on a phone or against a running main server, so the run on two emulators and
its screenshots are still to be done.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 1.5 hours of agent time in one session. Tokens: about 12 M input, of
which about 11.5 M cache reads and 0.4 M cache writes, and about 0.15 M output. No subagents.
