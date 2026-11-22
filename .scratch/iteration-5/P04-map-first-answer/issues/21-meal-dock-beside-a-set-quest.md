# 21: A meal answer beside a Quest already set keeps its kinds and its list

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([20](20-kept-quest-on-the-map.md) and [16](16-food-kinds-and-meals-on-the-bar.md) merged).

Native files: none. Releases: an app OTA update only.

## What happens now

A meal answer carries its kinds of food as chips and 메뉴 모두 보기 in its dock (tickets 15 and 16). Beside a Quest the User already holds, the same meal answer docks as a reply instead: its line ("이미 12:16 302동식당 점심이 있어요. 바꿀까요?") and 그대로 두기 in one row (ticket 17), with no kinds and no list. The candidates are on the map, but the User cannot narrow them by kind or read their dishes before 바꾸기.

## What to build

One rule: a meal answer always carries its kinds and its list, whatever its line.

- **Two rows** beside a Quest already set:
  - The line alone on the top row: up to two lines, the full width, its "›" as today.
  - Below it one chip row, where an ordinary meal answer's chip row sits: 그대로 두기 first, then the kind chips scrolling sideways (with "지난 답 N개" and the note after them), and 메뉴 보기 pinned at the right.
  - Then the input and the main button (바꾸기 or 파티 보기) as today.
- **Disabled** (the kinds, the list's picks, and 그대로 두기) while 바꾸기, a Plan's sending, or a recalculation is on its way.
- **Removed** with the Plan's marks after 그대로 두기, after a meal made or a meeting changed by 바꾸기: the line says what now stands, and no kind or list is left to act on.
- **Not a meal** (a meeting already set): no kinds, no list, the row as today.

## Acceptance criteria

- [ ] Beside a lunch already set, the dock has the line alone on its top row, then 그대로 두기, the kinds, and 메뉴 보기 in one row; a kind chosen filters the candidates as in an ordinary meal answer, and 메뉴 보기's list picks a candidate. (Integration test.)
- [ ] The kinds, the list, and 그대로 두기 disabled while 바꾸기 or a recalculation is on its way; after 그대로 두기 or 바꾸기, no kinds and no 메뉴 보기. (Integration test.)
- [ ] Beside a meeting already set, the row as today. (Integration test.)
- [ ] The line has its own row above the chips. (Layout check.)
- [ ] A lunch beside a lunch already set, a kind chosen, and 그대로 두기, on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 20 minutes in this session (an estimate from the transcript's timestamps, 15:12–15:32): the two rows test-first, the sweep of the dock's tests, and the layout check rewritten. No subagents.
- Tokens: an estimate from this session's use over that stretch: output about 25k; input about 20M, of which almost all cache reads, about 60k cache writes, and about 100 uncached.
