# P06: The app's fixes outside the Assistant

Status: ready-for-agent (10; 02, 03, 06, 07, 08 and 09 are done; 01, 04 and 05 are held, see Solution)

## Problem Statement

On 2026-11-22 the team collected, in a Slack thread, what bothers them in the app outside the Assistant. Seven items are left once one already fixed is set aside. Each is quoted as received (`items.md` of the handoff, in Korean), with its screen under `references/`:

1. **Friend and Quest lists.** "왼쪽위, 오른쪽위 퀘스트랑 친구 리스트를 삭제하고 이를 펼치고 접을 수 있는 화살표 버튼도 삭제. 각 목록은 친구와 퀘스트 탭을 눌러 들어가서 볼 수 있게 함" (`references/01-1-map-now.webp`)
2. **The 파티 member row.** "현재 저 세 버튼이 위아래로 쭉 나열되는게 밤티임. 각각을 아이콘으로 바꿔서 가로로 나열하고, 각 버튼을 눌렀을 때 확인 메세지 하나씩 띄우도록 개선." (`references/02-1-party-screen-now.webp`; the mock-up of 2026-11-19, `references/02-2-member-row-mock-up.png`)
3. **Remembering the map's layers.** "현재 앱은 껐다키면 친구/퀘스트 리스트는 펼쳐져있고, 공부공간/셔틀버스/식당은 꺼져있는게 기본. 앱을 종료하더라도(백그라운드가 아니라 아예) 이 다섯개의 on/off 정보는 기억을 하고 다시 켰을 때 마지막 상태를 가져왔으면 좋겠음" (`references/03-1-layers-on.webp`). Added when the items were collected: once item 1 removes the lists, only the three layers are left to remember.
4. **A 식단 tab, and the map in the middle.** "현재 메인화면 하단의 + 버튼이 파티 만들기로 이어지는데, 이는 파티 탭에서 가능한거라 굳이 필요없다고 생각함. 대신 우리의 메인화면이 되는 지도를 가운데로 옮기고, 비는 곳 하나를 식단으로 채워 식단 탭으로 넘어가게 하는 것을 제안." (`references/04-1-menu-screen-now.webp`, `references/04-2-tab-bar-now.webp`; mock-up `references/04-3-tab-bar-mock-up.png`)
5. **The User's own marker.** "지도에 내 위치가 카카오맵처럼 파란 점으로 표시되는데, 친구 위치 표시하는 것처럼 디자인 요소를 하나 넣어서 내 위치라는 인식이 더 잘되게 수정" (`references/05-1-own-dot-now.webp`, the dot at the middle left under "서울대학교 관악캠퍼스")
6. **Ended 파티 in the invitations.** "이미 기간이 지난, 하지만 아직 수락하지 않은 비공개 파티가 초대 목록에 여전히 남아있음. 또한 수락을 눌렀을 때 토스트로 '이미 끝난 파티에요'가 뜸. 거절하면 목록에서 사라지긴 함." (`references/06-1-ended-invitation.webp`, with a ✓ on the failure toast)
7. **A 공개 파티 of one.** "지금 공개로 1인 정원 파티 (나만)를 게시판에 올릴 수 있음. 비공개는 약간 나 스스로 퀘스트 생성용?이라 칠 수 있어도 공개는 2인부터 하긴 해야 할 듯 (아주 마이너한 이슈 …)" (no screen)
8. **백그라운드에서도 공유 under 위치 공유.** Added by the user on 2026-11-25: "백그라운드에서도 공유 이 토글도 사실 override가 되는거잖아? 근데 지금 UI로 둘다 토글이 켜져있을때 위치 공유만 끄면 백그라운드에서도 공유는 켜진 상태로 남거든? 이걸 수정하고 싶어 같이 꺼지게, 대신 같이 꺼졌으면, 나중에 위치 공유를 킬 때는 같이 켜져야돼." (a screen of the 위치 공유 card on 내 정보, not kept)
9. **내 정보's cards.** Added by the user on 2026-11-25, on their phone: "관심사 아래 line, 탭 안내 다시 보기 밑에 line, 관정도서관 로그인 밑에 line 있잖아. 이거 해당 블록이 거기서 끝나는데 그 line들이 있을 이유가 없거든?" and "관정도서관 로그인 버튼, 지금 그 칸 기준으로 위에 붙어있잖아, 이거 중앙으로 맞추고 싶어." (`references/09-1-me-cards-mock-up.webp`, the screen as it is and as agreed)
10. **Full 파티 and 파티 asked for, in 찾기.** Added by the user on 2026-11-26. From UAT 1, never fixed: "자리가 다 찬 파티도 보여줌. → 참여하기 버튼도 활성화가 되어 있고, 눌렀을 때 그제야 '자리가 다 찼어요'를 보여줌." And: "파티를 이미 신청했는데 해당 파티의 참여 신청 버튼이 아직 활성화 되어있음 (모집 중인 파티 탭에서) 이거 신청 취소 버튼으로 만들고 버튼 디자인은 '초대' - '신청 취소' 버튼과 동일하게." (`references/10-1-asked-card-now.jpg`, `references/10-2-asked-post-now.jpg`)

Items 1 to 7 were checked against `origin/5.0/Main` 6abd04e8 on 2026-11-22, item 8 against b2e5323b and item 9 against ef2223aa on 2026-11-25, item 10 against 8020e2dc on 2026-11-26: none was fixed then.

## Solution

One ticket per item, numbered as the items:

1. [01: The map's friend and Quest lists go, and the 퀘스트 chip opens the Quest list](issues/01-lists-go-quest-chip-opens-quests.md)
2. [02: The 파티 member row: three icon buttons, each asking first](issues/02-member-row-icon-buttons.md)
3. [03: The map's three layers stay as the User left them, across a restart](issues/03-layers-remembered.md)
4. [04: The bottom tabs: 식단, 파티, the map in the middle, 행사, 내 정보, and no +](issues/04-meal-tab-and-map-in-the-middle.md)
5. [05: The User's own marker reads "나"](issues/05-own-marker-reads-me.md)
6. [06: Ended 파티 leave the invitation and request lists, and failure toasts carry the alert icon](issues/06-ended-parties-leave-the-lists.md)
7. [07: A 공개 파티 is for two or more](issues/07-open-party-for-two-or-more.md)
8. [08: 백그라운드에서도 공유 shows off while 위치 공유 is off, and comes back with it](issues/08-background-follows-sharing.md)
9. [09: 내 정보's cards end without a line, and 관정도서관 로그인's button stands in the row's middle](issues/09-me-cards-end-clean.md)
10. [10: 찾기 leaves out full 파티, and a card whose request waits offers 신청 취소](issues/10-full-and-asked-posts.md)

What is built now (agreed by the team after the review, 2026-11-22): what is broken goes first, and the improvements wait.

- Now: 06, then 07. 06 is a fault (an ended 파티's invitation never leaves, and a failure toast carries ✓); 07 stops a wrong state (an open 파티 nobody can enter, listed on a Board). Both change the 파티 form's send path (`screens/party/form/use-send.ts`), so 07 follows 06.
  Done on 2026-11-22: 06 in PR 475, 07 in PR 480. Both wait for a main server Release and an app OTA update, and 06's last criterion for the Dev Server check after that Release.
- Held, as tickets only (`Status: needs-triage`): 01 (its change to the agentic map design is still being agreed), 02, 03, 04 and 05 (improvements and design changes). They are fully written so that work can start once they are taken up.
- Taken up on 2026-11-25: 02 and 03, done in PR 554 and PR 555. 03 went before 01, which is still held: it stores only the three layers and shares no source file with 01.
- Added on 2026-11-25 and built at once: 08, done in PR 556. It changes only `screens/me/background-row.tsx` and its tests, which no other ticket touches.
- Added on 2026-11-25 and built at once: 09. It changes `design-system/list-row.tsx` (a way to leave the line out, the default unchanged) and three of 내 정보's cards; no open ticket touches them.
- Added on 2026-11-26 and built at once: 10. It changes 찾기 (`screens/party/find-tab.tsx`, `post-card.tsx`), 보낸 신청's ask and the party posts' lists (`features/party/`); no open ticket touches them.

When the held tickets are taken up, tickets touching the same files never run at the same time:

- 01, 02 and 05 can run together. They share no source file, but each may touch `mobile/README.md` and the catalogue test, so each merges `5.0/Main` before its pull request.
- After 01: 03 and 04 (both on the main screen, which 01 changes). They barely share a file, but both may touch the `dining-layer` test, so each merges `5.0/Main` before its pull request.
- 02 after 06: 06's failure toasts include those in `screens/room/people-sections.tsx` and `member-friend-button.tsx`, which 02 rewrites. The handoff planned 06 beside 02, and an earlier version of this spec put 06 after 02; with 02 held, 06 goes first.

## User Stories

1. As a User on the map, I want the top of the map clear of lists, so that I see more of the campus, and my Friends one press away in the friend panel.
2. As a User, I want the 퀘스트 chip to open my Quests at a press, as the 친구 chip opens my Friends.
3. As a User pressing a class on the Quest list, I want the map to go to its place, as today.
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
17. As a User turning 위치 공유 off, I want 백그라운드에서도 공유 to show off too, and to come back as it was when I turn 위치 공유 on again.
18. As a User on 내 정보, I want each card to end at its edge, without a line under its last row, and the 관정도서관 로그인 button level with its row.
19. As a User looking for a 파티, I want 찾기 and the boards to leave out 파티 with no place left, so that I never press 참여하기 to hear "자리가 다 찼어요".
20. As a User who asked to join a 파티, I want its card in 찾기 to offer 신청 취소 instead of 참여 신청.

## Implementation Decisions

Decided on 2026-11-22:

- 01: the lists go, and the 퀘스트 chip opens the Quest list on the whole screen (`/quests`); the ↗ button goes. This changes the agentic map design, which keeps a Friend whose whereabouts are not known in the map screen's Friend list as "the app's philosophy" (`.scratch/iteration-4/agentic-map-design.md:141`); ticket 01 changes those lines of the design with the screen, so that such a Friend is seen in the friend panel the 친구 chip opens. Confirmed after the review, for the reason that a Friend who shares their location is on the map as a marker anyway. The rows listed every Friend (`friend-list.tsx:120-122`), so a Friend who does not share it, as the three rows of `references/01-1-map-now.webp` ("위치 꺼짐"), is afterwards seen only in the friend panel.
- 02: the A design of 2026-11-19 (three 40 pt icon buttons: new `usersPlus`, `crown`, new `userMinus` in the danger colour; title-only confirm dialogs). The dialogs' cancel says **취소**, as every confirm dialog and sheet of the app already does; the mock-up's "닫기" is not used, and no other screen's wording changes. The friend button's 수락 state stays a text button. The 요청됨 state is the `usersPlus` button dimmed and disabled (`references/02-3-requested-dimmed.png`).
- 03: the three layers' on/off is stored per User, a layer turned on by the chat included (the last state is what comes back).
- 04: the tab order of the mock-up; a restaurant card's "메뉴 보기" switches to the 식단 tab with that restaurant at the meal served next, as it opens the menu screen now; the menu screen's ✕ goes.
- 05: a round marker with "나" in it inside a blue ring, smaller than the first mock-up (`references/05-2-own-marker-chosen.png`; the three options shown were `references/05-3-options-shown.png`). Neither the User's name nor their photo.
- 06: received invitations, the Leader's sent invitations and both join request lists leave out ended 파티; every failure toast of the 파티 tab and the room carries the alert icon.
- 07: a 공개 파티 has a capacity of 2 or more; a 비공개 파티 1 or more.
- 08 (2026-11-25): while 위치 공유 is off, 백그라운드에서도 공유 shows off and disabled; turned on again, it shows the User's kept choice. The screen changes, not the choice kept on the phone nor the rule for background sending, which already follows the Master Switch.
- 09 (2026-11-25): the line goes from under the last row of 내 정보's activity card, 탭 안내 다시 보기 and 관정도서관 로그인 only; `ListRow` keeps its line by default, and the 비공개 구역 card on the 위치 공유 screen, which ends the same way, stays. The 관정도서관 로그인 button is centred in its row with `Button`'s existing `centred`.
- 10 (2026-11-26): full 파티 leave 찾기 and the boards, filtered in the app, so that 파티 모집글 still opens one from a link or a chat card; a 찾기 card whose request waits shows `secondary` `신청 취소` at 참여 신청's size, asking as 보낸 신청 does.

For all tickets:

- "Ended" is the server's existing rule: no Sub Quest ahead (`hasSubQuestsAhead`, with its query form `subQuestsAheadWhere`).
- No native file changes and no database migration. Every ticket ships as an app OTA update; 06 and 07 also need a main server Release. Native changes found necessary stop the work and go to the orchestrator first.
- Screen words are Korean as written in the tickets. A wording a ticket leaves open is decided while building and shown at the screen review.

## Testing Decisions

- A changed behaviour gets a test that fails before the change: integration tests at the screen over the fake main server for the app, the main server's integration tests for its lists and checks.
- Existing tests that find a thing by what goes (a list row, a text button, the 올리기 slot, the menu screen's ✕) are found with `git grep` and changed to reach it the new way; a test whose whole subject goes is removed with it.
- Only the changed files' tests and those `git grep` finds run locally, with typecheck, lint and format; CI runs the whole suite.
- Every ticket that changes a screen is checked on an Android emulator with the mock build. The screens go to the orchestrator before the pull request and to the design review for those with design calls (02, 04, 05).
- From 2026-11-25 (02, 03, 08) the emulator check before the pull request is left out: the user checks the merged change on a phone. A review that asks for screens is answered with emulator screens (02).
- From 2026-11-25 (09) the pull request opens as a draft. The orchestrator builds the branch as a release APK against the production server, with updates on a channel nobody publishes to, and installs it on the user's wired phone; the user checks it there before the pull request is marked ready.

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
| 08 백그라운드에서도 공유 토글 (added 2026-11-25) | Ticket 08 |
| 09 내 정보 카드 끝의 줄, 관정도서관 로그인 버튼 위치 (added 2026-11-25) | Ticket 09 |
| 10 가득 찬 파티, 신청한 파티의 참여 신청 버튼 (added 2026-11-26) | Ticket 10 |

Notes for the tickets:

- "식단 탭 복구": there never was a 식단 tab. The 편의기능 stack had a 메뉴 tile until PR 197 (P13-02) replaced it with the 공부공간 layer. No tab code to bring back.
- The items, their screens and the code positions come from the handoff of 2026-11-22 (outside the repository), checked again on 6abd04e8.

## Comments

### Agent usage (2026-11-22)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person or for CI is left out. No subagents.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Orchestrator (items checked again, decisions, spec, tickets, screen reviews, merges, this wrap-up) | about 1 hour | 45,765,926 | 45,338,389 | 427,095 | 442 | 171,359 |
| Ticket 06 | about 33 minutes | 35,820,366 | 35,550,575 | 269,477 | 314 | 93,043 |
| Ticket 07 | about 25 minutes | 26,730,041 | 26,414,683 | 315,086 | 272 | 89,069 |
| All | about 2 hours | 108,316,333 | 107,303,647 | 1,011,658 | 1,028 | 353,471 |

Without cache reads, the input is 1,012,686 in all. The orchestrator is counted up to the writing of this entry, so its last few messages are left out.
