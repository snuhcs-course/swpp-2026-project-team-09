# 26: Steps are marked by kind; numbers mean candidates alone

Parent: [P03 spec](../spec.md). Builds on ticket 25 (#739, merged) and ticket 24 (the steps' colours).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update.

## Why

On the user's phone, the numbers meant two things. With "관정에서 공부하다가 저녁 먹을래", ② on the map and on the steps card was the second step, dinner. In dinner's list, ① was its first candidate. So 학생회관식당 was ② on the map and ① in the list. Also, a step's other candidates were in its list only, never on the map.

The user chose board 가 of the step-numbers boards ("가안이 좋아보여"). Numbers mean candidates alone, and steps are marked by their kind's icon. He then dropped the arrows on the route line ("우선 화살표는 빼고 진행해보자"). The order is told by the flags' times alone.

## What changes

- **The step shown is drawn as its answer or booking alone.** Its parts are the same shared parts, with nothing forked for steps:
  - **An answer step with a Plan** is the answer's own map (`useAnswerMap`): its pick, its numbered candidates, which a press chooses, and its pick's press (menu, spaces, or the pick's card). The other steps are a prop of that shared part (`Beside`). They are drawn in the answer's drawing (`drawingOf`'s `beside`), so its labels keep clear of them and its camera keeps them in sight. A press on one makes it the step shown (`use-map-view.ts`, `use-answer-map.ts`). `answerStepDrawn` (`step-press.ts`) says when, and `OpenMark` opens that answer's pick card even while the seat's booking is on screen.
  - **The seat's step with its booking on screen** is the booking's scene alone (`useBookingNow`, as a seat card alone), with the other steps beside it. A press on its pick raises the card, as a booking alone does.
  - **A step with no drawing of its own** (a room, a step not done, an answer with no Plan) leaves the steps alone, every step as its mark (`stepsAlone` in `steps-made.ts`).
- **Steps carry no number anywhere.**
  - The steps card reads each step's kind's icon, word and time ("공부 17:30–19:00"). Its accessible name is the word and time.
  - On the map, a step not shown is one solid round in its kind's colour holding its kind's icon. Its flag is "name ›" with its time, as before. A step not done stays a small grey round with no icon.
  - Each kind's icon comes from the one table of kinds (`kindTone`), beside its colour (`stepIcon` in `answer-tone.ts`): the book for study (seat, room, study plan), the fork and spoon for a meal, the calendar for events, people for Quests and a new Quest, and the person for meet. The 관정 booking's round already held the book; it is now the same part, an icon in a pick's round (`icon` on a dot, `map-answer.tsx`).
- **The step choices are settled.** Ticket 24's first open choice (`bookingStepHolds`, whether a seat's round holds a number or the book) is settled by the user's choice, and the function goes. Ticket 25's menu and pick presses on a step's flag go too: the step shown's own pick takes them now.
- **Marks beside a drawing are drawn as they come** (`drawingOfScene`). A step's mark beside an answer keeps its single "›" and its look; before, the answer's drawing added a second "›" and restyled it as the meal's pick (found on the emulator, and in TaeHyun79's review). After 그대로 두기 the kept Quest's drawing keeps the other steps too (`keptDrawingOf`, the same review).
- **Test ids replace the numbers.** Tests find a step's words by `step-word-N`, since no number is shown.
- **For length:** `looksOf` moved from `answer-marks.ts` to `answer-looks.ts`.

## Not built

- **Arrows on the route line:** dropped by the user for now.
- **The ways between steps** are each drawing's own. The meal shown draws its walk from the step before (its `from`). The seat shown draws the User's walk to 관정. The leg to a step not shown is not drawn.

## Acceptance criteria

- [x] The steps card reads each step's word and time with no number, two 공부 steps told apart by their times. (Integration test, `answer-steps-icons`.)
- [x] The seat shown is its booking alone, and dinner beside it is its kind's mark; no mark on the map carries a step's number. (Integration test, `answer-steps-icons`.)
- [x] Dinner shown is its answer alone: its candidates are numbered on the map, a press on one chooses it in the list, and a press on the seat's mark chooses the seat. (Integration test, `answer-steps-icons`.)
- [x] 공부 → 밥 → 공부: the study place shown draws its own candidates, and a press on the other 공부 step's mark chooses it. (Integration test, `answer-steps-icons`.)
- [x] Each kind's round holds its kind's icon from `kindTone` and no number; a step not done holds none. (Unit tests: `features/step-marks`, `design-system/map-answer-study`, `marker-looks-answer`.)
- [x] The step press rule and when the step shown is its answer's own map. (Unit test, `step-press`.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 1 hour 10 minutes, an estimate: one session's time from the boards to the PR, test runs included, pictures not yet.
- Tokens: input about 68.4M in all: 268 uncached, cache writes about 0.26M, cache reads about 68.1M. Output about 138K. No subagents.
