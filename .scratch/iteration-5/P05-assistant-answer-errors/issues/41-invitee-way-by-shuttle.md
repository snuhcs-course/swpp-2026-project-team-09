# 41: An invited Friend's own way follows the Plan's shuttle

Parent: [P05 spec](../spec.md), after [33](33-plan-travel-by-shuttle.md) and [39](39-merge-never-later.md); fault 6 of the meal checklist report
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- Since ticket 33, the Leader's Plan may give a Friend the shuttle, but the invited Friend's card and their leave-by push worked their own way on foot only (`plans/own-way.ts`). They told the Friend to set out earlier than the Plan counted, and in words that said 걸어서.

## What changes

- **The way straight to the gathering** is priced at the time the person sets out, as the Plan prices it: by the shuttle of that day and hour when it is 3 minutes faster, weighed again at the setting-out the start fixes; else on foot.
- **The Merging Point** follows ticket 39: it is taken on foot when it lies on their way and they can be there by its start. It is left when their own way by the shuttle would get them there sooner.
- The card's `OwnWay` carries `mode: 'shuttle'` and `shuttle: { boardAt, getOffAt }`. Its line says "11:47에 나서면 돼요. 셔틀로 13분 (301동 정류장 → 경영대 정류장).", and its route carries `mode: 'shuttle'`. A walk carries none of them, as before.
- The invitee's leave-by passes `by: 'shuttle'`, so the push says "셔틀로 13분".
- The going moves to `plans/own-way-going.ts`; `own-way.ts` keeps the card.

## Acceptance criteria

- [x] A Monday lunch at 58동 asked on Sunday, from a Class in 301동, goes by the shuttle, 13 minutes, setting out at 11:47, with the stops, in the card and on the map. On a Saturday it walks 25 minutes. (`own-way-shuttle.unit.test.ts`)
- [x] A Merging Point their own shuttle beats is left; one with their own way on foot is kept as before.
- [x] The own-way unit tests and the invitation card, invitee leave-by, late Holder, and better plan integration tests pass unchanged.
- [x] README; lint, format, and types of the main server.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 30 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 19.4 million, of which about 19.3 million cache reads and 0.04 million cache writes; output about 18,000. No subagents. Measured from the session's transcript at the time of the pull request.
