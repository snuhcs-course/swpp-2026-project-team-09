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

- [x] **a7**: "배고파" with 민수 and 지은, the Plan 학생회관식당 12:33–12:55 (22 minutes, meeting 민수 at 301동 at 12:18), 자하연식당 pressed: rows 나 "12:35 도착", 민수 "12:35 도착", 지은 "12:18 도착"; the note "12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요"; "여기로 바꾸기" and "그대로". "여기로 바꾸기" shows 자하연식당's Plan as the answer on screen (row 1 board g3).
- [x] **a8**: 301동식당 pressed: rows 나 "지금 여기 있어요", 민수 "12:18 도착", 지은 "12:31 도착"; the lines "지은은 12:31에 도착해 13분만 먹어요" / "13:00 수업에 가려면 12:44엔 나서야 해요" in the warning colour; "그대로" alone.
- [x] The request is the conditions on screen with `placeId` changed and nothing else; a Place with no Restaurant open for the meal answers with the server's lines and "그대로" alone.
- [x] "그대로", ✕, and back return to the Plan on screen without a request; the Plan's arrows, band, and chips are as before.
- [x] The mock answers a7's and a8's recalculations with copies of the main server's real replies.
- [x] Integration tests at the main screen over the fake main server of a7 and a8 down to the request, "여기로 바꾸기", and the three ways back.
- [x] The screen is run on an Android emulator, and the pull request carries boards a7 and a8.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a7 and a8; note (4) (each person's arrival as a row) and note (10) (✕ and "그대로" return to the Plan, row 1 g2).
- Only a meal's Plan: no board presses a building during a meet or an events answer.
- "지금 계획보다 M분 짧아요" is worked out by the app from the togetherMinutes of the two Plans it holds; every other word is the server's.

### Decisions (2026-11-16)

Details the ticket left open, listed so that any of them can be vetoed.

1. **The pressed Place is marked as the building press marks it** on the everyday map (the pick's dot, without a number), and the Plan on screen's pick keeps its number with the tag "지금 계획 · {name}". Drawing the pressed Place as the scene's pick would have given it the Plan's number too. The Plan's candidates, dropped places, and flags are not drawn meanwhile: each person's line goes to the pressed Place, and the User's line to the pick is faded (`alt`).
2. **The map while asked** is the Plan on screen with its scene replaced (`askingAnswer`), so the camera fits the people, the pressed Place, and the pick as it fits any answer, and fits the Plan again on the way back ("그대로", ✕, back).
3. **What takes a press**: buildings take a press only while a meal's Plan is on screen and was not sent ("이대로 초대"). While a Place is asked about, a press on another building asks about that one instead, and a press on a mark or a face does nothing; otherwise a face still adds the Friend and a candidate still shows its Plan. Every press on a mark keeps its tap from counting as a press on a building.
4. **The title** of the card and the pill is the Restaurant the answer planned at or dropped ("자하연식당 2층", "301동식당"); while it is asked, the building as its card names it ("301동", "자하연식당"), with "보는 중이에요".
5. **The rows**: "지금 여기 있어요" for a person whose walk is 0 minutes, "HH:MM 도착" from the part's `arriveAt`, and "위치를 몰라요" without one.
6. **"여기로 바꾸기"** recalculates the conditions on screen with the Place fixed through the answer on screen's own `change`, as any change of the conditions does, so the card closes and the answer's card shows the recalculation; its answer is the same as the one shown (a second request). This keeps `use-shown-answer.ts` as it is.
7. **A failure** of the request closes the card with the recalculation's toast ("다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요"), and the Plan stays.
8. **The pill's ✕ and Android's back** go back to the Plan while a Place is asked about, and forget the conversation as before otherwise.
9. **The mock** answers a building pressed at its own 자하연식당 (`place-109`) and 301동 (`place-301`) with the copies of a7 and a8, besides their server ids.

### Checked on an emulator (2026-11-16)

On the Android emulator (1080 × 2400), a development build on the mock with its campus walk, the switch on, the AI input filled with "배고파" by a local change that was not committed:

- "배고파" gave the Plan with 민수; a press on a third Friend's face added the third person, and the mock's stored three-person answer came: 학생회관식당 12:33–12:55, 22 minutes.
- A press on 301동 opened board a8: the pill "301동식당" with the pin, the kicker in the warning colour, 나 "지금 여기 있어요", 민수 "12:18 도착", 지은 "12:31 도착", the two lines in the warning colour, and "그대로" alone; the map kept "지금 계획 · 학생회관식당" numbered 1, ringed 301동, and drew each line to it and the User's line to the pick faded.
- A press on 자하연식당 opened board a7: "자하연식당 2층", 12:35, 12:35, and 12:18 도착, "12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요", "여기로 바꾸기" and "그대로".
- "그대로" and the pill's ✕ each returned to the Plan with its card, band, and camera; "여기로 바꾸기" put 자하연식당 2층's Plan on screen (12:35–12:55, 20 minutes), as board g3 shows. Android's back is checked in the integration test.
- A press near 자하연 first found the mock's pond spot (자하연), which the mock answers with its three-person copy; on a main server every building answers by its own Place.

### Agent usage (2026-11-16)

One session (package D's), no subagents, from branching off ticket 23 to the pull request, with the merges of ticket 23's branch and `4.0/Main`.

- Agent time: about 25 minutes, an estimate from the transcript's timestamps (active stretches, gaps of five minutes or more left out, so the waits for tests and the emulator's load are not counted).
- Tokens: input 47,973,355, of which 47,833,517 cache reads, 139,672 cache writes, and 166 uncached; output 66,230.

