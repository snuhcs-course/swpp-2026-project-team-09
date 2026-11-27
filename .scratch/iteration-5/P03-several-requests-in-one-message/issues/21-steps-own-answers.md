# 21: Each step shows its own answer

Parent: [P03 spec](../spec.md). Builds on ticket 20 (the conversation's answers kept by key) and P10 ticket 29 (the steps follow the answer on screen, PR #706).
Status: ready-for-human
Blocked by: nothing to build. It shows on the phone once ticket 22 says `answers`; until then the main server sends one answer, and every step draws as before.

Native files: none. Releases: an app OTA update.

## What changes

- **The answer on screen is the chosen step's.** When the steps name their answers by key, the step chosen gives the answer on screen its own answer. That covers the time card, the map's emphasis, the chat card's body and the main button. `AnswerState` holds the key, and `fresh` takes the chosen answer (`features/assistant/answer-state.ts`, `use-shown-answer.ts`).
- **Each step's answer is kept by key** (`screens/main/use-step-answer.ts`). Each step keeps what its answer became on screen, a recalculation and the plan last on, under its key. It comes back when the step is chosen again, and it goes into the next request (ticket 20's `context.answers`). A later reply that gives the answer again replaces the kept one.
- **The steps as they stand** (`features/assistant/steps-scene.ts`) take every keyed step's answer as last on screen. A step without a key keeps #706's rule.
- **The reply that holds an answer** (`features/assistant/answer-holder.ts`). A bubble holds the answer on screen when it is its one answer or one of its `answers`. The headline, the words, the plan outcomes and the app's own turn ask this.
- **The emulator's mock** answers three messages with the main server's own replies of several answers (`api/mock/data/several-answers.ts`): "점심이랑 저녁 짜줘", "관정에 있다가 저녁" and "아침 7시에 도서관 갔다가 점심".

## The screen rules (decided by the user on 2026-11-28)

The user took every recommended answer ("우선 모두 권장대로 진행해줘. 그 다음에 직접 써보면서 피드백을 할게.") and will change them from use. Each is one small function in `features/assistant/step-choice.ts`, or named where it lives.

| # | When | The step chosen | Where |
| - | ---- | --------------- | ----- |
| 1 | After a follow-up | The first step, in step order, whose answer the reply drew or changed. If none, the step chosen before while it is still there. Otherwise the step due first. | `chosenOnReply` |
| 2 | The first reply of several | The step due first. A plan chosen in words (`select.key`) wins, here and in rule 1. | `chosenOnReply` |
| 3 | Coming back to a step | Its plan last on, with its answer as last recalculated. A step never seen opens at its first plan. | `useStepAnswer`, `firstSeenIndex` |
| 4 | An answer step not done with no plan | That answer's no-plan card, as a single answer draws it. A refused booking draws as today. | the single-answer path |
| 5 | A step withdrawn | It leaves, since the steps are the last reply's whole; the reply's words say why. | ticket 20's fold |
| 6 | While Friends are picked ("+ 같이") | No other step is chosen. | `mayChooseStep` |
| 7 | A Lookup or a words-only reply | The steps card stays, its chosen step still gold. The Lookup takes the map for that turn, and its card stands under the steps card in the time card's place; words alone put nothing there. The next reply that draws an answer brings the chosen step's card back. | ticket 23 |
| 8 | "+ 새 대화" | The answers, the kept recalculations and the step chosen are dropped. | `useStepAnswer` (by the conversation's first bubble) |

Steps without keys keep the rule of before: a main server before P05 ticket 74, or an app that does not say `answers`, gets the step due first on every new reply.

## Not here

- The chosen step's top card drawn by the single-answer path, the seat's BookingBar included, and rule 7's look: ticket 23.
- The step marks drawn by the shared per-kind marks: ticket 24.
- Saying `answers`: ticket 22.

## Acceptance criteria

- [x] Choosing a step puts its own answer in the time card, and choosing back brings the first. (Integration test, `answer-steps-own-answers`.)
- [x] A step chosen again comes back at the plan last browsed in it. (Integration test, `answer-steps-own-answers`.)
- [x] A plan chosen in words opens at its step. (Integration test, `answer-steps-own-answers`.)
- [x] Rules 1, 2 and 6, by their partitions. (Unit test, `features/step-choice`.)
- [x] A single answer, steps without keys and #706's live steps behave as before. (The existing steps, sheet and booking tests, unchanged.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 70 minutes, an estimate: this ticket's share of one session's active time, which also built P03-23 and P05-78, and the emulator pictures.
- Tokens, by the same share: input about 95M, of which cache reads about 94.6M and cache writes about 0.38M; output about 193K. No subagents.
