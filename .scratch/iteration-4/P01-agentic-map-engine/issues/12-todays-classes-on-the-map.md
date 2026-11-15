# 12: Today's Classes on the map

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: None for the server; the app's part after 11 (#270)

## What to build

"오늘 수업 뭐 있어?" is answered on the map: today's Classes numbered in order at their buildings, the walks between them, and in the card the day's count, the Free Time between them, and the minutes of each walk (wireframe row 7, board q14).

## Acceptance criteria

- [x] A tool answers today's (or a named day's) Classes as a Lookup of kind `day`, for an app with the `answer` capability.
- [x] Tuesday 10:30 at Kwanjeong, with Classes 11:00–11:50 in 301동, 13:00–13:50 in 24동, and 17:00–18:15 in 58동: the three buildings numbered 1 to 3 with their tags ("11:00–11:50 · 301동"), the walks between them drawn as the next items, the title line "11월 17일 화요일 수업 3개", and the lines "빈 시간 70분, 3시간 10분" and "수업 사이 걸어서 15분, 12분".
- [x] The card lists the Classes as steps.
- [x] A day without Classes answers none, and the model says so.
- [x] The User's Sub Quests are not part of it: only Classes.
- [x] Unit tests for the words and the scene; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The contract gains two optional fields**, on both sides:
   - `MapScene.places[].order?: number`, the number a place carries in a list (1, 2, 3). It is also used by ticket 13.
   - `Lookup.steps?: { at: string | null; text: string }[]`, the list the card shows under the lines.
   The Lookup's `kind` gains `day`.
2. **The action** is a leave-by notification (`remind`) for the first walk of 5 minutes or more still ahead. Until package D's notification exists, the app draws none (ticket 11).
3. **Course names** are not in the Lookup or in what the model is given: a Class is its time and building, as Friends see it, so the answer could be shown to anyone looking at the phone.

## Lines in other packages' files (for the app's part, after #270)

- Package B, `mobile/src/features/assistant/answer-marks.ts`: a place with `order` draws its number in the dot, as a Plan's pick does (one line in `placeDraft`).
- Package A's own `mobile/src/screens/main/answer/lookup-card.tsx` (#270) draws `steps`. The user's rule applies: a list of equal-width cells, the time at the left and the text at the right.

## Comments

### Decisions taken in the build (2026-11-15)

1. **The steps** are the day's Classes in order, each `at` its span ("11:00–11:50") and `text` its building ("301동"). A Class without a Place is listed as "장소 없음" and drawn nowhere; the others keep the number of their place in the list, so that the map's numbers match the steps.
2. **The scene.** Each Class's building is a place of role `next`, as a way draws the User's next item, tagged "11:00–11:50 · 301동" and numbered by `order`. The walks between consecutive Classes in different buildings are routes of role `next`. No person is drawn: the answer does not depend on where the User is, and the app draws the User's own position. No flag and no band, as board q14 has none.
3. **The lines.** The title line "11월 17일 화요일 **수업 3개**", then the Free Time between consecutive Classes ("빈 시간 70분, 3시간 10분": under two hours in minutes, else in hours and minutes; Classes that touch leave none), then the walks between them ("수업 사이 걸어서 15분, 12분"). A day's Lookup has three lines, so the contract's "At most two" became "At most two, after a day's title" on both sides.
4. **The basis** is each walk: "301동 → 24동 걸어서 15분".
5. **The leave-by notification** is for the first walk of 5 minutes or more whose leave-by time is later than now rounded up to the minute, as ticket 07's decision 9 has it: at 10:30 on board q14, "지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분" at 12:45, in a way's words. A later day's walks are all ahead. With none, the Lookup has no action.
6. **No chips.** The board's "오늘" chip needs a kind of chip the contract does not have (`origin`, `until`, `person`), and the title line already names the day.
7. **What the model is given**: the date, each Class's start, end, and building, `freeMinutes`, and `walkMinutes`; no course name, room, id, or coordinate. `DAY_RULES` sends "오늘 수업 뭐 있어?" to findDay, not getMyDay, keeps the reply to one sentence without listing the Classes or calling showOnMap, and has the model say that there is no Class when findDay answers none. findDay takes a day from today to a week ahead, as getMyDay does.
8. **The code.** The words and the scene are `lookup/day-lookup.ts` (`dayAnswer`), the reads `lookup/day.service.ts` (`DayLookupService`), and the tool with its rules `lookup/day-tools.ts` (`findDay`, `DAY_RULES`).
9. **The app.** The contract gained `MapScene.places[].order`, `Lookup.steps` (`LookupStep`), and the kind `day` on both sides. The reply check takes the kinds from a record the compiler holds to `Lookup['kind']` (`isKeyOf`, now exported from `plan-answers.ts`), a step as a text or null and a text, and a place's `order` as a number when it has one. The copy `mobile/src/api/mock/data/day-lookup.json` was written by the server's `dayAnswer` over the seed's Places and walking table, for board q14 on Tuesday 2026-11-17 at 10:30, with the asker's id of the meal copies; the reply check passes it, and the mock answers no message with it.

### Where the data differs from the boards

- Board q14 matches the seed: 301동 (제1공학관) → 24동 (자연과학관6) is 895 seconds (15 minutes), and 24동 → 58동 (SK경영관) 682 seconds (12 minutes).
- The chip "오늘" is left out (decision 6), and the User at 관정 is not drawn (decision 2).
- "나설 때 알림" is the leave-by notification at 12:45, which the board does not time.

The tests were run on the build machine and pass: `day-lookup.unit.test.ts` (11), the endpoint's `assistant-day.integration.test.ts` (2), and the app's `day-lookup.unit.test.ts` (5), with lint, typecheck, and format of both projects.

### For the app's part (after #270)

- Every Class is a place of role `next`, which `answer-marks.ts` keys by `answer:next:<placeId>`: two Classes in one building share that id until the drawing keys a numbered place by its `order`.
- The card draws `steps`; the `remind` action waits for package D's notification, as ticket 11 has it.
