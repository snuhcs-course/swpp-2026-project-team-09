# 74: The steps of a conversation cover every answer, and a later step sets out from the one before it

Parent: [P05 spec](../spec.md). Today a reply has steps only when a 관정 book card or a refused booking is in it, and only a meal is planned again after a seat or a room. "점심이랑 저녁", "저녁 먹고 그 행사" and "관정에서 공부하다가 저녁" each give one answer and no steps, and a follow-up that moves the seat leaves the meal at the seat's old end. Also fixes faults 3–6 of the corner-case review of 2026-11-27 (C2, G6, G5, A2, A4).
Status: ready-for-human
Blocked by: ticket 73.

Native files: none. Releases: the main server. The app draws the steps by key in a later ticket of its own; until then nothing changes on any installed app beyond the fixes listed for every app.

## What changes

### For an app that says `answers` (`steps/all-steps.ts`)

- **The steps are the conversation's.** The app sends back the steps on screen (`context.steps`, whole and in order) with every answer's conditions (`context.answers`). The reply's `steps` are those steps, with this message's answers and bookings in place of those of the same request and the new ones after them. A booking takes the place of one of the same unit that day. Steps come in time order, whenever there are two or more. An answer's step names its answer by key: `shows: { kind: 'answer', key }`.
- **A step that can move** (meal, meet, study place) sets out from the place of the step before it, not before that step ends.
  - The constraints are the asker's `from` and `notBefore`, now with `source: 'step'`. The server drops them and sets them again whenever that step changes; a start the User named (`asker`) holds. That is fault C2.
  - A study place now reads `notBefore` too (`readyAt`).
  - A step on screen follows the step before it there. A new one follows the latest step that starts no later than it does.
  - It sets out from no step when a Class or Quest of the asker's lies between them; a Class left out does not count.
- **Every step whose conditions change is planned again** through the planner of `POST /assistant/answers`, including one on screen that this message did not name. The reply gives that answer again by its key; unchanged ones are not resent. A step that could not be planned again stays as it was, `not-done`, with "앞 일정이 바뀌었는데 다시 짜지 못했어요".
- **The keys on screen are paired with their conditions by order.** A recalculation may change an answer's conditions into another request (a Friend added, the bar's other meal); ticket 73 answers it with its new key. The server never rebuilds an on-screen answer's key from its conditions: it pairs `context.answers` with the answer steps by order. It names this message's answer of the same request, and a request withdrawn, by the key on screen, so an app that kept an old key still works.
- The steps sent back are counted once each; an answer's step without a key is left out.
- **A step at a fixed time** (events, Quests, a new 파티) never moves. When it starts before a step before it ends, it stays a step, `not-done`, with "앞 일정이 HH:MM에 끝나 제때 갈 수 없어요", and a step on screen is judged again. Only the steps done keep the User busy: a refused seat or an event out of reach holds no time.
- **While the model plans a meal** (`planMeal`), it already sets out from the step before it: a meal on screen's step before there, or else the step a meal follows (A2 below).
- **Which kinds move** is one table, `STEP_KINDS` in `steps/all-steps.ts`. A new kind is added there, where the compiler asks for it, and to `Movable` when it moves.

### For every app

- **G6:** one request is one step. A refusal is left out once a seat or room of the same unit that day is booked in its place, and of two refusals of the same space the last stands (`bookingSteps`).
- **A2, by time alone:** a meal follows a step at a place that starts before an hour-long meal could come first in its window, whatever order the model called the tools in. A seat from 17:30 comes before dinner ("5시 반부터 관정 있다가 저녁"); one from 19:00 after it ("저녁 먹고 7시부터 관정") (`stepBeforeMeal`).
- **A4:** an answer's step without a plan comes after the steps that have one, in the order they came (`stepOrder`).
- **G5, decided in code:** the plan set out from the step before stands. When it is another plan than the one the model worded (another first plan, another time, or none), the model's words stay whole, and one short sentence is added for that step alone, with its day when that is not today: "앞 일정에 맞춰 13:05 학생회관식당에서 점심으로 바꿨어요." Nothing is added when nothing differs (`movedStepSentence`, `Presented.addedWords`).
- **"Too soon" chip:** a meal with the asker's `notBefore` and no time asked was told of a morning Class as "too soon" to eat before. "Nothing fixed" now also means no `notBefore` or `leaveBy` (`gathering/unmet-plans.ts`).
- The chat's steps wiring moved from `chat-assistant.ts` to `chat/chat-steps.ts`; the reply's words go through `saidText` (`wordless-reply.ts`).

## Decided for the user's review

These were decided by the orchestrating session, or here where noted, and may be changed:

- which kinds move and which are fixed;
- an unreachable fixed step stays as not done rather than vanishing;
- a Class between two steps keeps the later one from setting out after the earlier;
- a booking replaces one of the same unit on the same day;
- G5: the server's plan stands, the model's words stay, and one sentence per changed step is added (decided by the orchestrating session, wording included);
- A4: plan-less steps go last (decided here).

## Known limits and follow-ups

- An app before `answers` still keeps a chain as the User's own (`asker`), so on a follow-up its meal keeps the old seat end (C2). It cannot tell them apart.
- `planMeet`, `planStudy` and `planStudyGroup` are set out after the step before them only once every tool has run, not while the model plans; the steps then say the plan in the model's place.
- A study place or meet asked with no time has no start of its own before it is planned, so a new one is set out only after a step that starts before its plan.
- Two seats on one day are one booking request on screen.
- Requests that share a key: two meets of one day ("점심은 A랑, 저녁은 B랑 만나"), two new 파티 of one day, and two study requests of one day both alone or both together. The second replaces the first.

## Acceptance criteria

- [x] Lunch then dinner: two steps by key, dinner from lunch at its end, whichever the model plans first; a Class between keeps dinner from it; an app without `answers` gets no steps. (Integration test, `assistant-steps-chain`.)
- [x] Dinner then an event: shown when it can be reached, not done with its reason when not. (Integration test.)
- [x] A seat then a study place from 관정 at the seat's end. (Integration test.)
- [x] A seat from 17:30 shown before dinner sets dinner out from 관정; a seat from 19:00 booked first leaves dinner before it; both apps. (Integration test, failing before.)
- [x] A follow-up that shortens the seat plans lunch again from its new end, gives it back by its key and gives every step; one that moves dinner later brings the event on screen back as not done without giving its answer again. (Integration test, `assistant-steps-follow-ups`, failing before.)
- [x] Lunch planned before the seat stands as planned again; the model's words stay whole, the shuttle's time included, with one sentence for lunch, for both apps; nothing is added when the plan worded is the one drawn. (Integration test, failing before.)
- [x] Dinner asked again finding nothing beside lunch on screen: dinner named withdrawn, no `clears`. (Integration test, failing before.)
- [x] The chained dinner has no "too soon" chip. (Integration test, failing before the fix.)
- [x] The step before, a Class between and left out, the User's own start, a moved step, a chain without its step, both sources, the step a meal follows by time, a study place's ready time, and the steps on screen sent back with nothing changed. (Unit test, `all-steps`.)
- [x] The booking steps' de-duplication, the order of a plan-less step, a changed plan and the sentence added for it. (Unit test, `steps-of-a-message`.)
- [x] A study place recalculated into one together keeps its key and is planned again, never doubled; a request withdrawn beside one kept; a refused seat holds no time and an event out of reach blocks nothing after it; a step not planned again is not done; steps sent twice or without a key; an answer changed into another request stays in its place. (Unit test, `steps-follow-ups`, failing before.)
- [x] The seat + meal steps of today are unchanged. (`assistant-plan-steps.integration`, untouched.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 70 minutes, an estimate from this session's transcript (gaps under 5 minutes). That covers the first version on 2026-11-27, the rework for the corner-case review (keys, the conversation's steps, faults C2, G6, G5, A2 and A4) past midnight, and the fixes for the independent read of #703 and #710. Its pinned integration files ran one at a time in the background for about 3 hours in all besides, while the session worked on.
- Tokens: input 60M, of which 59.7M cache reads, 0.25M cache writes and about 260 uncached; output 185k. No subagents.
