# 42: A meal's start is never a Class that has ended

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server. An app change follows for the start's words (below).

## What happens now

Reported on 2026-11-23 at about 12:40, the debug build against Production. Lunch asked around noon started from 301동 at 10:45, the end of the first Class: "10:45 301동 수업 끝" on the bar, "10:45 301동" on the map. The User had left that Class or never gone.

- `originOf` (`gathering/gathering.ts`) chooses where each person sets out from:
  - what the asker chose;
  - else the Place of the item that keeps them until the stretch starts;
  - else the Place their position falls in.
- A free stretch that has begun starts at now (`freeTimeOf`), so at noon the morning's Class is the item *before* the stretch, not one that keeps them. Then:
  - when the request had no position but said why (`locationMissing`: `permission` or `off-campus`), the previous item's Place "however long ago it ended", marked `assumed` ("위치를 몰라 직전 수업의 301동에서 출발로 잡았어요");
  - otherwise the previous item's Place when it ended at most 15 minutes ago (`RECENT_CLASS_MINUTES`), else nowhere known.
- The app sends a position only inside the campus rectangle. Off campus it sends `off-campus`, and without the permission `permission`.

## What to build

The rule for the asker of a meal:

1. An item of theirs going on now, ending now, or between now and the meal is where they set out from, at its end, as today.
2. Otherwise they set out now, from their position when the request carries one.
3. With no position, where they set out from is unknown. An item that has already ended is never the origin, however recently: the User may never have gone, or may have left long ago.
4. A meal on another day counts only that day's items before the meal, as today.

Further:

- The `assumed` origin, its card line "위치를 몰라 직전 …에서 출발로 잡았어요" and its chip mark are gone: nothing produces them any more. Board n13, which assumed the Class's building without the location permission, now plans with no origin for the asker. The 위치 켜기 offer stays.
- **Ending now.** The worked example asks at 11:50, the minute the asker's Class ends. An item that ends at the minute asked still keeps them there (rule 1). Only one that ended before now is never the origin.
- **A Friend is planned as before.** With no visible location, a Friend is at the Place of an item that ended at most 15 minutes ago. The same function serves both, but the asker's reason does not carry over to a Friend: an asker can turn the location on, and a Friend's 15 minutes is the worked example's design. This is a follow-up if wanted.
- **The same pattern elsewhere, as follow-ups:** the asker of a meet, a seat's arrival (`seat-arrival.ts`), and events (`event-fit.ts`) call `originOf` with the 15-minute rule.

## The start's words (an app change)

- The bar's and the face's "10:45 301동 수업 끝" and the map's "10:45 301동" are the app's words.
  - They are built from the band's busy stretches (the last one that ends before the Plan) and the asker's `origin.place.label` (`meal-marks.ts` `startWords`, `mark-rows.tsx` `faceLineOf`, `time-band.ts` `bandEdgesOf`).
- With an unknown origin the reply has `origin: null`, so the map's start label goes with no app change.
- With the position as the origin (`origin.basis: 'location'`), the map's label still pairs the old item's end with the position ("10:45 301동"). It should say the position, such as "지금 · 내 위치". That is the Map session's change. The bar and the face are the Frame session's, if they should not name an ended item as the start.

## Case table

The clock is pinned at 12:00 on Tuesday 2026-11-17 in the unit tests, and at 12:00 on Tuesday 2097-09-03 in the integration test.

| Row | Case | Origin | Where tested |
| --- | --- | --- | --- |
| 1 | A Class ended two hours ago, with a position in 302동 | the position, now | `gathering-origin.unit.test.ts`; `assistant-meal-origin.integration.test.ts` |
| 2 | A Class ended two hours ago, no position (off campus, or no permission) | unknown | the same two files (the integration test fails on 5.0/Main, which planned from 301동) |
| 3 | A Class ended five minutes ago, no position | unknown | `gathering-origin.unit.test.ts`; `meal-answer-missing-inputs.unit.test.ts`; `assistant-missing-inputs.integration.test.ts` |
| 4 | A Class ending at the minute asked | its Place | `gathering-origin.unit.test.ts`; the worked example, unchanged |
| 5 | A Class going on now | its Place, at its end, whatever the position | `gathering-origin.unit.test.ts` |
| 6 | A Class between now and the meal | its Place, at its end | the same file |
| 7 | Nothing that day | the position, or unknown without one | the same file |
| 8 | A meal on another day | the item before the meal that day, as today | unchanged tests |
| 9 | A Friend, a Class ended 15 minutes ago, no visible location | its Place, as before | `gathering-origin.unit.test.ts` |
| 10 | Board n13 at 12:30, no permission, the Class in 301동 over at 11:50 | unknown, no origin chip, 위치 켜기 offered | `meal-answer-missing-inputs.unit.test.ts`; `better-plan.integration.test.ts` (the better Plan after a decline) |

## Acceptance criteria

- [x] Rows 1 to 10, each in a test; rows 2 and 3 fail on 5.0/Main.
- [x] The `assumed` origin and its words are removed, and the tests of board n13 follow.
- [x] Board n12 (asked two minutes after a Class in 24동 ended) now sends the position at 24동, where the board has the User. Without it, the Class that ended is no longer where they are.
- [x] An eval case, `meal-wish-after-class-no-position`, asks five minutes after a Class with no position. It is written, not run.
- [ ] The app's start label for a start from the position (the Map session).
- [x] Lint, format and types of the main server pass.

## Comments
