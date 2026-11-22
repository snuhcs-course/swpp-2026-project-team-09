# P06: The app's fixes outside the Assistant

Status: ready-for-agent

## Problem Statement

On 2026-11-22 the team collected, in a Slack thread, what bothers them in the app outside the Assistant. Seven items are left once one already fixed is set aside. Each is quoted as received (`items.md` of the handoff, in Korean), with its screen under `references/`:

1. **Friend and Quest lists.** "왼쪽위, 오른쪽위 퀘스트랑 친구 리스트를 삭제하고 이를 펼치고 접을 수 있는 화살표 버튼도 삭제. 각 목록은 친구와 퀘스트 탭을 눌러 들어가서 볼 수 있게 함" (`references/01-1-map-now.webp`)
2. **The 파티 member row.** "현재 저 세 버튼이 위아래로 쭉 나열되는게 밤티임. 각각을 아이콘으로 바꿔서 가로로 나열하고, 각 버튼을 눌렀을 때 확인 메세지 하나씩 띄우도록 개선." (`references/02-1-party-screen-now.webp`; the mock-up of 2026-11-19, `references/02-2-member-row-mock-up.png`)
3. **Remembering the map's layers.** "현재 앱은 껐다키면 친구/퀘스트 리스트는 펼쳐져있고, 공부공간/셔틀버스/식당은 꺼져있는게 기본. 앱을 종료하더라도(백그라운드가 아니라 아예) 이 다섯개의 on/off 정보는 기억을 하고 다시 켰을 때 마지막 상태를 가져왔으면 좋겠음" (`references/03-1-layers-on.webp`). Added by 김태현: once item 1 removes the lists, only the three layers are left to remember.
4. **A 식단 tab, and the map in the middle.** "현재 메인화면 하단의 + 버튼이 파티 만들기로 이어지는데, 이는 파티 탭에서 가능한거라 굳이 필요없다고 생각함. 대신 우리의 메인화면이 되는 지도를 가운데로 옮기고, 비는 곳 하나를 식단으로 채워 식단 탭으로 넘어가게 하는 것을 제안." (`references/04-1-menu-screen-now.webp`, `references/04-2-tab-bar-now.webp`; mock-up `references/04-3-tab-bar-mock-up.png`)
5. **The User's own marker.** "지도에 내 위치가 카카오맵처럼 파란 점으로 표시되는데, 친구 위치 표시하는 것처럼 디자인 요소를 하나 넣어서 내 위치라는 인식이 더 잘되게 수정" (`references/05-1-own-dot-now.webp`, the dot at the middle left under "서울대학교 관악캠퍼스")
6. **Ended 파티 in the invitations.** "이미 기간이 지난, 하지만 아직 수락하지 않은 비공개 파티가 초대 목록에 여전히 남아있음. 또한 수락을 눌렀을 때 토스트로 '이미 끝난 파티에요'가 뜸. 거절하면 목록에서 사라지긴 함." (`references/06-1-ended-invitation.webp`, with a ✓ on the failure toast)
7. **A 공개 파티 of one.** "지금 공개로 1인 정원 파티 (나만)를 게시판에 올릴 수 있음. 비공개는 약간 나 스스로 퀘스트 생성용?이라 칠 수 있어도 공개는 2인부터 하긴 해야 할 듯 (아주 마이너한 이슈 …)" (no screen)

Every item was checked against `origin/5.0/Main` 6abd04e8 on 2026-11-22: none is fixed yet.

## Solution

One ticket per item, numbered as the items:

1. [01: The map's friend and Quest lists go, and the 퀘스트 chip opens the Quest list](issues/01-lists-go-quest-chip-opens-quests.md)
2. [02: The 파티 member row: three icon buttons, each asking first](issues/02-member-row-icon-buttons.md)
3. [03: The map's three layers stay as the User left them, across a restart](issues/03-layers-remembered.md)
4. [04: The bottom tabs: 식단, 파티, the map in the middle, 행사, 내 정보, and no +](issues/04-meal-tab-and-map-in-the-middle.md)
5. [05: The User's own marker reads "나"](issues/05-own-marker-reads-me.md)
6. [06: Ended 파티 leave the invitation and request lists, and failure toasts carry the alert icon](issues/06-ended-parties-leave-the-lists.md)
7. [07: A 공개 파티 is for two or more](issues/07-open-party-for-two-or-more.md)

Order of work. Tickets touching the same files never run at the same time:

- First, together: 01, 02 and 05. They share no file.
- After 01: 03 and 04 (both on the main screen, which 01 changes). They barely share a file, but both may touch the `dining-layer` test, so each merges `5.0/Main` before its pull request.
- After 02: 06. Its failure toasts are in `screens/room/people-sections.tsx` and `member-friend-button.tsx`, which 02 rewrites. The handoff planned 06 beside 02; this order replaces that, for this reason.
- After 06: 07 (`features/quests/refusals.ts` and the 파티 form's toasts).

## User Stories

1. As a User on the map, I want the top of the map clear of lists, so that I see more of the campus.
2. As a User, I want the 퀘스트 chip to open my Quests at a press, as the 친구 chip opens my Friends.
3. As a User coming back from the Quest list with a Quest picked, I want its card on the map, as today.
4. As a 파티 Leader, I want the member row's three actions side by side as icons, so that a row stays one line high.
5. As a 파티 Leader, I want to confirm before a friend request goes or a member is removed, so that a slip of the finger does neither.
6. As a User who already sent a member a friend request, I want the friend button to show it is sent and take no press.
7. As a User, I want the 공부공간, 셔틀버스 and 식당 layers to be as I left them when I open the app again, even after closing it completely.
8. As a User who shares a phone, I want my layers remembered apart from another User's.
9. As a User, I want a 식단 tab in the bottom bar, so that today's menus are one press away.
10. As a User, I want the map in the middle of the bottom bar, since it is the app's main screen.
11. As a User pressing "메뉴 보기" on a restaurant's card, I want the 식단 tab to show that restaurant now, and the map button to bring me back.
12. As a User, I want my own marker on the map to read as me at a glance, not as another app's blue dot.
13. As a User, I want an invitation to a 파티 that has ended to leave my invitations, my badge and my notifications' count.
14. As a 파티 Leader, I want my sent invitations and join requests to drop ended 파티 too.
15. As a User, I want a failure toast to look like a failure, not carry a check mark.
16. As a User making a 공개 파티, I want it to recruit at least one other person; a 비공개 파티 for myself alone stays allowed.

## Implementation Decisions

Decided by 김태현 on 2026-11-22:

- 01: the 퀘스트 chip opens the Quest list on the whole screen (`/quests`); the ↗ button goes.
- 02: the A design of 2026-11-19 (three 40 pt icon buttons: new `usersPlus`, `crown`, new `userMinus` in the danger colour; title-only confirm dialogs). The dialogs' cancel says **취소**, as every confirm dialog and sheet of the app already does; the mock-up's "닫기" is not used, and no other screen's wording changes. The friend button's 수락 state stays a text button. The 요청됨 state is the `usersPlus` button dimmed and disabled (`references/02-3-requested-dimmed.png`).
- 03: the three layers' on/off is stored per User, a layer turned on by the chat included (the last state is what comes back).
- 04: the tab order of the mock-up; a restaurant card's "메뉴 보기" switches to the 식단 tab with that restaurant, today and the current meal; the menu screen's ✕ goes.
- 05: a round marker with "나" in it inside a blue ring, smaller than the first mock-up (`references/05-2-own-marker-chosen.png`; the three options shown were `references/05-3-options-shown.png`). Neither the User's name nor their photo.
- 06: received invitations, the Leader's sent invitations and both join request lists leave out ended 파티; every failure toast of the 파티 tab and the room carries the alert icon.
- 07: a 공개 파티 has a capacity of 2 or more; a 비공개 파티 1 or more.

For all tickets:

- "Ended" is the server's existing rule: no Sub Quest ahead (`hasSubQuestsAhead`, with its query form `subQuestsAheadWhere`).
- No native file changes and no database migration. Every ticket ships as an app OTA update; 06 and 07 also need a main server Release. Native changes found necessary stop the work and go to 김태현 first.
- Screen words are Korean as written in the tickets. A wording a ticket leaves open is decided while building and shown at the screen review.

## Testing Decisions

- A changed behaviour gets a test that fails before the change: integration tests at the screen over the fake main server for the app, the main server's integration tests for its lists and checks.
- Existing tests that find a thing by what goes (a list row, a text button, the 올리기 slot, the menu screen's ✕) are found with `git grep` and changed to reach it the new way; a test whose whole subject goes is removed with it.
- Only the changed files' tests and those `git grep` finds run locally, with typecheck, lint and format; CI runs the whole suite.
- Every ticket that changes a screen is checked on an Android emulator with the mock build. The screens go to the orchestrator before the pull request and to 김태현 for those with design calls (02, 04, 05).

## Out of Scope

- The 파티 chat UI: already removed by PR 373 (P15-61, 2026-11-18).
- Showing Friends' or Quests' rows elsewhere on the map. The friend panel and the Quest list are where they are seen.
- Remembering the friend panel's or the 편의기능 stack's open state; only the three layers' on/off.
- Changing the menu screen's content (restaurants, meals, dates); only where it lives.
- Deleting ended invitations and requests from the database; they are left out of the lists.
- Open Quests stored with a capacity of 1 before ticket 07: left as they are.

## Further Notes

Every item received and where it went:

| Item | Where |
|---|---|
| 01 친구, 퀘스트 리스트 삭제 | Ticket 01 |
| 02 파티 멤버 줄의 세 버튼 | Ticket 02 |
| 03 플로팅 리스트와 스택의 on/off 기억 | Ticket 03 (the three layers; the lists go in ticket 01) |
| 04 식단 탭 복구, 메인 버튼을 지도 버튼으로 | Ticket 04 |
| 05 내 위치 표시 아이콘 | Ticket 05 |
| 06 끝난 비공개 파티의 초대 | Ticket 06 |
| 07 공개 1인 파티 | Ticket 07 (its own small ticket, last, though the item suggested folding it into another 파티 ticket: it touches the server, the app and server test fixtures) |
| 파티 채팅 | Already fixed: PR 373 (P15-61) removed the 파티 chat UI |

Notes for the tickets:

- "식단 탭 복구": there never was a 식단 tab. The 편의기능 stack had a 메뉴 tile until PR 197 (P13-02) replaced it with the 공부공간 layer. No tab code to bring back.
- The items, their screens and the code positions come from the handoff of 2026-11-22 (outside the repository), checked again on 6abd04e8.

## Comments
