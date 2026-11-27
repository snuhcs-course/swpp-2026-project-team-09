# 31: An answer with no Plan keeps the frame it was asked in

Parent: P04 (the map-first answer); found on the user's phone, 2026-11-27
Status: ready-for-agent

Native files: none.

## What to build

An answer with no Plan ("점심 시간에는 같이 비는 시간이 없어요") keeps the frame it was asked in, so that nothing set by hand is lost to a recalculation that finds no Plan:

- the time card, with the window asked for and its handles;
- "같이 N ›" with the people asked for, who can be unchecked;
- the Classes left out, each with its ✕;
- a meal's conditions (a price, cheapest first), each with its ✕;
- the sentence that says why.

Changing any of them asks again as usual. The main button is the act stage's for no Plan: none, or the relax buttons the main server sends (`noPlan.relax`), with "되돌리기" after a drag as before.

Before, the time card, the people, the Classes left out and the conditions all went with the Plan: the map fell back to the everyday map, and nothing could be undone but by asking again in words.

### Every case

| Kind | Reasons | First answer | After the band moved | After "+ 같이" | After a Class put back | After a condition |
|---|---|---|---|---|---|---|
| Meal, alone or with Friends, the list of candidates included | no-menu, no-fit, no-shared-time | lost → kept from the band the main server sends | lost, "되돌리기" only → kept | lost → kept | lost → kept | lost → kept |
| Meet | no-shared-time, no-fit | lost → kept from the band sent | lost → kept | lost → kept | — | — |
| Study together (not on yet, P10 ticket 16) | no-fit, no-shared-time | lost → kept from the band sent | lost → kept | lost → kept | — | — |
| New party | no-fit | lost → kept from the band sent | its band is fixed | lost → kept | — | — |
| Study seat alone (a library card) | no free seat | kept: its time card is the seat card's | kept | — | — | — |
| Events, Quests | no-fit | its band is fixed, nothing to undo | — | — | — | — |

"closed" and "closed today" are the Restaurants a meal names apart beside its Plans, and "more needed" a study answer together with a Plan: none is an answer with no Plan.

## How it is built

- **The frame** (`features/assistant/answer-frame.ts`): the Plan on screen, or for an answer with no Plan:
  - the band the main server sends with it (`noPlan.band`);
  - else the last Plan shown before it (`AnswerState.framed`), its band redrawn for the conditions asked now (`bandFor`): the people's lanes from its lanes and its Friends to add, those taken out back among the Friends to add, the Classes still left out, and the window asked for.
- `ShownAnswer.frame` holds it. The time bar (`TopBar`, `barOf`), the picking (`usePickingBar`, `pickableOf`), the meal's day (`mealDayOf`) and the band's move read it in place of the Plan.
- A meal with no Plan draws its conditions' chips (`KindChips`) under the sentence.
- `noPlan.band` is optional: a main server before it sends none, and the first answer with no Plan then has no time card, as before.

## Acceptance criteria

- [x] After "+ 같이" brings no Plan: the time card with "같이 2 ›", the Class left out with its ✕, and why; the Friend unchecked asks again without them, the Class still left out. (Integration test.)
- [x] After a Class put back brings no Plan: the time card without it. (Integration test.)
- [x] After the band moved brings no Plan: the handles, which move it again. (Integration test.)
- [x] A meal's price with no Plan: its ✕, which asks again without it. (Integration test.)
- [x] A first answer with no Plan and the band the main server sends: the time card. (Integration test.)
- [x] The frame's band: sent, redrawn, none; the window's bounds; a meal and a meet. (Unit test.)
- [ ] Pictures of the answer with no Plan for a meal alone and with Friends, at font scale 1.0 and 1.3, before and after.
- [x] Whole lint, format and types.

## Comments
