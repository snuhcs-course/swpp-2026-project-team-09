# 65: An answer without a plan keeps its time card

Parent: [P05 spec](../spec.md); the user's phone report of 2026-11-27. "+ 같이" on a lunch plan answered "같이 비는 시간이 없어요" and the time card was gone, so the Friend could not be taken out again. "배고파" during a Class did the same.
Status: ready-for-human
Blocked by: nothing. The app side is P01 ticket 31.

Native files: none. Releases: the main server; the app reads it once P01-31 is out.

## What happened

- A plan's time card is drawn from `plan.band`.
- An answer with no plan had `plans: []` and a `noPlan` with only its reason and lines. So the card had nothing to draw, and the "+ 같이" and the window could not be changed again.

## What changes

- `AnswerReply.noPlan` gains an optional `band`, the same type as `Plan.band`. No capability is added; an app before P01-31 ignores it.
- It is set on every no-plan answer of a meal, a meeting, a study together and a new party, whatever the reason: no-menu, no-fit or no-shared-time.
- Each kind's answer builder adds it, so the chat's first answer, a recalculation and a plan among several requests all carry it.

| Kind | Where | Window (`startAt`–`endAt`) | Rows |
| --- | --- | --- | --- |
| Meal | `mealAnswer` → `mealNoPlanBand` | The meal's window (lunch 11:00–14:30, dinner 17:00–19:30) narrowed by the said from/until; the meal's own window when that leaves none | `lanes`, `others` (walk null), `skipped` |
| Meeting | `meetAnswer` → `meetNoPlanBand` | The day's 09:00–22:00 narrowed by the said window; the day's hours when that leaves none | `lanes`, `others` (walk null) |
| Study together | `studyGroupAnswer` → `noPlanBand` | The group study rooms' hours narrowed by the said window, on the date asked | `lanes`, `others` (walk to 관정관) |
| New party | `newQuestAnswer` → `askerBand` | The band its plan would have had: the time asked and its stay | `lanes` |

- In every kind, `startAt` is now, rounded up to the minute, when the window has already begun.
- `range` is the half hours around the window. The plan of a new party keeps its own range, from an hour before.
- Only the asker's and their Friends' days are read, as before.

## Acceptance criteria

- [x] Each kind's no-plan answer carries the band, through the chat and through a recalculation. Integration tests, failing before the change:
  - `assistant-no-plan-band-meal` (meal);
  - `assistant-no-plan-band` (meeting, new party, study together).
- [x] The meal's paths:
  - "배고파" in a Class;
  - "+ 같이";
  - a narrowed window;
  - a Class left out;
  - a price and a kind of food;
  - a fixed Place with no Restaurant;
  - a day without menus.
- [x] The band's edges: before, within and after the window, and a window that ends before it starts. Unit test `no-plan-band.unit.test.ts`.
- [x] `test/fixtures/no-plan-band.json` is the "+ 같이" answer as the server gives it, with example ids and day. The app's P01-31 copies it unchanged. The meal integration test checks the real answer against it.
- [x] The tests that compared a whole `noPlan` compare it without its band (`test/no-plan.ts`).
- [x] The whole of the main server's lint, format and types pass.
- [ ] Evals not run: there is no model key on this machine, and no prompt changed.

## Not covered

- Three other kinds also answer with no plan and have a time card on their plans:
  - a study alone (`study-plan.ts`);
  - events (`event-answer.ts`);
  - joining a party (`quest-answer.ts`).
- They were outside the four kinds this ticket names.
