# P06: The app's fixes outside the Assistant

Status: ready-for-agent (11a, 17 and 18; 02, 03, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15 and 16 are done; 01, 04 and 05 are held, see Solution)

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
11. **A class whose days have different hours.** Added by the user on 2026-11-26: such a class has to be made twice, as two classes of one name. The user changed 수업 추가 on the design canvas (board `Timetable`, its form) and asked for that change alone.
11a. **Two sets of hours on one day.** Added by the user on 2026-11-27, after 11 was merged: a day one time slot holds is greyed out in the others, as the canvas drew it, so a class meeting 수 15:30–16:45 and 수 19:00–20:45 cannot be entered. The user asked for it to be possible.
12. **찾기.** Added by the user on 2026-11-26, from their notes on the 파티 and 행사 tabs: "맨 아래에 전체 게시판이랑 모집 중인 파티 옆 전체 게시판 중복 … 그냥 파티 찾기 탭 여기서 게시판 고를 수 있게 하면 되잖아 -전체/식사/진로/취미/공연 이렇게", the cards' time and place on their own lines, the purple square gone, and "파티 검색 저 버튼, 좀 뜬구름잡게 가운데 끼어든 느낌". Settled on wireframes the same day (`references/12-1-find-wireframe.webp`).
13. **파티's event card.** Added by the user on 2026-11-26, from their notes on the 파티 and 행사 tabs: "행사가 태그된 파티 안에 들어갔을 때 행사를 누르면 행사 탭으로 아예 넘어가버림, 팝업으로 아래서 위로 뜨게 하는 식으로 하는게 낫지 않나?" (`references/13-1-room-event-sheet.webp`)
14. **행사's detail sheet.** Added by the user on 2026-11-26, from their notes on the 파티 and 행사 tabs: "행사/특정행사 누름 올라오는 팝업에서도 제목을 좀더 작게, 언제/어디 글씨는 삭제(아이콘으로 인지 가능), 위에 '내 파티' 이거 뭐임? 삭제." Settled on 2026-11-27 (`references/14-1-event-sheet-wireframe.webp`, `references/14-2-description-spacing.webp`).
15. **행사's list.** Added by the user on 2026-11-26, from their notes on the 파티 and 행사 tabs: "행사 다가오는 행사 문구 삭제, 시간이랑 장소, 아이콘(눌렀을때 올라오는 팝업의 아이콘)을 두고 다른 줄로 나누기, 제목과 시간/장소 글씨 크기가 여전히 큼.." Settled on 2026-11-27 (`references/15-1-events-list-wireframe.webp`).
16. **관련 행사 고르기.** Added by the user on 2026-11-26, from their notes on the 파티 form: "관련행사 고르기 했을때 UI 말도 안되게 못생김 … 일단 눌렀을때 바로 추가되는게 아니라 행사탭처럼 아래서 위로 팝업 하나띄워주고, 추가 버튼을 따로 두고 추가했으면 좋겠음. (진로/이벤트/축제 이건 누가 나누는거지?)" Settled on 2026-11-27 (`references/16-1-event-picker-wireframe.webp`).
17. **The tabs' bars.** Added by the user on 2026-11-26, from their notes on the 파티 and 행사 tabs: "파티, 행사, 내정보의 최상단 각 글씨 크기를 살짝 키우고, 글씨랑 바로 아래 선 사이 간격을 좀 줄이는건 어떤가?" Settled on 2026-11-27 with the friend panel's bar too (`references/17-1-tab-bar-wireframe.webp`).
18. **내 파티's cards.** Added by the user on 2026-11-26, from their notes on the 파티 tab: "파티/내 파티 시간, 장소, 행사태그 이런거 한줄로 이어지게 적혀있는거 같은데, 나누는게 좋지 않을까? … 내가 방장인 파티는 간단하게라도 표시해서 식별되도록 하는건 어떤가." Settled on 2026-11-27 (`references/18-1-mine-wireframe.webp`, with the options in `18-2` and `18-3`).
19. **파티's room.** Added by the user on 2026-11-26, from their notes on the 파티 tab (wireframe items 3 and 4, one screen). Settled over four rounds on 2026-11-27 on one image of the room's every branch and the change (`references/19-1-room-wireframe.webp`): "배지는 전부 삭제", "활성화에 대한 카드를 따로 두고, 거기에 나도 참여하는 버튼을 그 카드 안에", "전체 위치 공유를 키라는 단계를 먼저 두는게 맞는 것 같아", "체크표시 빼버리고 싶어".
20. **A request to join, answered.** Added by the user on 2026-11-27, after a read-only audit of the code for what users of 파티 and 행사 cannot know: the one who asked hears nothing when the Leader accepts or declines, and the Leader gets no push for a new request. "'참여 신청이 거절되었을 때' 인 앱 알림 종모양 거기에 숫자 하나 더하고 알림 띄워주는 건 쉽지? … 푸시 알림으로 거절된 거나 새 신청 이거 오게 하는 거 어려운가?"
21. **No push on activation.** From the same audit: the ask on `5.0/Main` says members are told, and they are not. Ticket 19 (PR 688) changes the ask to say it shows in 알림 and adds no push; the user asked on 2026-11-27 for a push, so 21 proposes it as a change to 19's decision.
22. **A 파티 gone, or the User removed, told apart.** From the same audit: one toast for both, only while the app runs.
23. **A removed member stays in the activation.** From the same audit: they keep sharing their position.
24. **An invitation without a time or a place.** From the same audit: the server build's card says only "N명 참여 중".
25. **A changed step.** From the same audit: its words name no 파티 and no day, and every 지금 나서요 is forgotten and never kept again.
26. **A time without its day.** From the same audit: "년도는 괜찮음", the day is wanted.
27. **A place picked on the map.** The user's own example: "지도에서 정한 위치 … 사용자는 그 위치가 어딘지 알 수가 없거든?" Wanted: "그냥 지도에서 어딜 찍었나 그런 것만 알 수 있게".
28. **Two 파티 of one event.** From the same audit: joining another deletes the User's own held alone without a word, and `+ 파티 모집` overwrites it.
29. **The map's event card.** From the same audit: "같이 갈 파티 2개 모집 중이면 2개 보여주고 누르면 파티 모집글로 연결되게".
30. **One thing, different counts.** From the same audit.
31. **An invitation's inviter and a full 파티.** "초대한 사람 이름으로 나오게 … '초대하는 시점'에 다 차있으면 다 차서 초대할 수 없다고 문구 … '1/8' 상황에서 10명 초대하는 건 가능."
32. **A new Leader.** From the same audit: a hand-over is told to nobody.
33. **A full 파티's 모집글.** "참여하기 대신 '정원 초과' 등의 문구로 … 비활성화 느낌의 버튼."

Items 1 to 7 were checked against `origin/5.0/Main` 6abd04e8 on 2026-11-22, item 8 against b2e5323b and item 9 against ef2223aa on 2026-11-25, items 10 and 11 against 8020e2dc and item 12 against f44a4c61 on 2026-11-26, item 13 against 9be7f899 and item 14 against 03120c8c and item 15 against 2934be94 and item 16 against bbe4cad9 and items 17 and 18 against 6edb1b61 on 2026-11-27, and items 20 to 33 against 331adc64 on 2026-11-27: none was fixed then.

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
11. [11: The class form takes a time slot per set of hours](issues/11-class-time-slots.md)
11a. [11a: Two time slots may share a day](issues/11a-same-day-slots.md)
12. [12: 찾기: board filters that stay put, search at their end, plain cards whose 모집글 slides up, and no 전체 게시판](issues/12-find-filter-and-post-sheet.md)
13. [13: 파티's event card opens the event's detail as a sheet over the room](issues/13-room-event-sheet.md)
14. [14: 행사's detail sheet: no 내 파티 or source line, no 언제 / 어디 words, smaller type, and the description spaced by its own lines](issues/14-event-sheet-cleaner.md)
15. [15: 행사's list: no 다가오는 행사 heading, smaller type, time and place on their own lines, titles up to two lines, and no source line](issues/15-events-list-lighter.md)
16. [16: 관련 행사 고르기: one list without 진로 / 이벤트 / 축제, rows like 행사's, and an event chosen only from its sheet](issues/16-event-picker-one-list.md)
17. [17: The tab bars of 파티, 행사 and 내 정보, and the friend panel's: a larger title, closer to its line](issues/17-tab-bar-title.md)
18. [18: 내 파티's cards like 찾기's: a board or 비공개 tag, a crown for the 파티 the User leads, the time, the place and the event on their own lines, and tighter groups](issues/18-mine-cards-like-find.md)
19. [19: 파티 상세 as one page: the 모집글 inside, no badges, the event in the time-and-place box, an activation card with a red light and no 거절, 전체 위치 공유 asked first, 일정 without ✓, and leaner rows](issues/19-room-one-page.md)
20. [20: A request to join is answered in 알림 and by a push, and a new one reaches the Leader by a push](issues/20-join-request-notices.md)
21. [21: Activating a 파티 rings its members (a change to ticket 19's decision)](issues/21-activation-push.md)
22. [22: A 파티 that ends and a member who is removed are told apart, by a push and in 알림](issues/22-party-gone-notices.md)
23. [23: A removed member leaves the activation, and a 파티 that is gone ends its activation](issues/23-removed-leave-activation.md)
24. [24: An invitation card says when and where the 파티 meets](issues/24-invitation-time-place.md)
25. [25: A changed step says which 파티 and when, and 지금 나서요 is kept again](issues/25-step-changed-words.md)
26. [26: A time away from today says its day](issues/26-dates-with-times.md)
27. [27: A place picked on the map opens a map with its pin](issues/27-picked-place-on-map.md)
28. [28: Joining another 파티 of an event says the User's own goes, and + 파티 모집 opens the one held alone](issues/28-same-event-parties.md)
29. [29: The map's event card leads to the 파티 recruiting for it](issues/29-event-card-parties.md)
30. [30: One count for one thing on every screen](issues/30-same-counts.md)
31. [31: An invitation names who invited, and a full 파티 cannot invite](issues/31-inviter-and-full.md)
32. [32: The member who becomes Leader is told, in 알림](issues/32-new-leader-notice.md)
33. [33: A full 파티's 모집글 says so on its button](issues/33-full-post-button.md)

What is built now (agreed by the team after the review, 2026-11-22): what is broken goes first, and the improvements wait.

- Now: 06, then 07. 06 is a fault (an ended 파티's invitation never leaves, and a failure toast carries ✓); 07 stops a wrong state (an open 파티 nobody can enter, listed on a Board). Both change the 파티 form's send path (`screens/party/form/use-send.ts`), so 07 follows 06.
  Done on 2026-11-22: 06 in PR 475, 07 in PR 480. Both wait for a main server Release and an app OTA update, and 06's last criterion for the Dev Server check after that Release.
- Held, as tickets only (`Status: needs-triage`): 01 (its change to the agentic map design is still being agreed), 02, 03, 04 and 05 (improvements and design changes). They are fully written so that work can start once they are taken up.
- Taken up on 2026-11-25: 02 and 03, done in PR 554 and PR 555. 03 went before 01, which is still held: it stores only the three layers and shares no source file with 01.
- Added on 2026-11-25 and built at once: 08, done in PR 556. It changes only `screens/me/background-row.tsx` and its tests, which no other ticket touches.
- Added on 2026-11-25 and built at once: 09. It changes `design-system/list-row.tsx` (a way to leave the line out, the default unchanged) and three of 내 정보's cards; no open ticket touches them.
- Added on 2026-11-26 and built at once: 10. It changes 찾기 (`screens/party/find-tab.tsx`, `post-card.tsx`), 보낸 신청's ask and the party posts' lists (`features/party/`); no open ticket touches them.
- Added on 2026-11-26 and built at once: 11. It changes the class form (`features/timetable/class-form.ts`, `screens/timetable/`); no open ticket touches them.
- Added on 2026-11-26 and built at once: 12. It changes 찾기 and 파티 모집글 (`screens/party/`), `ChipRow` (a chip without a count) and the 파티 header, and removes the board screens and their routes; no open ticket touches them.
- Added on 2026-11-27 and built at once: 13. It changes the room's event card (`screens/room/room-event.tsx`) and `EventDetailSheet` (a way to leave out its party button); no open ticket touches them.
- Added on 2026-11-27 and built at once: 14. It changes `EventDetailSheet` (`screens/events/event-detail-sheet.tsx`) and adds text styles to the tokens; no open ticket touches them.
- Added on 2026-11-27 and built at once: 15. It changes `EventRow` (`screens/events/event-row.tsx`), the list's heading (`events-screen.tsx`), the shared `eventText` styles and the 관련 행사 picker's day size (`screens/party/form/event-field.tsx`). Ticket 14 (PR 636) touches `event-row.tsx` and other `eventText` keys too, so whichever lands second merges `5.0/Main` first.
- Added on 2026-11-27 and built at once: 16. It changes the 관련 행사 picker and field (`screens/party/form/event-field.tsx`), `EventDetailSheet` (a foot button of its own), `withEvent` (`features/party/making.ts`), and deletes `features/party/event-kinds.ts`; no open ticket touches them.
- Added on 2026-11-27 and built at once: 17. It changes `AppBar`'s tab form (`design-system/app-bar.tsx`) and 행사's search bar (`screens/events/events-bar.tsx`); no open ticket touches them.
- Added on 2026-11-27 and built at once: 11a, a change to 11 (PR 594). It changes the class form's day buttons (`screens/timetable/class-fields.tsx`, `slot-card.tsx`) and `features/timetable/class-form.ts`; no open ticket touches them.
- Added on 2026-11-27 and built at once: 18. It changes 내 파티's card and list (`screens/party/mine-card.tsx`, `mine-tab.tsx`) and its view (`features/party/mine.ts`), reusing 찾기's `PostTop` and `InfoLine`; no open ticket touches them.
- Added on 2026-11-27 and built at once: 19. It changes the room (`screens/room/`), `features/quests/room-adapter.ts`, the step rule behind `features/party/making.ts`, and the main server's list of visible Parties (`main-server/src/parties/`). No open ticket touches them; PR 662 (P10) touches `features/party/mine.ts`, which 19 leaves alone.
- Added on 2026-11-27 as tickets only (`Status: needs-triage`), for the team's review before any is built: 20 to 33. Of an audit's findings, only those the user took up are here; the rest are held (Out of Scope). They are numbered after ticket 19 (PR 688, the room as one page). Order and shared files once taken up:
  - 20, 21, 22 and 32 each add Notification kinds (`main-server/src/notifications/`, the app's `features/notifications/adapter.ts`): one after another.
  - 26 before 25 (25's words use 26's day words), and 24 shows its time with them.
  - 23 and 22 both change `leader.service.ts`: one after another.
  - 27, 28, 29, 30 and 33 are app only and can run beside the server ones.
  - After 19: 19 rewrites the room (`screens/room/`: `activation-box.tsx`, `people-sections.tsx`, `use-room-actions.ts`, `room-adapter.ts`, `plan-section.tsx`). 21, 23, 26 and 30 touch those files, so they are checked again against the code once 19 has merged, and never run beside it.

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
21. As a User whose class meets at different hours on different days, I want to enter it as one class with a time slot per set of hours.
22. As a User looking for a 파티, I want to pick a board right on 찾기, with the filters in view while I scroll, instead of going through 전체 게시판.
23. As a User skimming 찾기, I want short cards with the board, the time and the place on their own lines, and the whole 모집글 a press away without leaving 찾기.
24. As a User pressing 관심 없음, I want to be asked first, since a hidden 파티 does not come back.
25. As a User, I want a 파티's photo and tags shown only once they are its own, not stand-ins.
26. As a 파티 member pressing its event, I want the event's detail to slide up over the room, so that I never lose my place in the 파티.
27. As a User reading an event's detail, I want a quieter head and a description broken where its writer broke it, so that I can read it at a glance.
28. As a User scanning 행사, I want lighter rows with the time and the place on their own lines and titles I can read to the end, so that more events fit and each reads at a glance.
29. As a User making a 파티 for an event, I want to see the event's detail before I add it, in one list I can search, without kinds the app guesses wrongly.
30. As a User moving between the tabs, I want each tab's title a little larger and closer to the line under it, so that the top of the screen reads as one firm heading.
31. As a User looking through 내 파티, I want its cards to read like 찾기's, with the 파티 I lead marked, so that I can tell at a glance what each is, when and where it is, and which ones I run.
32. As a User whose class meets twice on one day, I want to give that day to two time slots, at hours that do not cross.
33. As a User in a 파티's room, I want the post's words, the time, the place and the event at the top, without badges, so that the room reads as one page instead of a page and a post.
34. As a member, I want to see who is in a running activation and join it with one press, with 전체 위치 공유 turned on first when it is off, so that joining always means we see each other.
35. As a member, I want 일정 to grey a step once the next one starts, without marking it done, so that the orange step is always the one we are on.
36. As a User who asked to join a 파티, I want to be told when the Leader accepts or declines, even with the app closed.
37. As a Leader, I want a push when someone asks to join my 파티.
38. As a member, I want a push when my 파티 is activated, so that I can join it while it matters.
39. As a member, I want to know whether my 파티 ended or I was removed, even if it happened while the app was closed.
40. As a removed member, I want my position no longer shared with that 파티.
41. As an invited User, I want to see when and where the 파티 meets before I accept.
42. As a member, I want a changed step to say which 파티 and which day, and still be told when to set out.
43. As a User, I want every time not today to say its day.
44. As a User reading a 파티 whose place was picked on the map, I want to see that spot on a map.
45. As a User joining a second 파티 of an event, I want to be told my own 파티 of it goes; and `+ 파티 모집` to open the one I already made.
46. As a User on the map, I want the event card's "같이 갈 파티" to lead to those 파티.
47. As a User, I want one number for one thing on every screen.
48. As an invited User, I want to see who invited me; as a Leader, to be stopped from inviting into a full 파티.
49. As a member who becomes Leader, I want to be told.
50. As a User opening a full 파티, I want its button to say it is full.

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
- 11 (2026-11-26): the canvas's 수업 추가 form, with a slot per set of hours (up to seven), each slot's own Place and room or the first's; the Place stays optional, and the timetable list is unchanged.
- 12 (2026-11-26): 찾기's board filters are 내 파티's `ChipRow` without counts, fixed under the tabs, with the search's magnifier at their right end (찾기 only); 전체 파티 and the board screens go, so a post hidden with 관심 없음 cannot be brought back. 찾기 gets its own plain card (board, fill, title, time, place, a blue event line, no photo, faces or buttons); the Assistant's cards keep `PostCard`. A card opens its 모집글 as a sheet; the sheet and the 모집글 screen share one content without the stand-in photo and tag badges, and 관심 없음 asks with a centred `Dialog`. `+ 만들기` is centred. The event line opens nothing yet, and the stand-in tags stay in the code.
- 13 (2026-11-27): the room's event card opens `EventDetailSheet` over the room instead of going to the 행사 tab. In the room the sheet has no party button, since the User is already in a 파티 of that event. An event the app's list no longer holds (ended or withdrawn) leaves the card unpressable. The 행사 tab's focus stays for push notices.
- 14 (2026-11-27): in `EventDetailSheet` only, the 내 파티 mark and the source line go (the source never shows in the server build), and so do the words 언제 / 어디, which a screen reader still gets. The title becomes 21 Bold, the values 14 SemiBold and the description 14 Regular. The description is laid out by its own lines, 7 apart, with a run of blank lines as one gap of 14, and its words untouched. Its content (e-mails, repeated time and place, a summary) is left as scraped.
- 15 (2026-11-27): the list loses its 다가오는 행사 heading and its rows' source line. A row's day is 22 Bold over a 12 month line, the title 16 Bold on up to two lines, the time and the place on their own lines with `clock` / `pin` at 13 Medium, the party line 13, and the padding 12. The sizes live in the shared `eventText`, which the 관련 행사 picker also takes (its day override goes), its other changes waiting for its own item. The day words stay 오늘 / 내일 / weekday.
- 16 (2026-11-27): the picker loses its 진로 / 이벤트 / 축제 tabs and lists every event by date with its search. Its rows follow the 행사 list's: two-line titles, time and place lines with icons, padding 12. A press opens `EventDetailSheet` with 원문 보기 and 이 행사 추가, or a disabled 선택됨 for the event already chosen. The kind rules (`event-kinds.ts`: regular expressions over an event's words, a stopgap) are deleted with their uses: the tabs, the chosen box's kind line and the tags added on picking. Nothing else reads them.
- 17 (2026-11-27): `AppBar`'s tab form (파티, 행사, 내 정보 and the friend panel) has its title in 25 Bold (line height 32) and its row 50 high with 4 on top, so the title is 7 from its line (was 13). The sub-screen form and the shared `text.titleLg` and `size.appBar` stay. 행사's search bar follows the new height so the filters do not move. 파티's bar keeps ticket 12's centred `+ 만들기` and no magnifier; the ? help stays on hold.
- 18 (2026-11-27): 내 파티's cards lose the kind column and follow 찾기's card: a board tag, or "비공개" in the same tag; the count at the right with a crown before it on a Quest the User leads (option C); the title on up to two lines; the time, the place and the event (blue, opening nothing) on their own lines. The strip, the live outline and the waiting circle stay. A group's last card is 20 from the next header (was 32). The map entry is option D, the room's place row, and waits with the event link; the card gets none.
- 19 (2026-11-27): the room as one page (`references/19-1-room-wireframe.webp`).
  - 모집글 보기 goes. Under the title stand the 모집글's Leader row (no "· 모집자", no other mark), the text for every Quest (no quote box), the tags, and the time-and-place box with no map button. The event is a blue line with › in that box, opening the event sheet. The badges and the separate event card go.
  - Not running, 파티 활성화 has a ? with its help. Running, a white card with 내 파티's blinking red dot shows who is in by name: 나도 참여 when out, with no 거절; the live outline and 활성화 끄기 / 나가기 when in. The 내 위치 공유 switch goes, since Party sight is mutual.
  - With 전체 위치 공유 off the User counts as not in. Activating or joining first asks to turn it on, then goes ahead at once. `GET /parties` names a held Quest's Party's members.
  - The toast stops promising a notice to n members. Activation rings each other Holder (item 21, agreed with ticket 19's owner on 2026-11-28), so `openAsk` says "멤버 N명에게 알림이 가요.".
  - 일정 loses ✓. A step is grey once a later one starts, its end passes or it is cancelled; the first other step is orange. The same rule replaces `done` in 내 파티's time and place and in the 파티 form's edited step. 일정 has a ? with its help.
  - 신청 rows lose their line, 멤버 shows 찾기's orange "3/4명" and loses the lock line and the location-off toast, the Leader keeps only the crown, 초대 중 loses '응답 대기', and the lists' titles get icons and lose their last line.

Decided on 2026-11-27 (20 to 33):

- Push or 알림 only: a push goes for what happened to the User that they must act on or that is pressing (a request answered or received, being removed, a 파티 gone, a changed step; an activation is proposed in 21 against 19's decision); 알림 alone for what is only good to know (a new Leader, a request or invitation cancelled because its 파티 went). Today's pushes stay: a 파티 invitation, 지금 나서요, a member's 일정 변경 / 도착 / 늦어요, an interest's new match and the 스터디룸 kinds.
- A new kind is a kept Notification (`NotificationsService.schedule`); `rings` decides the push. One per 파티 is replaced while unread where it could ring again and again (20's new request, 21's activation).
- 22: one whose request or invitation waited is told in 알림 only.
- 25: 지금 나서요 is kept again by the Timetable rule an accepted invitation uses, not by the live position.
- 27: only a place with a position and no Place opens a map; the 근처 rule stays; typed words stay words.
- 28: `+ 파티 모집` with a 파티 held alone opens its edit form, not a warning.
- 30: an event's count is the 파티 the User could enter; a 파티's size is Holders over the Quest's capacity; a sharing count includes the User.
- 31: inviting is refused only into a 파티 full at that moment; 31 adds one database migration, the exception to the rule below. 20 to 26, 31 and 32 need a main server Release.

For all tickets:

- "Ended" is the server's existing rule: no Sub Quest ahead (`hasSubQuestsAhead`, with its query form `subQuestsAheadWhere`).
- No native file changes and no database migration. Every ticket ships as an app OTA update; 06, 07 and 19 also need a main server Release. Native changes found necessary stop the work and go to the orchestrator first.
- Screen words are Korean as written in the tickets. A wording a ticket leaves open is decided while building and shown at the screen review.

## Testing Decisions

- A changed behaviour gets a test that fails before the change: integration tests at the screen over the fake main server for the app, the main server's integration tests for its lists and checks.
- Existing tests that find a thing by what goes (a list row, a text button, the 올리기 slot, the menu screen's ✕) are found with `git grep` and changed to reach it the new way; a test whose whole subject goes is removed with it.
- Only the changed files' tests and those `git grep` finds run locally, with typecheck, lint and format; CI runs the whole suite.
- Every ticket that changes a screen is checked on an Android emulator with the mock build. The screens go to the orchestrator before the pull request and to the design review for those with design calls (02, 04, 05).
- From 2026-11-25 (02, 03, 08) the emulator check before the pull request is left out: the user checks the merged change on a phone. A review that asks for screens is answered with emulator screens (02).
- From 2026-11-26 (12) a pull request that changes a screen shows before and after screens in its body.
- From 2026-11-25 (09) the pull request opens as a draft. The orchestrator builds the branch as a release APK against the production server, with updates on a channel nobody publishes to, and installs it on the user's wired phone; the user checks it there before the pull request is marked ready.

## Out of Scope

- The 파티 chat UI: already removed by PR 373 (P15-61, 2026-11-18).
- Showing Friends' or Quests' rows elsewhere on the map. The friend panel and the Quest list are where they are seen.
- Remembering the friend panel's or the 편의기능 stack's open state; only the three layers' on/off.
- Changing the menu screen's content (restaurants, meals, dates); only where it lives.
- Deleting ended invitations and requests from the database; they are left out of the lists.
- Open Quests stored with a capacity of 1 before ticket 07: left as they are.

- The audit of 2026-11-27's other findings, held and not to be built for now: 파티 with no end time never ending; others' 파티 tags and photos coming from the mock in both builds; a 행사's source post changed or cancelled after it is stored; a 행사 cancelled or moved by an Administrator not told to its 파티; 위치 꺼짐 / 응답 대기 standing for several reasons; a push that opens nothing; a period 행사 without its start; one post's sessions as identical 행사; ☆ unexplained; an interest's topics read at most twice; 파티 without a time left out of the map screen's Quest list (kept as designed: its marker still shows); a 행사 with a position and no place name; day-boundary words.

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
| 11 요일마다 시간이 다른 수업 (added 2026-11-26) | Ticket 11 |
| 12 찾기의 게시판 고르기, 카드, 파티 검색, 만들기 정렬 (added 2026-11-26) | Ticket 12. The user's other notes on the 파티 and 행사 tabs wait for their own tickets |
| 13 파티 상세에서 행사를 누르면 행사 탭으로 넘어감 (added 2026-11-26) | Ticket 13 |
| 14 행사 팝업의 내 파티, 언제/어디, 제목 크기 (added 2026-11-26) | Ticket 14, with the description's spacing (added 2026-11-27) |
| 15 행사 목록의 다가오는 행사, 시간/장소 줄, 글씨 크기 (added 2026-11-26) | Ticket 15, with two-line titles (added 2026-11-27) |
| 16 관련 행사 고르기의 UI, 누르면 팝업과 추가 버튼, 진로/이벤트/축제 (added 2026-11-26) | Ticket 16, with the kind rules deleted (added 2026-11-27) |
| 17 파티·행사·내 정보 상단 제목 크기와 아래 선 간격 (added 2026-11-26) | Ticket 17, with the friend panel's bar (added 2026-11-27). The ? help beside the titles is on hold |
| 18 내 파티 카드의 시간/장소/행사 줄, 방장 표시, 지도에서 위치 보기 (added 2026-11-26) | Ticket 18, with the board or 비공개 tag and tighter groups (added 2026-11-27). The map entry waits for the room, with the event link |
| 3·4 파티 상세 (행사가 태그된 파티, 멤버가 있는 파티) (added 2026-11-26) | Ticket 19, settled over four rounds on 2026-11-27 (the badges, the 모집글 merged in, the event line, the activation card and 전체 위치 공유 first, 일정 without ✓, the rows) |
| 20–33 파티·행사에서 사용자가 알 수 없는 것 (code audit, 2026-11-27) | Tickets 20 to 33, those the user took up; the rest held (Out of Scope) |

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
