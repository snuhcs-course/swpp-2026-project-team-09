# 18: "만나고 싶다": when two are free, and where they meet

Parent: [P01 spec](../spec.md) ("The contract", "The gathering calculation"); package B's row 6 (P02 tickets 24 and 25)
Status: ready-for-agent
Blocked by: 17 (the contract's `plan` action)

## What to build

"민수랑 만나고 싶어", or the "만나고 싶다" button on a Friend's card, shows on the time band when the two are both free and draws a meeting place on the map. The place is chosen where the time together is longest, as a meal's is, from the places people gather and the two people's buildings (row 6, boards a5 and a6; design section 5). The band's busy stretches say what they are ("302동 수업", "수업", "일정"), so that a dragged band shows whom it clashes with.

## Acceptance criteria

- [ ] `MeetInput` (`kind: 'meet'`, the date, the people, the window, and the Place) joins `PlanInput` on both sides. `PlanAnswersService` plans it, and `POST /assistant/answers` recalculates it.
- [ ] The candidates are the Restaurants open that day, the libraries of the study-space list, 학생회관, and the two people's buildings.
  - Each person sets out by the gathering's rules. A Friend seen through the Timetable only sets out from the building where their Class ends; one with no position is counted without a walk.
  - The time together runs from the latest arrival to the earliest leave-by.
- [ ] The answer is an `AnswerReply`, worded and drawn as a meal's, and each Plan has its `title` and `subQuests` (the meeting).
  - a5: 302동 앞 12:15–12:43, 28 minutes, then 301동 앞, 27.
  - a6, from 14:00: 신양학술정보관 앞 14:00–15:20, 80 minutes, then 학생회관, 73.
- [ ] A `planMeet` tool joins the chat for an app with the capability `meet`, and `context-lines.ts` writes a meet on screen as it writes a meal.
- [ ] `TimeBand.lanes[].busy[].label?` on both sides: "302동 수업" for a Class with a Place, "수업" without one, "일정" for a Sub Quest. Every Plan's band gets it.
- [ ] Unit tests on the worked examples; integration tests at the endpoint and the recalculation.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, sections "만나고 싶다" and "A busy stretch's words".
2. **The shortest time together** that counts is 15 minutes, as a meal's.

## Comments
