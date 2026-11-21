# 15: 메뉴 모두 보기, every candidate's dishes in one list

Parent: [P04 spec](../spec.md)
Status: in-progress
Blocked by: [13](13-our-marks-recede.md) for the meal Plans' dishes (`Plan.menu`, from P05) and the candidates' tags.

Native files: none. Releases: an app OTA update only.

## What to build

In a meal answer, a chip "메뉴 보기 ▲" in the bottom row opens a list above it (board 23): its title names the meal ("메뉴 모두 보기 · 화 점심"), then one group per candidate in the map's order, each with its number as on the map, its name, its arrival time ("11:53 도착"), and every dish with its price; the pick's group is marked "고른 곳". A press on another group makes that place the pick: the list folds, and the flag, the route, the minutes, and the bar's span move to it, as a press on its tag does. "접기" and the chip again fold it. The chip makes a meal answer's bottom two rows; that is accepted.

## What happens now

- Comparing menus means pressing each candidate; a Plan's dishes reach the phone only as "X 외 N" words.

## What changes

- The chip in the dock's chip row for a meal answer with at least two candidates whose `Plan.menu` holds dishes.
- The list over the bottom row: groups from `answer.plans`, dishes from `Plan.menu`; a price shows only where the data has one, and a group without dishes says nothing rather than a guess.
- A press on a group shows its Plan (`ShownAnswer.show`), as a candidate's tag does.

## Must not break

- The dock at rest (one row) for answers that are not meals; the candidate tags' presses; the camera's fit when the list folds.

## Decided while building (2026-11-22)

- A buffet's own price (`Plan.menu.price`) stands once in its group's header ("12:35 도착 · 1인 6,500원"), and its dishes show no price.
- A candidate without a menu keeps its header and shows no dish rows.
- The chip reads "메뉴 보기 ▲" / "메뉴 보기 ▼" (screen review, 2026-11-22: short, so that two kinds of ticket 16 stand whole beside it); the list's title keeps "메뉴 모두 보기 · 화 점심".
- The chip shows only while the Plan's card is docked; it is the row's last chip, after "지난 답 N개" and the note. The list stands in the docked card above the row, so the card grows and the camera fits again; it folds when another answer comes.

## Acceptance criteria

- [x] A meal answer with four candidates and their menus: the chip opens the list with four groups in the map's order, the pick's marked, each dish with its price. (Integration test.)
- [x] A press on group 2 makes candidate 2 the pick and folds the list. (Integration test.)
- [x] A dish without a price shows its name alone; a meal answer without `Plan.menu` has no chip. (Integration test.)
- [x] The list open on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 40 minutes, an estimate: one session built tickets 13, 15, and 16 together from 01:47 to about 05:30 (most of it waiting on tests and an emulator slowed by the Mac's load; waits for the screen review not counted), and this ticket took about 20% of it. No subagents.
- Tokens: the whole session (13, 15, and 16) output about 262k; input about 221M, nearly all cache reads (see ticket 13). This ticket's share is about 20% of each.
