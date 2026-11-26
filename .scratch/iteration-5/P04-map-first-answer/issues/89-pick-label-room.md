# 89: The chosen place's label over no other candidate

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

The user's capture ("내일 저녁?", 아워홈(901동) chosen, the list raised to its end so the map's strip is short): the chosen place's label sits below its round, over half of candidate 6's round.

- A meal pick's label tries below, above, right and left, each clear of the other rounds, the labels, the faces and the lines (`PICK_SIDES`, P04 ticket 76).
- 아워홈 stood just under the time card. Above had no room, and a box at its left or right, centred on the round, reached up under the card. Below was the only side inside the strip.
- With no side clear, the pick's label, which is never left out, fell back to the first side inside the strip clear of the people's marks, the labels, the faces and the lines, ignoring the other rounds. Its dish line ("계란볶음밥*마파두부소스&우…") made it the full 200 points wide, wide enough to reach round 6.

## What to build

The user's decision (2026-11-26): the chosen place's label must not cover another candidate.

Where no side of a meal pick's label is clear of everything (`pickRoom`):

1. Its name and time on one line, without the dish line, which is narrower, at a side clear of everything.
2. Else, of its sides whose box stays inside the strip, two lines or one, the one clear of the people's marks, the labels, the faces and the lines where one is, then over the fewest other rounds, two lines before one on a tie, its sides in their order.
3. Else, with no side inside the strip, as any kept label today (`keptAt`).

A candidate's capsule is placed after the pick's label and already gives way to it: it takes its other side, or its minutes are left out. A round is under the label only where every side it fits at, on two lines or one, covers one.

The choice is made anew where the map comes to rest (P04 ticket 69). It changes only when the room around the pick changes, so a move of a few points leaves it as it is.

## Acceptance criteria

- [ ] With room below the pick alone, a round its two lines would cover and one line would not: one line, clear of the round.
- [ ] Where every way covers a round: the fewest rounds, and no capsule.
- [ ] Where a side is clear of every round: two lines there, as before.
- [ ] A move of a few points leaves the label as it was.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 30 minutes in the p04-58 session, an estimate. No emulator run: the capture's answer is the main server's and its short strip is the user's view; the test reproduces its geometry. No subagents.
- Tokens, from the ticket's start (08:10 UTC) to this entry: input 64 uncached, with cache reads 25,446,044 and cache writes 41,278; output 32,394.
