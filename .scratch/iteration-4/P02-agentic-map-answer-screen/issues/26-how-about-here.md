# 26: During a Plan, a pressed building answers "여기면 어때?": each person's arrival and the time together there

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a7 and a8, notes (4) and (10); design section 5, question 8
Status: ready-for-agent
Blocked by: 22 (the press on a building); package A's earliest arrival per person and a fixed Place's words (row-6-seams, ticket 26)

## What to build

- **The press.** With a meal's Plan on screen, a press on a building sends the conditions on screen with `placeId` set to that Place to the recalculation (a fixed Place is planned today, `assistant/gathering/meal-plan.service.ts:85`). The pill shows the Place with the pin icon. The answer on screen stays underneath, unchanged.
- **The card "여기면 어때?"** (the kicker in the Quest colour), titled with the Place: one row per person, the name at the left and "HH:MM 도착" at the right (the part's `arriveAt`), or "지금 여기 있어요" for one who is there already; the note "{start}–{end} 함께 N분 · 지금 계획보다 M분 짧아요" ("M분 길어요", or "지금 계획과 같아요"), from the two Plans' times; "여기로 바꾸기" (main) and "그대로".
- **A Place that does not fit** (no Plan, the Place among `dropped`): the kicker in the warning colour, the rows from the dropped Place's parts, the server's two lines, and "그대로" alone.
- **The map**: the pressed Place highlighted; the Plan on screen's pick stays, numbered, tagged "지금 계획 · {name}"; each person's line to the pressed Place; the User's line to the Plan's pick faded (`alt`).
- **"여기로 바꾸기"** puts the new answer on screen in place of the old, as a recalculation does. **"그대로"**, the pill's ✕, and Android's back return to the Plan on screen (row 1 board g2) with its camera and band as they were.
- A press on a face during the Plan still adds the Friend (holds, P02-09).

## Acceptance criteria

- [ ] **a7**: "배고파" with 민수 and 지은, the Plan 학생회관식당 12:33–12:55 (22 minutes, meeting 민수 at 301동 at 12:18), 자하연식당 pressed: rows 나 "12:35 도착", 민수 "12:35 도착", 지은 "12:18 도착"; the note "12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요"; "여기로 바꾸기" and "그대로". "여기로 바꾸기" shows 자하연식당's Plan as the answer on screen (row 1 board g3).
- [ ] **a8**: 301동식당 pressed: rows 나 "지금 여기 있어요", 민수 "12:18 도착", 지은 "12:31 도착"; the lines "지은은 12:31에 도착해 13분만 먹어요" / "13:00 수업에 가려면 12:44엔 나서야 해요" in the warning colour; "그대로" alone.
- [ ] The request is the conditions on screen with `placeId` changed and nothing else; a Place with no Restaurant open for the meal answers with the server's lines and "그대로" alone.
- [ ] "그대로", ✕, and back return to the Plan on screen without a request; the Plan's arrows, band, and chips are as before.
- [ ] The mock answers a7's and a8's recalculations with copies of the main server's real replies.
- [ ] Integration tests at the main screen over the fake main server of a7 and a8 down to the request, "여기로 바꾸기", and the three ways back.
- [ ] The screen is run on an Android emulator, and the pull request carries boards a7 and a8.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a7 and a8; note (4) (each person's arrival as a row) and note (10) (✕ and "그대로" return to the Plan, row 1 g2).
- Only a meal's Plan: no board presses a building during a meet or an events answer.
- "지금 계획보다 M분 짧아요" is worked out by the app from the togetherMinutes of the two Plans it holds; every other word is the server's.
