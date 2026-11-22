# 39: A meal answer's legs say the chosen place's minutes, and its label keeps clear of them

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update only.

## What happens now

- A leg's minutes go stale when another place is chosen. With 자하연식당 2층 chosen (the way there by shuttle, 13 minutes; the way on 20 on foot), the map shows "2분" on the first leg, the minutes of the place chosen before. The leg's mark keeps its id while its words change, and the native map keeps a mark's picture until the new one is made; when the new words cannot be placed, no picture is ever made.
- The chosen place's two-line label stands over the route's first leg and its minutes: its label takes "below" or "above" only, and when neither stays in the labels' area it is put where it covers anything. The legs' minutes take their sides before the label, at their legs' middles only.

## What changes

- A leg's mark id carries its words (`answer:leg:0:셔틀 13분`), so that a leg whose words change is a new mark and the map never shows the words before.
- The chosen place's label is placed before the legs' minutes, may also stand beside its place, and keeps clear of both legs' lines. When no side is free of everything, it keeps clear of the lines and the labels placed before it, covering a dot if it must.
- A leg's minutes may stand along their leg (its middle, then towards either end), keep clear of the legs' lines and the chosen place's label, and are never left out.
- The view kept while another place is chosen pans just enough to bring in the chosen place with room for its label on the side away from its route.

## Acceptance criteria

- [x] A leg whose words change with the choice is a new mark with a new picture name; one whose words stay keeps its mark. (Unit test.)
- [x] For every Plan of the crowded mock at the view the app keeps, the chosen place's label covers neither leg's line nor either leg's minutes, and the two legs' minutes do not cover each other, with 302동식당's 2-minute first leg among them. (Unit test.)
- [ ] The crowded mock on the emulator: the first answer, another place pressed, and 자하연식당 2층 pressed, with "셔틀 13분" readable. (Pictures.)
- [x] No native file changes; lint, format, and types pass on the app.
