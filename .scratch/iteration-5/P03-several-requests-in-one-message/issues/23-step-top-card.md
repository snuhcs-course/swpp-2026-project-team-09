# 23: The chosen step's top card is the one its answer draws alone

Parent: [P03 spec](../spec.md). Builds on ticket 21 (each step shows its own answer) and P01 tickets 22 and 23 (the top's stops, the gold step and its caret, PR #686 and #687).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update.

## Why

The user, on 2026-11-28: with a seat step chosen, the seat's time card should stand under the steps card. He asked for one rule over every kind of step, not a seat fix ("웬만하면 시간 카드가 안나오는 케이스를 찾기 어려울테니까 자리 단계에서만 나오도록 고치지 말고 전반적으로 고쳐줘."). Until now a seat or a room step had a strip under the steps card, and an answer step the Plan's bar only while it was done.

## What changes

- **One rule** (`screens/main/answer/answer-top-card.tsx`, new; `TopBar` moves there from `reply-words.tsx`). `topCardOf` picks the top card of the answer on screen: a booking's card on the map first, else the Lookup's, else the Plan's bar, or the frame an answer with no Plan keeps. A reply to one request draws it as before. Under the steps card, the chosen step draws the same card through the same function (`stepCardOf`, then `topCardOf`).
- **The seat's booking card stands under the steps card** (`time-bar.tsx`): `BookingBar` takes the steps card's `offset` and `caret`, as `PlanBar` does. It folds in the same three stops, and its caret points at the seat's span.
- **The card under the map shows the chosen step's own answer** (`stepPartsOf` in `features/assistant/step-choice.ts`, used by `answer-frame.tsx`). The orchestrating session found it in the pictures: with the seat's step chosen, the card still showed the meal's list, the seat's ticket below it. That followed PR 490's "a seat card of several requests keeps the reply's Plan". Now a seat's or a room's step shows the reply's sentence and its own ticket only, and an answer step its answer's card and no ticket. A step refused shows as before.
- **The steps card draws what it is given** (`steps-bar.tsx`). `StepsTop` takes the card to draw and keeps its strip for a step with none.
- **Rule 7, a Lookup in the turn of several requests** (`lookupTakesTheMap` in `features/assistant/step-choice.ts`). An app that says `answers` gets the steps back with a Lookup's reply. The steps card stays, its chosen step still gold. The Lookup takes the map, its card stands in the time card's place under the steps card, and its button is the dock's. The answers and the steps still go with the next request, and the next reply that draws an answer brings the chosen step's card back. Words alone keep the steps card and put nothing under it. It applies only to steps that name their answers by key: a main server before `answers` can send a booking's steps beside a Lookup, which stay as they were (TaeHyun79's review).
- `BookingBar` and its card moved from `time-bar.tsx` to `booking-bar.tsx`, which keeps both files under their line limit.

## The top card of each kind of step

| Step | What the step shows | Its top card under the steps card |
| ---- | ------------------- | --------------------------------- |
| meal | its answer | the meal's Plan bar, with "+ 같이" and the meal's tick |
| study | its answer | the study's Plan bar; the 관정관 booking card once its Plan opened it (P10 ticket 27) |
| events, quests, a new Quest, meet | its answer | that answer's Plan bar |
| an answer step not done | its answer | its no-plan frame, as that answer alone keeps it (ticket 21, rule 4); with steps that name no keys, nothing |
| seat | its book card | the booking's time card, while it stands: not while the booking is on its way or once it is booked, nor when no time is left that day |
| room | its book card | **none: open point.** A room's booking is not drawn on the map (`shownBookingOf` takes a seat's card only), so the step keeps the strip. |
| a booking refused | nothing | none: the strip |

## Acceptance criteria

- [x] The seat step chosen draws its booking's time card under the steps card, which folds in the three stops; a step with no top card keeps the strip. (Integration test, `answer-step-top-card`.)
- [x] Rule 7: a Lookup with the steps takes the map and the place under the steps card, which stays with its step chosen, until a reply draws the steps again. (Integration test, `answer-step-top-card`.) Only for steps keyed by answer; it failed before for a booking's steps beside a Lookup. (Unit test, `features/step-choice`.)
- [x] The seat step's time card carries the caret at the seat's span. (Integration test, `answer-steps-gold`.)
- [x] The card under the map is the seat's ticket alone for the seat's step and the meal's list alone for dinner's; it failed before the fix. (Integration test, `answer-step-top-card`; unit test, `features/step-choice`.)
- [x] Which card each kind of step draws from, by the table's partitions. (Unit test, `step-top-card`.)
- [x] A reply to one request draws its top card as before. (The existing time card and booking tests, unchanged.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 30 minutes, an estimate. One session built this beside P03-21 and P05-78; this is its share of that session's active time.
- Tokens, by the same share: input about 41.0M, of which cache reads about 40.6M and cache writes about 0.16M; output about 83K. No subagents.
