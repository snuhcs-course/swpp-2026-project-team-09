# 14: The bar, the flag, and the face card as the boards draw them

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-lookups-and-words-one-line.md). Builds on tickets 01, 02, and 03.

Native files: none. Releases: an app OTA update only.

## What to build

Five corrections from the phone screens of tickets 01 to 04, so that they look as boards 1, 10, and 12 draw them.

1. **The folded bar shows the free time around the Plan.** Folded, the bar's track runs from the busy edge before the span to the busy edge after it, with a little margin on each side (for a meal from 12:15 to 12:43 between 민수's class ending at 12:15 and the User's class at 13:00, about 12:00 to 13:15), and each end's words stand under their own time. Board 1 draws 13:30 to 15:45 for a Plan from 14:00 to 15:00. Unfolded, the bar keeps the band's whole range. Today the folded track keeps the whole range (12:00 to 18:30), the span is a sliver whose two handles overlap, and the end words sit at the track's ends.
2. **A face's card is small and attached to the face** (done before the Release in its own pull request, branch `5.0/P04-14a-small-face-card`; left for this ticket: choosing the side that keeps the pick's flag clear). It holds the name, the face's own line ("12:15 302동 수업 끝"), and 빼기 (and 프로필 for a Friend), in a card the width of its words beside the face, not a wide card over the middle of the map.
3. **The pick's flag looks pressable.** Its first line ends with "›", as boards 10 and 12 draw it. The flag's card keeps its content, the basis lines included.
4. **"＋ 같이" moves to the time bar.** It stands at the right end of the bar's words row, beside the per-person rows that people belong with, so that the dock is always one row (the input and the main button).
5. **A raised card is as tall as what it holds**, up to today's highest, not the whole height for one short list (seen with one earlier turn open).

## Must not break

- The handles' drag, a let-go's recalculation, moving the band whole, and the screen reader's steps (`answer-band-move`, `answer-correct-band`), now on a folded track of another range.
- 빼기 and 프로필 from the face's card (`answer-mark-people`), and the flag's card (`answer-flag-card`).

## Acceptance criteria

- [ ] Folded, the meal answer's track runs from about 12:00 to 13:15, the span covers 12:15 to 12:43, and the end words stand at 12:15 and 13:00. (Unit test of the folded range; integration test of the words.)
- [ ] Unfolded, the track runs over the band's whole range as before. (Integration test.)
- [ ] A drag of the end handle on the folded track drops at the time under the finger. (Integration test.)
- [x] The face's card shows the name, the face's line, and 빼기, beside the face. (Integration test.)
- [ ] The face's card takes the side that keeps the pick's flag clear. (Unit test of its place.)
- [ ] The pick's label ends its first line with "›". (Unit test of the mark.)
- [ ] Raised with one earlier turn open, the card is as tall as its content. (Integration test of its height.)
- [ ] "＋ 같이" is in the time bar's words row and opens the list of Friends; the dock holds the input row alone. (Integration test.)
- [ ] The three states on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
