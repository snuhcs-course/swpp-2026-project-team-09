# 32: The low step shows the sentence's lines, then only whole rows

Parent: [P01 spec](../spec.md); the user's third report of rows cut in half at the answer card's lowest step (2026-11-27)
Status: done
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

At the low step a band over the footer covers the room under the content's last whole line of words (`Caps.band`). It counts lines of the sentence's type from the content's top, whatever stands there. A row that is not lines of that type is cut where the count ends:
- a no-Plan meal's row of buttons;
- a refusal's offer buttons under its lines;
- a meal's third line at font scale 1.3;
- a seat card's ticket under a one-line sentence at 1.3.

## What changes

One rule for every answer kind, in `card-caps.ts`: the content ends at the low step on the last place that shows where nothing is cut. That place is the top or bottom of a row, or the bottom of a line inside lines of words (`wholeCutsOf`, `cutAt`, `bandAt`).

The rows are the content's parts as they are laid out. Each part that stands as a row tells its place through `row-edges.tsx` (`EdgeText` for lines of words, `EdgeView` for a row); outside the card nothing is told.
- Lines of words: the server's lines (`AnswerLines`), a refusal's (`ReplyLines`), the model's words (`ChatMarkdown`), a library card's (`Said`).
- Rows: the seat, room and booked tickets and the ticket's line, a meal's list rows, its heading and closed rows, the kind chips, the relax and offer buttons, the waiting dots, a library card's space row and its pills.

A part that tells no row is never cut either: no place is offered inside it, so it shows whole or not at all. The band follows the content as it scrolls (on the UI thread), so a chooser opened under a ticket, or the meal list while picking, ends on a row wherever it stands. With no row told, the card keeps the line rule it had.

No per-card workaround is left on Main: the group card's own one is on the group-study stack's branch and goes once this lands.

## Acceptance criteria

- [x] Every answer kind's stack ends on a row wherever the low step ends: meal Plan, no-Plan meal, seat card, booked seat, refusal over a Lookup, library outcome, the dots. Each at 1, 2 and 3 sentence lines and at font scales 1 and 1.3. (`low-step-whole-rows.unit`, 84 cases.)
- [x] The sentence's lines come first. (Same file.)
- [x] The kinds the line rule cut are pinned, as was. (Same file, 4 cases.)
- [x] The card's band ends the content on the rows its parts tell. (`low-step-band.unit`, red on Main.)
- [ ] Pictures at 1.0 and 1.3: the seat card and the meal while picking, lowered; the no-Plan meal's buttons. (Waiting on the emulator.)

## Comments
