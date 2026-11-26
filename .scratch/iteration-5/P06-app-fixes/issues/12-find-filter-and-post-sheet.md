# 12: 찾기: board filters that stay put, search at their end, plain cards whose 모집글 slides up, and no 전체 게시판

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, from their notes on the 파티 and 행사 tabs. The two items about 찾기:

- "파티/찾기 시간, 위치 이런거 걍 옆을 나열되게 되어있는듯? 이거 세로로 해주고, 어느정도 모집중인 파티랑 내 파티랑 UI가 통일되는 구석이 있어야 하지 않나? 각 파티 카드당 오른쪽에 보라색으로 뭐 있는데, 이거 사진인가? 그럼 이거 지워야 함 (로직파악하기), 맨 아래에 전체 게시판이랑 모집 중인 파티 옆 전체 게시판 중복, 그리고 이거 눌렀을때 뜨는 탭들 아예 필요 없는거같은데, 그냥 파티 찾기 탭 여기서 게시판 고를 수 있게 하면 되잖아 -전체/식사/진로/취미/공연 이렇게, 각 파티 카드 최상단 왼쪽? 오른쪽에 아주 작게 어디게시판 소속인지 남겨주기.."
- "파티 파티 검색 저 버튼, 좀 뜬구름잡게 가운데 끼어든 느낌인데, 행사 탭의 검색처럼 돋보기 버튼을 만들기 옆에 살짝 두는건 어때보일려나? 그리고 +만들기 버튼이 왼쪽의 '파티'글씨랑 아래 정렬되어있어서 좀 떠보이는데, 가운데 정렬하든가 아니면 버튼 크기나 위치를 좀 조정하고 싶음."

The user went through wireframes and the code's answers the same day and settled the screen in `references/12-1-find-wireframe.webp`. Its first column is the phone as it was; the others are the agreed screens, ① to ⑦. The two 파티 in it are the user's real ones; the 파티 with an event is made up to show the event line. The phone ran 8020e2dc, from before ticket 10, which is why the full 1인파티 still shows in it.

Positions are as of `origin/5.0/Main` f44a4c61, under `mobile/src/`.

- **The tab.** 찾기 (`screens/party/find-tab.tsx`, `FindTab`) scrolls the 파티 검색 field (`:176`), the 모집 중인 파티 heading with its round `전체 게시판 ›` (`PostsHead`, `:39`), the cards, and the `BoardsCard` (`:66`). Under the cards is "숨긴 파티 n개 · 다음 추천에 반영할게요" (`:120`). Hidden posts are kept on the phone only (`api/quest-parts/hidden-posts.ts`) and feed no recommendation, so the line's second half is not true.
- **The board screens.** Both 전체 게시판 entries push `/boards`, 전체 파티 (`screens/party/boards-screen.tsx`, `app/(signed-in)/boards/index.tsx`). A row there opens `/boards/[board]` (`board-screen.tsx`). Nothing else leads to them: no server notice, the Assistant, the tutorial or the tab tour. In the mock build, the official recruiting banner's `공식 모집 전체 보기` also opens `/boards?tab=official` (`:168`, `official-banner.tsx`).
  - A board lists the posts the User hid with 관심 없음; 찾기 does not. With the boards gone, a hidden post cannot be brought back. The user accepted that.
- **The data.** The cards come from `GET /quests/recruiting` (`useFindPosts`, `features/party/use-party.ts`). Every post carries its `board`, and the database requires one on every Open or Approval Quest (`quests_board_check`). Filtering by board needs no server change.
- **The card.** `PostCard` (`screens/party/post-card.tsx:102`) shows the event as a badge, the title, time and place on one line cut with "…", a photo (`:129`), the faces with "n명 · 친구 m명 포함" and the fill, and 관심 없음 with 참여 신청 / 참여하기 / 신청 취소 (`CardButtons`, `:149`).
  - The photo of a 파티 not made on this phone is a stand-in: one of a fixed set picked by the id (`api/quest-parts/photos.ts`, `stable-pick.ts`). Its tags are the same kind of stand-in (`tags.ts`), since the server keeps neither.
  - The Assistant's 파티 cards use `PostCard` too (`screens/main/chat-quest-cards.tsx`), with their 이동 시간 box.
- **The 모집글.** 파티 모집글 (`/post/[questId]`, `post-screen.tsx`) is a whole screen. Besides 찾기, it is opened by 내 파티's room (모집글 보기), 초대, the Assistant's cards and 행사's 함께 갈 파티 찾기.
  - `Body` (`:133`): the Leader as 모집자, their department and how long ago, the fill, the title, the description, the photo (`:149`), the tag badges (`:150`), then time, place, members and faces, then 추천 이유 (`PostReasons`).
  - `Footer` (`:92`), by role: 이미 참여 중인 파티예요; 없애기 / 수정하기 for the Leader; 참여 신청을 기다리는 중이에요 with 신청 취소; or 관심 없음 with 참여 신청 / 참여하기.
  - Its 관심 없음 (`:199`) hides the post at once, without asking. The post's event is not shown at all.
- **The header.** `+ 만들기` (`screens/party/party-screen.tsx:65`) is a `Button`, which hugs with `alignSelf: 'flex-start'`, so it sits at the top of the 56-high bar, as 관정도서관 로그인's did before ticket 09. `Button` has `centred`.
- **What exists to reuse.**
  - 내 파티's filter row is `ChipRow` (`design-system/chip-row.tsx:29`; `mine-tab.tsx:92`), outside the scroll so that it stays put. It is drawn like 행사's filters, but every chip carries a count.
  - 행사's detail sheet is the shared `BottomSheet` (`screens/events/event-detail-sheet.tsx:84`).
  - The centred confirm of the room's member buttons is `Dialog` (`design-system/dialog.tsx:35`).

## What to build

Everything in the wireframe's ① to ⑦.

1. **Header.** `+ 만들기` stands in the bar's vertical middle (`centred`), at its present size. The title and the bar stay as they are; their size is another item.
2. **Gone from 찾기.**
   - The 파티 검색 field, the 모집 중인 파티 heading and its `전체 게시판 ›`, the `BoardsCard`, and the 숨긴 파티 line.
   - The routes `/boards` and `/boards/[board]`, with `boards-screen.tsx`, `board-screen.tsx` and the code only they use.
   - The mock build's `공식 모집 전체 보기`.
   - The 파티 form's board sheet keeps using `useBoardRows` (its counts) until the form's own ticket.
3. **Filter row (①).**
   - 전체 · 식사 · 진로 · 취미 · 공연, drawn as 내 파티's `ChipRow`. It sits right under 찾기 / 내 파티 / 초대 and stays put while the cards scroll. No counts: `ChipRow` learns to draw chips without one, and 내 파티 keeps its counts.
   - It slides sideways when it does not fit.
   - A board shows that board's posts, 전체 all of them, in the same order as today.
   - A board with none shows "{식사} 게시판에 모집 중인 파티가 없어요"; 전체 with none keeps today's empty state.
4. **Search (①, ②).**
   - A magnifier stays at the filter row's right end, on 찾기 only. The header is the same on all three tabs.
   - Pressing it turns the filter row into the search field (placeholder "파티 검색") with ✕. The search covers every board and matches as today.
   - ✕ clears the words and brings the filter row back at 전체.
5. **Card (①, ⑤).** 찾기 gets its own card. `PostCard` stays as it is for the Assistant's cards.
   - The board ("취미 게시판") small at the top left; the fill ("1/1명") at the top right, words only.
   - Then the title, the time on its own line (clock), and the place on its own line (pin, up to two lines, then "…").
   - For a 파티 of an event, a line under the place in blue with the calendar icon and the event's title on one line, cut with "…". Pressing it does nothing in this ticket.
   - No photo, no faces or members line, no buttons. A press on the card opens its 모집글 as a sheet.
6. **모집글 sheet (③, ⑥).** From 찾기, the 모집글 slides up from the bottom, as 행사's detail does, and the User stays on 찾기.
   - Top: the board and the fill. Then the title, and the Leader as `{이름} · 모집자` with their department and how long ago.
   - A grey box with the time, the place, the members, and the event line in blue for a 파티 of an event, not pressable.
   - Then the description and 추천 이유 as today, 관심사 included.
   - No photo and no tag badges.
   - The buttons are today's `Footer`, by role.
   - Pressing 참여 신청 / 참여하기 closes the sheet and opens today's join sheet. 신청 취소 asks as today.
7. **The 모집글 screen (⑦).** `/post/[questId]` shows the same content as the sheet, from the same component, and keeps its own bar and `Footer`. So no photo and no tag badges there either, and the event line appears. The Assistant's cards themselves do not change.
8. **관심 없음 asks (④).** On the sheet and on the screen, 관심 없음 opens a centred `Dialog`, as the room's member buttons do:
   - Title "‘{제목}’을 숨길까요?" or "‘{제목}’를 숨길까요?", by the title's last letter.
   - Body "숨긴 파티는 찾기에 다시 나오지 않아요. 한 번 숨기면 되돌릴 수 없어요.".
   - Buttons [취소] [숨기기], `숨기기` in the key colour.
   - On 숨기기 the post is hidden as today, and the sheet closes (the screen goes back as today). On 취소 nothing changes.

## Must not break

- Joining an Open Quest and asking to join an Approval one, from the sheet and from the screen, with today's refusals (`QUEST_FULL`, `REMOVED_CAPTION`).
- 신청 취소 on a 파티 asked for (ticket 10), from the sheet and the screen; full 파티 stay out of 찾기 (ticket 10).
- The 모집글 screen's other roles: 이미 참여 중인 파티예요, and the Leader's 없애기 / 수정하기.
- The Assistant's 파티 cards: same look, same buttons, same 이동 시간 box.
- 내 파티's `ChipRow` with its counts; the swipe between 찾기, 내 파티 and 초대.
- The stand-in tags stay in the code: 찾기's order and search still use them. Only the badges go from the screen.
- Tests: app `party-find`, `party-find-mock`, `party-find-full-asked`, `party-sent-requests`, and those `git grep` finds for `PostCard`, `PostScreen`, `ChipRow`, `/boards` and the removed words. `party-boards` goes with the boards, and so do the board routes in `__tests__/support/app.tsx`.

## Out of scope

- Pressing the event line opens the event's detail: wanted, for later.
- The tab titles' size and the gap under them (the other tab item).
- Storing tags or photos on the server, and what to do with the stand-in tags.
- 내 파티, the room, the 파티 form and the 행사 tab, which have their own items.

## Decided while building (2026-11-26)

- The 모집글 leaves out the members' faces as well: the wireframe's ③, ⑥ and ⑦ show the members line without them, and in the build that asks the main server the only face was the Leader's, whose Avatar is already above.
- `신청 취소` in the sheet asks first with today's confirm sheet, as 찾기's card did, and the sheet closes before it asks, as it does before the join sheet. The screen's `신청 취소` still withdraws at once.
- The search's names for a screen reader follow 행사's: the magnifier "파티 검색", the field "파티 검색어" (placeholder "파티 검색"), ✕ "검색 닫기". The field does not raise the keyboard by itself, as 행사's does not.
- A card is one button for a screen reader, named by its title, as 내 파티's card is.
- The event line is `blue600`, the design system's blue for words.
- The 모집글 screen's ground is white, as the sheet and the wireframe's ⑦ draw it; it was grey with white cards.
- `없애기` on the screen goes back as `관심 없음` does, to 찾기 when no screen is behind it; before, it only went back.
- In the mock build, the banner of official recruiting stands under the filter row, which stays right under the tabs.
- `ChipRow`'s chip type is now `RowChip`, its count optional.
- Gone with the boards: `boards-screen.tsx`, `board-screen.tsx`, their routes and the layout's slides for them, `useBoardPosts`, `isBoard`, `postedWords`, the boards' "N" mark, and 찾기's count of hidden posts. `boardPosts` and `useBoardRows` stay for the form's sheet of boards.
- `PostCard` is unchanged. Its `onHide` and `onWithdraw` now have no caller, since 찾기 was the only one; removing them is left to a tidy-up.
- The Footer moved from `post-screen.tsx` to `post-footer.tsx`, shared by the screen and the sheet; the content is `post-content.tsx`.

## Acceptance criteria

- [x] `+ 만들기` is centred in the bar (`alignSelf: 'center'`). (Test.)
- [x] 찾기 has no 파티 검색 field, no 모집 중인 파티 heading, no 전체 게시판 entry and no 숨긴 파티 line; `/boards` and `/boards/[board]` are gone. (Test, which fails before the change.)
- [x] The filter row shows 전체 식사 진로 취미 공연 without counts and stays put when the list scrolls; a board shows only its posts, or the empty words. (Test, which fails before the change.)
- [x] The magnifier turns the row into the search field; a search finds across boards; ✕ brings the row back at 전체. (Test, which fails before the change.)
- [x] A card shows the board, the fill, the title, the time and place on their own lines, and the event line when there is one, with no photo, faces or buttons; the Assistant's cards are unchanged. (Test, which fails before the change.)
- [x] Pressing a card opens the 모집글 sheet over 찾기 with the agreed content and today's buttons by role; the 모집글 screen shows the same content. (Test, which fails before the change.)
- [x] 관심 없음 asks with the centred dialog; 숨기기 hides the post and closes the sheet, 취소 keeps it. (Test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build. (Not yet: the orchestrator builds the branch onto the user's phone after the pull request opens.)
- [x] No native file changes; lint, format and types pass on the changed files.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 26 minutes, in one session (reading the code, tests written first and seen failing, the change, the test sweep, the ticket). This is an estimate: gaps under 5 minutes between transcript entries, summed, counted up to the writing of this entry, so the commit and the pull request are left out.
- Tokens: input 27,397,838 (cache reads 27,077,077, cache writes 320,547, uncached 214); output 106,081. No subagents.
