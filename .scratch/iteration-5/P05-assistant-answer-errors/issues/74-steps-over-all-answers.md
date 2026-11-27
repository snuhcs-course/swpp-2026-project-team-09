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
- **Every step whose conditions change is planned again** through the planner of `POST /assistant/answers`, including one on screen that this message did not name. The reply gives that answer again by its key; unchanged ones are not resent.
- **A step at a fixed time** (events, Quests, a new 파티) never moves. When it starts before a step before it ends, it stays a step, `not-done`, with "앞 일정이 HH:MM에 끝나 제때 갈 수 없어요", and a step on screen is judged again.
- **While the model plans a meal** (`planMeal`), it already sets out from the step before it. That is a meal on screen's step before there, or else the latest step this message showed before it that starts before the meal's window ends (fault A2: "5시 반부터 관정 있다가 저녁"). The model is told to call the tools in time order.

### For every app

- **G6:** one request is one step. A refusal is left out once a seat or room of the same unit that day is booked in its place, and of two refusals of the same space the last stands (`bookingSteps`).
- **A2:** a meal set out after a booking shown before it, even one that starts inside the meal's window (`afterStepsShown`).
- **A4:** an answer's step without a plan comes after the steps that have one, in the order they came (`stepOrder`).
- **G5, decided in code:** the plan set out from the step before stands. When it is another plan than the one the model worded (another first plan, another time, or none), the reply's words are the steps' own, one short sentence each (`stepsSentence`, `Presented.retold`).
- **"Too soon" chip:** a meal with the asker's `notBefore` and no time asked was told of a morning Class as "too soon" to eat before. "Nothing fixed" now also means no `notBefore` or `leaveBy` (`gathering/unmet-plans.ts`).
- The chat's steps wiring moved from `chat-assistant.ts` to `chat/chat-steps.ts`; the reply's words go through `saidText` (`wordless-reply.ts`).

## Decided for the user's review

These were decided by the orchestrating session, or here where noted, and may be changed:

- which kinds move and which are fixed;
- an unreachable fixed step stays as not done rather than vanishing;
- a Class between two steps keeps the later one from setting out after the earlier;
- a booking replaces one of the same unit on the same day;
- G5: the server's plan stands and the words give way (decided here);
- A4: plan-less steps go last (decided here).

## Known limits and follow-ups

- An app before `answers` still keeps a chain as the User's own (`asker`), so on a follow-up its meal keeps the old seat end (C2). It cannot tell them apart.
- `planMeet`, `planStudy` and `planStudyGroup` are set out after the step before them only once every tool has run, not while the model plans; the steps then say the plan in the model's place.
- A study place or meet asked with no time has no start of its own before it is planned, so a new one is set out only after a step that starts before its plan.
- Two seats on one day are one booking request on screen.

## Acceptance criteria

- [x] Lunch then dinner: two steps by key, dinner from lunch at its end, whichever the model plans first; a Class between keeps dinner from it; an app without `answers` gets no steps. (Integration test, `assistant-steps-chain`.)
- [x] Dinner then an event: shown when it can be reached, not done with its reason when not. (Integration test.)
- [x] A seat then a study place from 관정 at the seat's end. (Integration test.)
- [x] A follow-up that shortens the seat plans lunch again from its new end, gives it back by its key and gives every step; one that moves dinner later brings the event on screen back as not done without giving its answer again. (Integration test, failing before.)
- [x] Lunch planned before the seat stands as planned again, and the steps say it. (Integration test, failing before.)
- [x] A seat inside the dinner window, shown first, sets dinner out from 관정, for both apps. (Integration test, failing before.)
- [x] The chained dinner has no "too soon" chip. (Integration test, failing before the fix.)
- [x] The step before, a Class between and left out, the User's own start, a moved step, a chain without its step, both sources, the step shown before, a study place's ready time, and the steps on screen sent back with nothing changed, which come back whole and plan nothing again even with a constraint the User added after the chain. (Unit test, `all-steps`.)
- [x] The booking steps' de-duplication, the order of a plan-less step, a changed plan and the steps' words. (Unit test, `steps-of-a-message`.)
- [x] The seat + meal steps of today are unchanged. (`assistant-plan-steps.integration`, untouched.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 50 minutes, an estimate from this session's transcript (gaps under 5 minutes): the first version on 2026-11-27, then the rework for the review (keys, the conversation's steps, faults C2, G6, G5, A2, A4) past midnight. Its pinned integration files ran one at a time in the background for about 2 hours in all besides, while the session worked on.
- Tokens: input 41M, of which 40.8M cache reads, 0.17M cache writes and about 200 uncached; output 120k. No subagents.
