# 08: The answer's labels and the pick's card stay inside the map the pill and the card leave

Parent: [P02 spec](../spec.md) ("The answer on the map")
Status: ready-for-agent
Blocked by: 03

## What to build

A label of an answer's mark never lies under the pill, under the card, or across a screen edge, and labels on one side of nearby marks line up. Today the side of a label is chosen by the other marks of the answer alone, in metres, so on a phone "14분밖에 못 있어요" can be cut by the left edge, "13:00 수업 · 24동" can lie half under the pill, and the pick's card can be cut by the card's top.

## Acceptance criteria

- [x] One area in the map's points: 16 from the left and the right edges, from the pill's bottom plus 8 down to the card's top minus 8.
- [x] Choosing a label's side, a side also counts as blocked when the label's box, at the camera the answer is shown at, would leave that area; the next side of the label's list is tried, and a label with no side left is left out as today, its mark's name still said to a screen reader.
- [x] Labels at the left of marks within 60 points of each other up and down share their right edge, and labels at the right share their left edge.
- [x] The camera's room for labels (`roomsOf`) and this check use the same label sizes.
- [x] Unit tests on the stored copies of real answers with the emulator's view (411 by 914, the pill and the card as measured), worked by hand.
- [ ] Pictures: the first and the third Plan of the stored answer, and the answer for a fixed start, with no label touching an edge, the pill, or the card.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

From the design review of 2026-11-15 (`answer-screen-design/brief.md`, fix 7), split off as its own ticket because the side of a label must then be chosen in the view's points, after the camera is known, where today it is chosen in metres before it.

### Decisions (2026-11-15)

1. The order has no loop: the Plan is drawn with its labels' sides chosen in metres, the camera is worked out from that drawing as before (`roomsOf`, `paddingOf`, `answerCamera`), the Plan is drawn again with the sides chosen at that camera, the labels at the left and the right then share their edges, and the map moves once. The second drawing never feeds the camera: a side the camera made room for is still inside the area at that camera, and a side that is not is dropped instead of moving the camera again.
2. `paddingOf` keeps the area's 8 at the top and at the bottom, so that the room the camera leaves for a label lies inside the area. Without it the first Plan's two lines under 302동 ended on the card's top, 8 past the area, and went above, over 301동's labels.
3. The area is a hard rule and the metres a soft one: a side whose box would leave the area is not in the label's list, the metre rule chooses among the rest as before, and with none free the first of the rest is taken. The metre reach stays as the spec has it.
4. A box less than a point over the area's edge counts as inside: a camera's fit rests in its last digits, and the first Plan's pick ends exactly on the area's bottom.
5. The one source of label sizes is `answerLabelBox` beside the label's styles in `design-system/map-answer.tsx`, which `roomsOf` and the side check both read. Heights stay the tallest of each kind, 26 and 46, as `roomsOf` had them; widths come from a small table of Pretendard's advance widths (a Hangul syllable 0.87 of the font's size, a space, "·", or ":" 0.29, any other letter 0.67), worked out once from the font files, with the padding, the pick's border, and the number's badge, at most 180.
6. Labels share an edge only when their marks are also within 36 points (a symbol box) across, so that a label never moves far from its mark. Neighbours are counted pair by pair, each label moving to the edge furthest out among its own neighbours, in whole points, and only as far as the area lets it. The move is the label's `shift`, a margin between the symbol box and the label, and it is part of the look's name.
7. Each Plan's looks are made at the camera that Plan is shown at, so the arrows still never wait for a picture.
8. A received invitation hands its scene to the map instead of a drawing, so that its way is drawn by the same steps; its area starts 8 under the status bar.
9. On the emulator (411 by 914, the pill's bottom at 100, the card of 406): the first Plan keeps every label of its own marks ("나 · 3분" at the right, the pick's two lines below 302동, from 454 to 500); 학생회관식당, 자하연식당 2층, and "13:00 수업 · 24동" lie under the pill and are left out. In the third Plan and the answer for a fixed start, 민수's "18분" is left out: at the lowest zoom of a campus map, 15.26, the Plan's own points are 370.9 high, more than the 344 that the pill, the card, the area's 8, and the marks' room leave, so the pick's north end is kept and 302동 comes to 502.9, below the area's bottom. That is where the map cannot go further out, so `roomsOf` and `answerCamera` are not changed.
10. Open, outside this ticket's rules: in the third Plan on the emulator, 302동식당's label, pushed above 302동 by the card, lies over the User's dot and tag at 301동, because the 120 metres a label above reaches is less than its 66 points at the lowest zoom (about 210 metres). Choosing sides against other marks in the view's points would fix it.
