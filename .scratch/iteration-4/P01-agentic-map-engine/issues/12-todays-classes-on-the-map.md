# 12: Today's Classes on the map

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: None for the server; the app's part after 11 (#270)

## What to build

"오늘 수업 뭐 있어?" is answered on the map: today's Classes numbered in order at their buildings, the walks between them, and in the card the day's count, the Free Time between them, and the minutes of each walk (wireframe row 7, board q14).

## Acceptance criteria

- [ ] A tool answers today's (or a named day's) Classes as a Lookup of kind `day`, for an app with the `answer` capability.
- [ ] Tuesday 10:30 at Kwanjeong, with Classes 11:00–11:50 in 301동, 13:00–13:50 in 24동, and 17:00–18:15 in 58동: the three buildings numbered 1 to 3 with their tags ("11:00–11:50 · 301동"), the walks between them drawn as the next items, the title line "11월 17일 화요일 수업 3개", and the lines "빈 시간 70분, 3시간 10분" and "수업 사이 걸어서 15분, 12분".
- [ ] The card lists the Classes as steps.
- [ ] A day without Classes answers none, and the model says so.
- [ ] The User's Sub Quests are not part of it: only Classes.
- [ ] Unit tests for the words and the scene; integration tests at the endpoint.

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
