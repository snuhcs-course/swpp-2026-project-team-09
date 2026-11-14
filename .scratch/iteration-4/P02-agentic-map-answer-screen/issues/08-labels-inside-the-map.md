# 08: The answer's labels and the pick's card stay inside the map the pill and the card leave

Parent: [P02 spec](../spec.md) ("The answer on the map")
Status: ready-for-agent
Blocked by: 03

## What to build

A label of an answer's mark never lies under the pill, under the card, or across a screen edge, and labels on one side of nearby marks line up. Today the side of a label is chosen by the other marks of the answer alone, in metres, so on a phone "14분밖에 못 있어요" can be cut by the left edge, "13:00 수업 · 24동" can lie half under the pill, and the pick's card can be cut by the card's top.

## Acceptance criteria

- [ ] One area in the map's points: 16 from the left and the right edges, from the pill's bottom plus 8 down to the card's top minus 8.
- [ ] Choosing a label's side, a side also counts as blocked when the label's box, at the camera the answer is shown at, would leave that area; the next side of the label's list is tried, and a label with no side left is left out as today, its mark's name still said to a screen reader.
- [ ] Labels at the left of marks within 60 points of each other up and down share their right edge, and labels at the right share their left edge.
- [ ] The camera's room for labels (`roomsOf`) and this check use the same label sizes.
- [ ] Unit tests on the stored copies of real answers with the emulator's view (411 by 914, the pill and the card as measured), worked by hand.
- [ ] Pictures: the first and the third Plan of the stored answer, and the answer for a fixed start, with no label touching an edge, the pill, or the card.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

From the design review of 2026-11-15 (`answer-screen-design/brief.md`, fix 7), split off as its own ticket because the side of a label must then be chosen in the view's points, after the camera is known, where today it is chosen in metres before it.
