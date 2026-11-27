# 18: 내 파티's cards like 찾기's: a board or 비공개 tag, a crown for the 파티 the User leads, the time, the place and the event on their own lines, and tighter groups

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 tab:
- "파티/내 파티 시간, 장소, 행사태그 이런거 한줄로 이어지게 적혀있는거 같은데, 나누는게 좋지 않을까? 그리고 파티가 지정한 위치를, 지도에서 확인할 수 있었으면 좋겠음. … 내가 방장인 파티는 간단하게라도 표시해서 식별되도록 하는건 어떤가."
- From the note on 찾기: "어느정도 모집중인 파티랑 내 파티랑 UI가 통일되는 구석이 있어야 하지 않나?"

On 2026-11-27 the user settled it on wireframes:
- `references/18-1-mine-wireframe.webp`: now and the change, and a 비공개 card as an example.
- `references/18-2-leader-mark-options.webp`: the leader mark, A–E. **C was chosen.**
- `references/18-3-map-entry-options.webp`: the map entry, A–D. **D was chosen.**

The user's decisions:
- The tag: "공개인 경우 게시판이 필수니 게시판 태그를 두면 되고, 비공개인 경우 게시판이 없을테니 대신 '비공개' 라는 태그를 같은 형식으로".
- The leader mark is a crown before the count (C). The first drawing's "👑 방장" chip was turned down.
- The map entry is D: nothing on the card. The room's place row will be the way to the map. How it works waits until the other UI items are done, together with the event line's link ("실제 작동은 나중에 UI개선 다 하고 행사 링크랑 같이 정할게"). So this ticket adds no map entry.
- The gap between groups (오늘, 내일, 활성화 중, …) shrinks "조금만".

Positions are as of `origin/5.0/Main` 6edb1b61, under `mobile/src/`.

- **The card.** `MineCard` (`screens/party/mine-card.tsx:124`) is one row:
  - the kind (`Kind`, `:60`: a two-people or lock icon over "공개" / "비공개", 38 wide);
  - then the title on one line (15 SemiBold, `:188`), with the count at the right (`users` 12, "1/3명" or "2명", `:197`);
  - then one line "when · where" (13 Regular muted, `:199`);
  - then the running-Party strip (`Strip`, `:71`: "활성화 중 · 김민준" with 거절 and 참여);
  - the waiting requests' red circle at the top right (`Waiting`, `:111`).
  - The card is outlined in navy while the User is in its Party (`live`, `:179`). A past Quest's card opens nothing.
- **The view.** `MineCardView` (`features/party/mine.ts:31`) has `title`, `private`, `count` (`countOf`, `:115`: "n/cap명" on a Quest the User leads that recruits, "n명" otherwise), `line` (`lineOf`, `:150`: the next step's time words and place, "장소 미정" without one), `live`, `strip`, `group`, `waiting` and `past`.
  - It has no board, leader or event, though `Quest` has `board`, `leader` and `globalEvent`.
- **The groups.** `useMineList` (`screens/party/mine-tab.tsx:80`) lays the groups out in `body` with gap 20 (`:142`), each `group` with gap 12 (`:143`) under a `SectionHeader` (12 above it, 4 below).
  - So the last card of a group is 32 from the next group's header words.
- **찾기's card** (ticket 12), `FindCard` (`screens/party/find-card.tsx`), is the look to follow:
  - `PostTop` (`post-content.tsx:22`): the board tag (11 Medium, grey ground and border), and the fill at the right;
  - the title in `text.title`;
  - `InfoLine` (`post-content.tsx:48`, `small`): clock with the time on one line, pin with the place on up to two, and the event's calendar line in blue on one, which opens nothing yet;
  - `cardStyles.card`.
- **Tests.** `party-mine`, `party-mine-mock`, `party-mine-activation` (`.integration`) and `features/mine-card-line` (`.unit`).

## What to build

1. **The kind column goes.** The card's words take its full width.
2. **The top line**, as 찾기's:
   - At the left, a tag in `PostTop`'s board look. A 공개 파티 shows its board's name ("취미 게시판"). A 비공개 파티 shows "비공개" in the same tag.
   - A public Quest without a board (old data) shows no tag.
   - At the right, the count as now (`users` and "1/3명" / "2명").
   - On a Quest the User leads, a `crown` stands before the count (wireframe C: crown 14, gold, 4 before the users icon). A screen reader says "방장" with it.
3. **The title** on its own line in 찾기's title style, up to two lines, then "…".
4. **The lines**, with 찾기's `InfoLine` (`small`):
   - the time with `clock`, one line. Its words stay as now, e.g. "17:40 · 23분 후", "내일 19:00", "시간 미정";
   - the place with `pin`, up to two lines, "장소 미정" without one;
   - the event with `calendar` in blue, one line, only for a Quest with a Global Event. It opens nothing, as on 찾기.
   - `MineCardView` gets the fields this needs: the time and the place apart, the tag's words or none, whether the User leads, and the event's title or none.
5. **Kept as they are:**
   - the running-Party strip under the lines (활성화 중 · 거절 / 참여);
   - the navy outline of the live card;
   - the waiting requests' red circle;
   - the press that opens the room, and the past cards that open nothing;
   - the 전체 / 비공개 / 공개 filters and their counts, the groups and their order, the empty states.
6. **Tighter groups:** from a group's last card to the next group's header words is 20 (was 32), e.g. `body`'s gap 20 → 8. The gap between cards (12) and from a header to its first card stay.
7. **No map entry** on the card (D). No words change, apart from the tag and the split line.

## Must not break

- A card's press opens its room. A past card stays unpressable.
- The strip's 거절 asks and declines, and 참여 enters, as now.
- The filters and counts, the group order (활성화 중, 활성화 알림, 다른 활성 파티, 오늘, … 지난 일정), and the empty state per filter.
- The 파티 tab's badge and the waiting count.
- 찾기's card, the Assistant's `PostCard` and the 모집글 (sheet and screen), which share `PostTop` and `InfoLine`: unchanged.
- Tests: those above, `party-find` (`.integration`), and those `git grep` finds for `MineCard`, `MineCardView`, `toMineCards`, `lineOf`, `PostTop` and `InfoLine`.

## Out of scope

- The map entry and how the map shows a 파티's place (the room's place row, later, with the event link).
- The event line's press.
- The room (파티 상세), the 파티 form, and the tab bar (ticket 17).

## Acceptance criteria

- [x] A card has no kind column. A 공개 파티 shows its board tag and a 비공개 파티 a "비공개" tag. (App integration test, which fails before the change.)
- [x] A Quest the User leads shows a crown before its count, named "방장" to a screen reader; other Quests show none. (App integration test, which fails before the change.)
- [x] The title takes up to two lines, and the time, the place and the event stand on their own lines with their icons. The event line shows only for a Quest with a Global Event. (App integration test, which fails before the change.)
- [x] The strip, the live outline, the waiting circle and the presses behave as before. (App integration tests.)
- [x] The gap from a group's last card to the next header's words is 20. (Test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- "방장" for a screen reader: the crown is its own image labelled "방장", as the room's 파티장 crown and this card's waiting circle are. The card's spoken name stays its title, so screen readers and tests find the cards as before.
- The crown is the room's 파티장 gold, `#E8A400`, 14, 4 before the users icon.
- A past Quest the User led keeps its crown and its tag. A Quest without a Leader shows no crown.
- `PostTop`'s tag is now `PostTag({ words })` in `post-content.tsx`, shared by `PostTop` and `MineCard`. `PostTop` draws it as before.
- The card is `cardStyles.card` with 찾기's gap 8 and top padding 12. The strip lost its own 4 above it: the card's gap of 8 spaces it from the lines (it was 2 + 4).
- A place whose label is empty still reads "장소 미정", as `lineOf` did.
- The card tests are in a new `party-mine-cards.integration.test.tsx`. In `party-mine` they would have gone over the 300-line lint limit. `party-mine`, `party-mine-mock` and `features/mine-card-line` now check the time and the place apart.

## Comments

### Agent usage (2026-11-27)

Estimates. Agent time is this session's wall clock from start to this entry, about 20 minutes. About 12 minutes of that were Jest runs, mostly in the background. No subagents. Tokens are counted up to this entry, so the commit and the pull request are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 18 (tests first, `MineCardView`, `MineCard`, the groups' gap, checks) | about 20 minutes | 12,960,848 | 12,784,540 | 176,160 | 148 | 50,144 |

Without cache reads, the input is 176,308.
