# 03: Ranking the study places: one plan per building, known-open first

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
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

## Acceptance criteria

- [ ] At 10:00 on a term weekday: known-open before unknown, each by the longest stay. A restricted space is dropped for a User outside it and a candidate for one inside it. A closed one is in `closed`. (Unit tests on the seed.)
- [ ] At 23:30: the 24-hour spaces first, 관정 in `closed` with "오늘 23:00에 닫았어요". With nothing open or unknown, `noPlan` says when the first opens.
- [ ] With `area`: only the spaces in it; with none there, `noPlan` "보는 범위에 공부할 곳이 없어요".
- [ ] A recalculation with a new `from` gives the same order rule from that time. (Integration test.)
