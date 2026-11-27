# 19: A study place opens in the meal answer's view of a Restaurant

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Pull request: see the P10-19 PR
Blocked by: 18; the main server's 24 for the button

Native files: none. Releases: an app OTA update, though no answer reaches it until the app says `study-plan` (ticket 23).

## What to build

The approved board's ③ ("공부할 곳 후보 화면", 2026-11-27): a press on a study place opens the meal answer's view of a Restaurant (`MealMenu`), not a copy of it for study.

1. A press on a row of the list, or on the chosen place's mark, opens that place, as a meal answer's opens its Restaurant.
2. The view is the meal's:
   - "‹ N곳 목록" back to the list;
   - the place's number, in the study colour;
   - its building.
3. Its line is the way there, then until when and how long the User can stay: "걸음 4분 · 15:50까지 2시간 30분". When the way is not known, its arrival takes the way's place ("19:12 도착 · …").
4. The body is a slot. Where a Restaurant has the meals of its day and its menu, a study place has its spaces, best first, each by name in bold with its hours under it, as the main server words them, or "시간 정보 없음" when it gives none.
5. No "가는 길" button: the way is drawn on the map, as a meal's.
6. The main button is "일정에 넣기" for a study place alone except 관정, as for a meal alone (`schedulesAlone` in `plan-input.ts`, used by `planActionOf`). It saves the Plan as a Quest taken alone at `POST /plans` (the main server's ticket 24), and the card says its two lines as for a meal. `takenAlone` counts a study alone too, so it sends no 파티 usage data. The mock saves the stored study answer's places the same way.
7. 관정's place opens the same view until ticket 22 makes it the seat ticket.
8. The list's places open but not for this User (ticket 18's restricted rows) stand after the 쉬는 곳 group, outside its heading, with no heading of their own: they are not closed. Until now they sat under "쉬는 곳" (found in the emulator pictures).

## Acceptance criteria

- [x] A row press and the chosen place's mark open the place. (Unit tests, failing before the change.)
- [x] The view's head: the way back, the number in the study colour, the building, and the walk and stay. (Unit test, failing before the change.)
- [x] Each space by name with its hours, or "시간 정보 없음". (Unit tests, failing before the change.)
- [x] "일정에 넣기" for a place other than 관정, none for 관정 or a study together. (Unit test, failing before the change.)
- [x] "일정에 넣기" saves the place and the card says "공대 신양학술정보관으로 가요" over the mocks. (Integration test, failing before the change.)
- [x] The restricted rows stand after 쉬는 곳, outside its heading. (Unit test, failing before the change.)
- [ ] Emulator pictures at font scale 1.0 and 1.3.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

- The main server made a Quest only of a meal's, a meet's, an events' or a new recruiting Quest's Plan, and refused a study Plan with 400 `PLAN_KIND`. Its ticket 24 (PR #677) takes a study Plan alone; this PR merges after it.

### Agent usage (2026-11-27)

- Agent time: about 35 minutes, an estimate, in one session (the view, the button, the restricted rows, and its part of the emulator pictures).
- Tokens, estimated as this ticket's share of that session: input 36M, of which 35.9M cache reads, 0.15M cache writes and under 1k uncached; output 55k.
