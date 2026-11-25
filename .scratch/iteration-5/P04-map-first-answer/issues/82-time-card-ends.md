# 82: The time card's bar says where it starts and ends, and the link to the other meal goes

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #582
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Under a meal answer's bar, "10:45 301동 수업 끝" stands under its own time at the left and "저녁 17:00 ›" at the right, which a press turns into the dinner answer. Nothing says what time either end of the bar is, so a drag of the band has no scale. With a busy stretch after the span, the right end says it instead ("13:00 24동 수업").

The user's decision (2026-11-26), on "저녁 17:00 ›": "나는 필요 없어 보이고 오히려 좀 시간 스케일을 알 수 있도록 하는게 더 좋아 보이는데"; of the two drawn options, "나는 나안이 좋기는 해": the two end times only, with the class note kept.

## What to build

1. Under the bar, the track's start at the left end ("10:30") and its end at the right end ("12:30"), always. No hour ticks.
2. Between them, one note on one line, cut short with "…" before it meets the end time:
   - what bounds the span on the left, after the start time: the busy stretch that ends last before it ("· 민수 12:15 302동 수업 끝"), or now ("· 11:50 지금");
   - only when nothing bounds it on the left, what starts first after it, before the end time ("13:00 24동 수업 ·"), so that the line keeps its one reason;
   - nothing when nothing bounds the span.
   What starts after the span is otherwise on the map, as the dark pill, and on the bar, as the busy block.
3. The other meal's link goes from both sides ("저녁 17:00 ›" under lunch, "‹ 점심 12:16" under dinner): it is asked for in words, which the meal rules cover. The main server still sends `otherMeal` for older apps; this app no longer reads it, and the code and tests that served only the link go (`MealTick`, `mealTickOf`, `otherMealInput`, the parser's check, the mocks' field).
4. The same `Ends` draws every bar under the answer pill: every Plan's (a meal, a meet, the Plans of several requests) and every Lookup's (a menu answer). A seat's bar is `SlotBand`, a different component, and stays as it is.

## Acceptance criteria

- [x] Tests fail on the code before: the two end times (12:00 and 13:15 for the stored meal answer), the left note cut on one line, the right note only without a left one, no note without either, a Lookup's bar; no link to the other meal under a lunch or a dinner answer; `bandNoteOf`.
- [x] `answer-time-bar` and `answer-meet` follow the rule: "13:00 24동 수업" no longer stands under a bar that has a left note.
- [x] An answer whose main server sends `otherMeal` is still believed.
- [x] No native file changes; lint, format and types pass on the app.

## Comments

Built in PR #582.
