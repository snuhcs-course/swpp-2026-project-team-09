# 17: A pressed building or face, answered without the model

Parent: [P01 spec](../spec.md) ("The contract", "Recalculation"); package B's row 6 (P02 tickets 18 and 22)
Status: ready-for-agent
Blocked by: None for the server. The app draws the card in package B's P02-22.

## What to build

A press on a building or a Friend's face on the everyday map asks `POST /assistant/taps`, which answers at once, with no model and no count against the day's messages. It answers with a Lookup carrying a `card`, read only through what the server knows and the Friend view.
- A building: the minutes to it and when I arrive, how long I can stay before my next item, today's menu, its events, and the Friends my map shows there, with a one-line suggestion and the buttons "여기서 먹기", "행사 보기", "같이 갈 파티", and "길 안내".
- A Friend: their Timetable label, the place my map shows them at, and the minutes from me, or at the Timetable only their Class and the next one, with "지금 위치는 보여 주지 않아요".

These are wireframe row 6, boards a1, a2, a3, a14, a4, a13, and a10.

## Acceptance criteria

- [ ] `POST /assistant/taps { tapped: { kind: 'place', placeId } | { kind: 'friend', userId }, location }` answers a Lookup of kind `place` or `friend` with `card`.
  - 400 for a Place that does not exist; 404 for a userId who is not the asker's Friend.
  - No model, and no count.
- [ ] The contract gains, on both sides:
  - `Lookup.kind` `place`;
  - `Lookup.card?: LookupCard | null`, holding `title`, `subtitle`, `facts` (`icon`, `text`, `strong`, `userId`), and `note`;
  - `LookupAction` `plan` (`label`, `input: PlanInput`) and `ask` (`label`, `text`).

  The app's reply check accepts them. `apiClient.answerTap(tapped, location)` calls the endpoint, and the mock answers with copies of the real replies.
- [ ] A Place's card, as the seams note's "A Place" says:
  - the facts in order: route, clock, meal, flag, user;
  - the note under its three conditions;
  - the actions by what the Place holds;
  - the chips and basis of a way;
  - the scene with the Place as the pick and the Friends of the facts.
- [ ] A Friend's card, as the seams note's "A Friend" says:
  - the title is the Friend's full name;
  - the subtitle is the level's words;
  - the facts by level, read only through the Friend view;
  - nothing beyond what the asker's map shows (the leak test of ticket 10 extended to the tap).
- [ ] Unit tests for each card's facts with values from the boards or chosen by hand; integration tests at the endpoint, refusals and the Friend view's levels included.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, `/Users/fyoon/Library/Application Support/Claude/side-session-notes/local_fa46a4fb-6f7a-4175-8d94-2691f449455c/row-6-seams.md`, section "Pressing a building or a face". The card's title for a Friend is the full name: package C's label (#277) was dropped by the user.
2. **The code:**
   - the place card in a new `lookup/place-lookup.ts` (and its service), reusing `way.ts` (the start, the walk, the next item), `menu-lookup.ts` (`dishesOf`), the Global Events at the Place, and the Friend view;
   - the Friend half in `lookup/friend-lookup.ts`;
   - the endpoint in `assistant.controller.ts` beside `answers`, behind the same guard.
3. **The stay** is from the arrival to the next item's start, less the walk from the Place to the next item's Place.

## Comments
