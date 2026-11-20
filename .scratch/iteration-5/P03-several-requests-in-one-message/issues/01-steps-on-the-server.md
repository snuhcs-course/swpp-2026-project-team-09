# 01: Steps on the server

Parent: [P03 spec](../spec.md); a tester's feedback of 2026-11-21 and a run of the message through the real model on `5.0/Main` (85b26ea1) the same night
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: the main server only. An app that does not know `steps` ignores it.

## What happens now

- `Presented` holds one `answer` drawn on the map, the last a tool put there, and the cards beside it (`main-server/src/assistant/feature.ts`). Nothing in the reply orders a book card against the answer.
- `proposeLibraryBooking` answers a refusal to the model only. The reply carries no card and no other trace of it.
- `planMeal` takes no start place from the model. The meal's origin is the Place the User chose on screen, else the Place of the item before the meal (`originOf` in `gathering/gathering.ts`), else the location. A seat shown in the same message is not one of the User's items.
- The pick's line when a nearer Restaurant closes first (`closingLines` in `gathering/unmet-words.ts`) says `canArriveAt`, the earliest the User could reach the pick, which can be hours before a dinner the User set.

## What changes

### The contract

`ReplyStep` in `dto/answer.dto.ts`, and an optional `steps: ReplyStep[]` on the reply, sent only when there are two or more:

- `kind`: `seat` or `room` for a booking, or the plan input's kind (`meal`, `meet`, `events`, `quests`, `new-quest`).
- `title`: "7층 7A 열람실 2 구역", "학생회관식당에서 저녁"; for a meal with no plan, "점심" or "저녁".
- `place` and `from`, as `PlacePoint`s; `startAt` and `endAt`, Korea time with the offset; each null when unknown.
- `status`: `shown` or `not-done`, with `reason` for a step not done.
- `shows`: the library card's key, the answer, or nothing.

### The steps

A new module, `steps/plan-steps.ts`:

- A book card is a step at 관정도서관 (62-1동), from its date, start and minutes.
- A booking `proposeLibraryBooking` refused is a step not done, with the refusals' reasons joined (`noteNotDone`, only for an app that draws answers).
- The answer is a step: its first Plan, or the meal it could not plan, with `noPlan`'s lines as the reason.
- The steps come in time order; a step with no time comes last.

### A meal after another step

- The step a meal follows is the latest step at a place, on the meal's day, that starts before the meal may start (`windowOf`).
- Its place becomes the asker's `from` constraint, and its end (or its start, with no end) the asker's `notBefore`, both with `source: 'asker'`. A User's own start, named or kept from the screen, is left as it is.
- `planMeal` applies it from the steps shown before it, so that the plan the model reads, and words, is the plan the app shows.
- `Feature.afterRun`, run once the model has stopped and before the reply is made, plans the meal again when the model planned it before the step it follows, or in the same step. It then puts the steps in the reply.
- `planMeal` takes `startPlaceId`, the Place the User says they set out from ("220동에서 출발해서"), found with `resolvePlace` in the same message.

### The model's instructions

`STEPS_RULES`, for an app that draws answers: do every request, each with its own tools; do them in time order, calling a later one's tool only after the earlier one's tools have answered; never work out a later step's start; a booking before a later step ends at that step's time unless the User gave its end or length; when a tool refuses one, do the others and say which one could not be done and why; one short sentence for each, in time order.

### The arrival line

The line names the meal's start: "3식당 · 14:00 도착" for a lunch from 14:00 that the User could reach at 13:53.

### The evaluation set

- `eval/cases/several-steps.yaml`, in the P4 world asked from an app that draws answers: the seat and dinner today, the same asked the day before (the seat refused), and dinner alone.
- A `steps` check in `expect` and the scorer (`eval/checks.ts`): each step's kind and status, in order, and the label of the Place it sets out from; an empty list is a reply with none.
- The P4 world gains 중앙도서관 관정관 (62-1). Its frozen travel fixture is made by hand from straight lines; 관정관 is taken as 중앙도서관 본관 plus 60 seconds, the two being about 60 m apart.

## What stays as it is

- A reply to one request: no `steps`, and the same answer as before (a meal sets out from the Class before it).
- The plain chat of an app that does not draw answers.
- The booking card and its rules. Nothing is booked until the User presses 예약하기.

## Acceptance criteria

- [x] A seat and then lunch in one message: the reply has the book card, and two steps in order (the seat, shown, at 62-1동 from 11:00 to 13:00; then the meal, shown, from 62-1동). The meal's origin is 62-1동 with the basis `chosen`, and it starts at 13:00 or later. (Integration test.)
- [x] The start shows as the chip "62-1동에서", and the conditions sent back hold `from` 62-1동 and `notBefore` 13:00. (Integration test.)
- [x] The model reads the lunch it plans after the seat as the app shows it, from 62-1동. (Integration test.)
- [x] The model planning lunch before it shows the seat gives the same steps and origin. (Integration test.)
- [x] A start the User names for the meal is kept. (Integration test.)
- [x] A seat asked for the next day: its step is `not-done` with "당일만 예약할 수 있어요", and lunch is still planned from 62-1동. (Integration test.)
- [x] Lunch alone, and a seat alone, have no `steps`; lunch alone sets out from the Class before it. (Integration test.)
- [x] Time order, the step a meal follows, a User's own start kept, and a refused booking's times. (Unit tests.)
- [x] The arrival line says the meal's start. (Unit test, which fails on the old line.)
- [x] The evaluation's `steps` check. (Unit tests.)
- [x] Through the real model (`pnpm eval --world p4-answer --category several-steps`, Claude Haiku 5.5 on OpenRouter, once each): both two-step cases give the seat and then dinner from 62-1동 at 19:04, the refused seat with its reason, and dinner alone no steps. The model's sentence names the same dinner as the answer.
- [x] oxlint, Prettier and tsc pass on the main server.

## Comments

### The real model before and after (2026-11-21)

Before (85b26ea1, the P4 world from an app that draws answers, two runs): the model called the library tools and `planMeal`, two of them together. Asked for today, the seat card was shown and dinner had no plan because of the world's 18:00 event; asked for the next day, the seat was refused and the reason was only in the text, which the app hides under a drawn answer.

After (three runs on Monday's world, USD 0.04): today, `findLibrarySpace`, `proposeLibraryBooking`, then `planMeal`, in that order; the reply's steps are the seat (17:30–19:00) and dinner at 학생회관식당 from 62-1동 at 19:04, and the text says the same. Asked the day before, the seat is `not-done` with "열람실은 당일만 예약할 수 있어요" and dinner is from 62-1동 at 19:04. Dinner alone is at 301동식당 from 301동 at 19:00, with no steps. A run in between, before `planMeal` applied the steps itself, showed the model's sentence naming the dinner it planned first (301동식당) while the answer had been planned again from 관정; that is why `planMeal` now chains in place. The two cases that call `planMeal` without a scorer tool are marked known failures of the action check, as the meal-clock cases read; their steps checks pass.

### Agent usage (2026-11-21)

- Agent time: about 25 minutes in one session, from the first read of the code to this pull request (an estimate from the transcript). It covers the reproduction through the real model, the server change, the tests, and three evaluation runs.
- Tokens: output 113k; input 40.6M, of which 40.2M cache reads, 424k cache writes and 336 uncached. One subagent (the app's answer screen, read only) is included.
