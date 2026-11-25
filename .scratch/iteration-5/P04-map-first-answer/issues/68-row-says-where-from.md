# 68: A Friend's row while picking says where they set out from

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #566
Blocked by: none.

Native files: none. Releases: the main server, and an app OTA update.

## What happens now

While picking people in the time card (ticket 64), a Friend not in the Plan has a walk only from the place the Friend view gives now (`locationPlaceOf`). A Friend who shares no location reads "위치 모름", even when their day says where they will be. A busy Friend reads "18:15까지 수업", without the Class's building. A picked person's start is already taken from their day, as the time card's "민수 12:15 302동 수업 끝" shows.

The user's words (2026-11-26, board z3): "5시 30분에 예를 들어 함재현이 일정이 있다면, 어디에서 수업이 끝나는지가 안보이는 것 같네 … 위치 모름이라고 되어 있기는 한데, 사실 5시 30분에 어디에서 수업 끝이라고 하는게 더 정보가 많지 않나?"

## What to build

1. The main server finds where each Friend in `others` sets out from for the Plan. It uses the planner's own rule for a picked person (`originOf`), with no second rule. The Free Time stretch is the one that holds the Plan's span, or, for a Friend busy at its start, the one they come free in. `walkMinutes` is the walk from there. When it is an item's Place, the lane's new `after` says that item as a busy stretch's label: "83동 수업", "수업", or "일정", never a name.
2. A row's right side, on one line that is never cut, the department giving way:
   - free, after an item: "83동 수업 뒤 · 걸음 3분";
   - busy over the span: "18:15까지 16동 수업", the building when the Class has one, "…까지 일정" or "…부터 일정" for a Quest's step;
   - from where the Friend view puts them: "걸음 4분";
   - neither: "위치 모름".
3. The order's nearness uses the same walk.
4. Older apps and older servers keep working: `after` is optional.
5. The mock gives its Friends a building each and sends `after` for a Class that ends before the Plan.

The planner's rule reads a stretch that starts after now from the item before it, however late the Plan falls in it. So at 18:30 on board z3, 김태현 and 안진영 read as at 17:00 when nothing lies between, not as the board's "걸음 4분" and "위치 모름".

## Acceptance criteria

- [x] The four cases at 17:00 and at 18:30 come from the main server's rule (`other-friends` unit tests) and read as on the board in the app (`people-picking-where-from`).
- [x] A busy Friend's Class names its building.
- [x] The longest words stay on one line, the department cut instead.
- [x] An `others` lane reveals nothing a picked person's lane and words do not.
- [x] No native file changes; lint, format, and types pass on the app and the main server.

## Comments

Built in PR #566. The main server reuses `originOf` for `others` (`setOutOf`), and the app says the item and the walk at a row's right. App screens wait for the sessions emulator, which another session was using.

### Agent usage (2026-11-26)

- Agent time: about 21 minutes in one session, test runs included (an estimate).
- Tokens: input 37,691,927 (cache reads 37,571,412, cache writes 120,369, uncached 146); output 74,804. No subagents.
