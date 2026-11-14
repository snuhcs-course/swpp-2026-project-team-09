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
3. At a view, sides are chosen in its points alone: a side is free when its box stays inside the area and covers neither another point's symbol box nor a label placed before it, and a label with no free side is left out, so that no label lies over another mark of the answer. The spec's metre reach, with its fallback to the first side not taken, stays only for a drawing without a view: before the stage is laid out and the map has told its fit zoom, and for the camera's room.
4. A box less than a point over the area's edge counts as inside, and the Plan's own points count as fitting the camera's area within a point: a camera's fit rests in its last digits, and the first Plan's pick ends exactly on the area's bottom.
5. The one source of label sizes is `answerLabelBox` beside the label's styles in `design-system/map-answer.tsx`, which `roomsOf` and the side check both read. Heights stay the tallest of each kind, 26 and 46, as `roomsOf` had them; widths come from a small table of Pretendard's advance widths (a Hangul syllable 0.87 of the font's size, a space, "·", or ":" 0.29, any other letter 0.67), worked out once from the font files, with the padding, the pick's border, and the number's badge, at most 180.
6. Labels share an edge only when their marks are also within 36 points (a symbol box) across, so that a label never moves far from its mark. Neighbours are counted pair by pair, each label moving to the edge furthest out among its own neighbours, in whole points, and only as far as the area lets it. The move is the label's `shift`, a margin between the symbol box and the label, and it is part of the look's name.
7. Each Plan's looks are made at the camera that Plan is shown at, so the arrows still never wait for a picture.
8. A received invitation hands its scene to the map instead of a drawing, so that its way is drawn by the same steps; its area starts 8 under the status bar.
9. On the emulator (411 by 914, the pill's bottom at 100, the card of 406), the Plan's own points of the stored answer are 370.85 high at a campus map's lowest zoom, 15.26, more than the area leaves them, so the camera goes further out: for the first Plan to 14.96, filling 132 to 434; for the third Plan and the answer for a fixed start to 15.15, filling 132 to 476. Every label of the Plan's own marks keeps a side: in the first Plan "나 · 3분" at the right and the pick's two lines below 302동, from 454 to 500; in the third, the flag above 301동, "나 · 15분" at the right, and 민수's "18분" at the right of 302동 at 476, from 463 to 489, the pick's lines below 학생회관. "13:00 수업 · 24동" stays at the left in all three; 학생회관식당 goes to the right in the first Plan, its left covering 24동; 자하연식당 2층 lies under the pill and is left out.
10. In the third Plan, 302동식당's label goes at the left of 302동, from 129.2 to 221.2, moved 2 to share 301동식당's right edge. At the lowest zoom, where it had been pushed above 302동 over the User's dot and tag, it would now be left out.
11. An answer's camera goes below a campus map's lowest zoom only when the Plan's own points do not fit there, and only until they do: to `nativeLevelZoom(14) + 0.25`, 14.765. `nativeLevelZoom` in `map/campus.ts` is the one conversion from Kakao's level to a zoom, level + 0.515 as the module measured it on the emulator; the module measures its own on each phone and keeps it to itself. The quarter of a level covers the Android view grown since the module opened, whose zooms are sent lower by the scale's shift (0.146 on the emulator), which Kakao holds to the level.
12. The map takes `outerZoom`: while it is given the plain map and the native map keep a camera down to it, and the module is handed it, less the shift, as its `minZoom`, so that it does not bring an answer's camera back. The fit zoom the map tells stays the campus map's, so that the screen's zoom levels and the "close" level of an answer's camera do not move. The everyday map gives none.
13. The labels of the whole answer take sides by kind, flags first, then the pick, the people, the next Class, the candidates, and the Restaurants that do not fit, so that the Plan's own marks place theirs before others can take their room. Within a point the order is as before.
14. A label moved to share an edge stays where it is when the move would cover another point's symbol or another label.
15. A received invitation's camera may go further out in the same way. Its stored way fits at the lowest zoom under its card of 411, so nothing changes there; under a taller card, such as ticket 06's 480, its own points do not fit and it now goes out.
