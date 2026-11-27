# 72: What a reply draws changes through one helper

Parent: [P05 spec](../spec.md). The first step towards several answers in one reply (tickets 73 and 74): a message such as "점심이랑 저녁 짜줘" keeps only the last answer today, because every planner writes `presented.answer` itself and every lookup nulls it.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server; no contract change.

## What changes

- **One module, `presented.ts`**, is the only code that writes what a reply draws on the map: `presentAnswer`, `presentLookup` (with `keepsButtons` for a closed 관정), `withdrawAnswer` (a plan asked for and not made: the plan on screen leaves too), `clearDrawn` (a button that must stand alone), `reviseAnswer` (the server changes the answer drawn, such as a meal planned again after a seat) and `takeMap`.
- **Every write site uses it:** the planners (meal, meet, events, Quests, a new 파티, a study place, studying together, a menu found), the lookups (a day, a way ×2, a study space nearby, the tutorial's order, a Friend, hours, a menu not found, 관정 closed today), canceling a Quest, the meal invited to or over for today, picking Friends, and the steps' meal replanned.
- Behaviour is the same for every app.

## Acceptance criteria

- [x] The helpers draw, replace and clear as the sites did. (Unit test, `presented`.)
- [x] No source file outside `presented.ts`, the run's start and the run's end (`adapter.ts`, which keeps a Lookup beside a refusal) writes `answer`, `lookup` or clears the layer buttons. (Checked with grep.)
- [x] The integration tests of every site touched pass unchanged.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 minutes, an estimate from this session's transcript (gaps under 5 minutes), including its share of the design message for tickets 72–74. The 22 integration files ran one at a time in the background for about 55 minutes besides, while the session worked on ticket 73.
- Tokens: input 13.9M, of which 13.7M cache reads, 0.18M cache writes and about 150 uncached; output 47k. No subagents.
