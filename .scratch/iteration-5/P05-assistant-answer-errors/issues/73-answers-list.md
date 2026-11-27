# 73: A reply keeps one answer per request of the message

Parent: [P05 spec](../spec.md). "점심이랑 저녁 짜줘", "저녁 먹고 그 행사 가자": a reply has one answer slot, so the last planner wins and lunch is lost, though the model's words may still describe it.
Status: ready-for-human
Blocked by: ticket 72.

Native files: none. Releases: the main server. The app draws the list in a later ticket of its own; until then nothing changes on any installed app.

## What changes

- **Capability `answers`.** Only an app that says it gets `answers` in the reply; `answer` stays for every app and means what it means today (the answer a tool put there last, which a Lookup after it takes away).
- **One answer per request.** An answer replaces one of the same request and is added after the others otherwise. A request is its kind and day, and for a meal the meal, for a study plan alone or together; Quests are those of one Global Event.
- **Per write site:**

| Site | `answer` (every app) | `answers` |
|---|---|---|
| a planner, a menu found | the new answer | replaces the same request or is added |
| a Lookup (day, way, hours, Friend, study nearby, tutorial's order, menu not found, 관정 closed) | null | kept |
| a meal invited to, a meal over for today | null, `clears` | that request leaves |
| canceling a Quest (the button stands alone) | null | emptied |
| picking Friends, the meal planned again after a seat | the answer changed | changed in its place |

- **`select.index`**: for an app that says `answers`, which answer holds the plan chosen (the last that does).
- **`context.answers`**: the conditions of every answer on screen, in step order; the model reads each one other than `conditions` as `[Another step on screen: …]`. A follow-up replans one PlanInput as before.
- **Left on the one slot:** `showOnMap`, the which-Friend question, the offers kept only without an answer, the walk sentences dropped beside a plan, and the wordless reply. They read `answer` as before for every app.

## Decided for the user's review

These were decided by the orchestrating session and may be changed: the request key above; `answer` keeps "the last one" rather than "the first step's"; a Lookup keeps the other requests' answers; `context.answers` feeds the model's context lines only.

## Acceptance criteria

- [x] Two requests keep two answers; the same one twice keeps one, in its place; a Lookup keeps them; a withdrawn request loses its own; clearing empties them. (Unit test, `presented`.)
- [x] An app without `answers` gets no `answers` and the same `answer`, `select` and `clears`; one with it gets the list, `select.index`, and no `clears` over answers drawn. (Unit test, `several-answers-reply`.)
- [x] The other steps on screen are lines of their own; without them the lines are as before. (Unit test, `several-answers-reply`.)
- [x] "점심이랑 저녁", lunch planned again, "저녁 먹고 공연" and a lookup after a plan, each for both apps. (Integration test, `assistant-several-answers`.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 minutes, an estimate from this session's transcript (gaps under 5 minutes). Its 15 pinned integration files ran one at a time in the background for about 40 minutes besides, while the session worked on ticket 74.
- Tokens: input 12.9M, of which 12.8M cache reads, 0.07M cache writes and about 110 uncached; output 38k. No subagents.
