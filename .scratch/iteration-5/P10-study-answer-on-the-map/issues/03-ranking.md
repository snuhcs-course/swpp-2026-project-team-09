# 03: Ranking the study places: one plan per building, known-open first

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02

## What to build

- A `StudyPlanService` (beside `lookup/study.service.ts`), reusing `studyDayOf`, `stayAt` and `byStay` from `lookup/study-near.ts`.
- The candidates are the spaces that fit `what` and that the User may use. A restricted space goes to `dropped` with its label, as today.
- Within `area` when it is set, else the whole campus.
- Each space's state at the arrival comes from 01's `openAt`:
  - `closed` goes to `closed`, with the notice "오늘 HH:MM에 닫았어요" or "HH:MM에 열어요";
  - `open` and `unknown` are candidates.
- There is one plan per building. Its first space is the best by stay, and `study.spaces` lists the others that fit.
- The plans are ordered known-open first, then unknown, each by `byStay`. A stay ends at the space's closing when that comes before the next item.
- Lines, basis, scene, band and chips are as in the spec. The scene's pick is the first plan, the candidates are numbered, dropped is faded, and the way and the next item are drawn as for a meal.
- None at all gives `noPlan` with why: nothing fits in the area, everything is restricted, or everything is closed (with when the first one opens).
- `POST /assistant/answers` reruns it for a `study` input.

- A study input with Friends is ticket 07's; this ticket's ranking is the answer alone.

## Built (2026-11-27)

- `lookup/study-plan.ts` ranks, `lookup/study-plan-parts.ts` makes each plan's fields, and `lookup/study-plan.service.ts` reads what they need. `StudySpacesService.hoursOf` gives a space's state from its schedule.
- **Ranking:** a stay of three hours or more counts as long enough. Within each group, the plans go by the longest stay, then by the shorter walk. So with nothing following, the shorter walk decides, as the spec says, and a stay cut short by a closing ranks lower.
- **The stay** ends at the earliest of:
  - the walk on to the next item;
  - `window.until`;
  - the space's closing.
  With none of them known, or a space open around the clock, it is three hours.
- **When the User is ready:** at `window.from`, at 09:00 of another day asked without a time, or now. Where they are counts only when they set out now. A `from` constraint names where they set out from.
- **`openAt`** (ticket 01's) now also does two things:
  - A close that the next day's opening follows at once is no close. A space open around the clock has `closesAt: null`.
  - A closed space gives `closedAt`, its last close today, for "오늘 23:00에 닫았어요".
- **Restricted spaces:** a building whose fitting spaces are all restricted is dropped. One with a usable fitting space is a plan, and its restricted rooms are left out of `study.spaces`.
- `study.book` stays `null` until ticket 05.
- The fixture of ticket 02 (`test/fixtures/study-answer.ts`) follows these rules.

## Acceptance criteria

- [x] At 10:00 on a term weekday: known-open before unknown, each by the longest stay up to three hours, then the shorter walk. A restricted space is dropped for a User outside it and a candidate for one inside it. A closed one is in `closed`. (Unit tests on the seed, `test/study-plan.unit.test.ts`, with the 2026 holidays known.)
- [x] At 23:30: the 24-hour spaces first, 관정 in `closed` with "오늘 23:00에 닫았어요". With nothing open or unknown, `noPlan` says when the first opens.
- [x] With `area`: only the spaces in it; with none there, `noPlan` "보는 범위에 공부할 곳이 없어요".
- [x] A recalculation with a new `from` gives the same order rule from that time. (Integration test, `test/study-plan-answers.integration.test.ts`.)
