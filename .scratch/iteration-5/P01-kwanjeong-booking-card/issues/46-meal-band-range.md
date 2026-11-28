# 46: A meal's time bar runs over the stretch the meal can be eaten in

Parent: [P01 spec](../spec.md). Found on 2026-11-28 at 16:01 on the user's phone (released app 26.11.28-11/12): "13:00 뒤로 시간바를 움직이려 했는데 안되더라". Lunch's bar ran 10:30–13:00 and could not be dragged later. His earlier complaint about the study bar was the same, and ticket 43 gave every other kind the one range rule.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only. Installed apps draw whatever range they get.

## What was wrong

Ticket 43 left a meal on its old bounds, `aroundSpan`: from an hour before its span to half an hour past it. A lunch at 11:30–12:30 got 10:30–13:00, however long lunch was served and whatever the asker had that day. A meal with no plan had the window asked alone as its range, so a lunch asked "13:00까지" with no plan could not be dragged past 13:00 either.

## What changes

`mealBounds` (`band-range.ts`) gives a meal its bounds as a study's are its place's hours. They go through the same `bandRange`: today from now, the 16-hour cap, 23:30, and the window the User fixed and the time a Class left out frees held whole.

- **Opens** at the end of the asker's item before the plan, no earlier than the meal is served.
- **Closes** at the start of their next item, no later than the meal is served.
- **Served** is the meal's window (lunch 11:00–14:30, dinner 17:00–19:30). Where the plan's Restaurant serves longer, it is that window; it is never narrower, since the Restaurant's own window may be the one the User fixed.
- **A meal with no plan** (`mealNoPlanBand`) runs over the same bounds around its window, so the window can be dragged off where it found no plan.

| Case | Range now | Was |
|---|---|---|
| A Class before (ends 11:40) and after (13:30), lunch 12:00–13:00, asked the day before | 11:30–13:30 | 11:00–13:30 |
| The worked example: Classes 11:00–11:50 and 13:00–13:50, lunch 12:33–12:55 at 11:50 | 11:30–13:00 | 11:30–13:30 |
| Nothing that day, lunch 11:30–12:30 asked the day before | 11:00–14:30 | 10:30–13:00 |
| The user's: a Class until 10:45, "13:00까지", lunch 11:30–12:30 on Monday | 11:00–14:30 (13:00 held, no end) | 10:30–13:00 |
| Today at 11:50, a Class until 10:45, lunch 12:00–13:00 | 11:30–14:30 | 11:30–13:30 |
| With Friends: their Classes are drawn in their lanes within the asker's range, which they do not bound | as the asker's | as the span's |
| Dinner late: 19:10 today, dinner 19:10–19:30 | 19:00–19:30 | 19:00–20:00 |
| The Restaurant serves to 15:00 | to 15:00 | to half an hour past the span |
| No plan, window narrowed to a Class 12:00–13:00 | 11:00–14:30, the Class drawn grey | 12:00–13:00 |

## The fold

Read from the app's `foldedRangeOf` and `bandNoteOf`; the app is not changed.

- The folded track runs from 15 minutes before what bounds the span on the left (the last busy stretch, or now) to 15 minutes after the next busy start, within the range.
- The grey Class blocks inside the range are drawn as before, and the left note ("11:50 수업 끝", "지금") still reads.
- A Class that starts exactly at the range's end is no longer drawn in the bar, as in the worked example's 13:00 Class. The chip "13:00 수업까지" says it.
- A meal's range is at most its window (3½ hours for lunch), unless now or a fixed window reaches further, so the unfolded bar is never the long study bar.

## Tests

- `band-range.unit` (6 new, 1 replaced):
  - a Class before and after;
  - serving start over a Class's end;
  - nothing that day;
  - a fixed until held without ending the range;
  - today from now;
  - a late dinner;
  - a Restaurant serving longer.

  Before the change all failed: there was no `mealBounds`.
- `meal-answer.unit`: the band between the asker's Classes (two cases), and over the whole lunch for an asker free all day (new). These failed before.
- `meal-answer-conditions.unit`: a window inside the bounds stays between the Classes.
- `assistant-meal-others.integration`: the Friends' stretches drawn up to the asker's 13:00 Class.
- `assistant-no-plan-band-meal.integration`: a window narrowed to a Class is drawn over the whole lunch.

  These two failed on the code before the change.

## Acceptance criteria

- [x] The tests above pass. So do the other unit files that pin ranges (`alone-plan`, `assistant-answer-reply`, `choose-plan`, `event-answer`, `meal-adding`, `meal-price-ceiling`, `meal-price-words`, `meet-answer`, `no-plan-band`, `plan-reply`), and `assistant-meal-skip-class`, `assistant-no-plan-band`, `assistant-meal-plan` and `assistant-meal-by-clock` (integration), each run once.
- [x] main-server's lint, types and format pass.
- [ ] On the phone after the Release: a lunch's bar can be dragged to 14:30, or up to the asker's next Class.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 35 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 82.
