# 63: The answer sheet's three heights are one for every answer, clearly apart, and a drag only moves or closes

Parent: [P04 spec](../spec.md)
Status: ready-for-human
Blocked by: none. Follows ticket 61.

Native files: none. Releases: an app OTA update.

## What happens now

The user tried ticket 61's sheet on his phone:

- At low the sheet's top edge stands at a different place for each answer kind and for the list of earlier questions, and a line of words can show cut in half above the footer.
- Low and middle look alike: low covers about 36% of the screen, middle 50%, high 82%.
- With the list of earlier questions open (the header's history chip), the card goes neither higher nor lower, and a drag down takes the list away instead of lowering the card. On a picked restaurant's menu the history chip is missing, and a drag down returns to the list of restaurants.

## What to build

The boards `h1`, `hA`, `l1`, `lC`, `k1`, `k2`, and `k3` of the people-pick set are the look and the numbers.

1. **One low height.** At low the sheet's top edge stands where the meal answer's does: the header, two lines of words, the main button's row, and the input. An answer without a main button gives that row's room to its words, so more lines show whole. The list of earlier questions stands at the same edge. No line of words shows cut in half at low: the room under the last whole line is covered in the sheet's colour, which fades as the card rises.
2. **Three steps clearly apart.** Middle covers 60% of the screen (the status bar's top to the screen's bottom). High's top edge is one line for every answer and state: just under the place the folded time card takes, whether a time card stands there or not. Every content has all three steps, a short one included (boards k1 and k3).
3. **A drag only changes the height or closes.** Whatever the sheet shows (an answer, the list of earlier questions, a restaurant's menu), the same steps work, and a drag down from low past the close point closes the answer. A screen reader's step down only lowers the card too.
   - The header is the same everywhere: the history chip, "＋ 새 대화", and ✕. The restaurant's menu gets the chip back.
   - The list of earlier questions keeps the card's step, scrolls with the card's content, and is left by the chip, by picking a row, or by back.
   - The restaurant's menu is left by its "‹ N곳 목록" line or by back (back first returns to the list, then acts as on the list).
   - ✕ closes the answer in every state.
4. **The history chip's lag on the seat answer.** Measure the React commits a press of the chip makes with the library seat answer on screen, against the meal answer, and fix the cause if it is clear.

## Acceptance criteria

- [ ] At low, the meal, seat, study-area, route, and words-only answers and the list of earlier questions (2 and 8 rows) have one top edge, measured on the emulator.
- [ ] No line of words shows cut in half at low.
- [ ] Middle covers 60% of the screen; high stands at one line under the folded time card's place, with or without a time card.
- [ ] With the list of earlier questions or a restaurant's menu open, a drag moves the card between its steps and closes it from low, and the list or the menu stays.
- [ ] The restaurant's menu shows the history chip.
- [ ] Tests cover the heights, the drag over the list and the menu, and the screen reader's steps.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Built and measured (2026-11-25)

Emulator (1080 × 2400 px, 914 dp, font scale 1.0, gesture navigation), the card's top edge from the screen's top:

- Low: 1644 px, the card covering 31.5% of the screen, for the meal, seat, study-area, route, and refusal answers, the list of earlier questions (3 and 8 rows), and a restaurant's menu.
- Middle: 961 px, 60.0% (`MID_SHARE = 0.6`). Low to middle: 28.5 points of percentage.
- High: one line, just under the place the folded time card takes (see "High at one line" below). At first every step but low ran only as far as a short content (the meal list stopped at 71.0%, the 8-row list at 72.6%, a restaurant's menu at 43%), so on the user's phone a picked restaurant's menu could not go high. Middle and high now stand at their shares for every content, as boards k1 and k3 draw them: the content at the top, room under it.
- Low is set by its contents, not by a share: the meal answer's footer (the navigation inset, the input 12 + 50, a gap of 8, the main row 50, 12 over them), the header, two lines of words, and the fade. A share would cut lines on a small screen or at a large font.

Layers the sheet can carry, and what a drag does on each:

| Layer | Before | Now |
| --- | --- | --- |
| The list of earlier questions | a drag down took it away; it made low as tall as middle | height only; it stays; low's edge holds |
| A restaurant's menu | a drag down went back to the list; no history chip | height only; it stays; the chip shows |
| A mark's card (over the map at its mark) | a drag down on the sheet took it away first | no longer taken by a drag; a press anywhere else and back still close it |
| A Friend's profile | over the whole frame; the sheet is not under the finger | no change |
| The library's room list (in the time card) | not moved by the sheet's drag | no change |
| The list of Friends to add, a Place being picked, the keyboard's view | not a layer: no drag took them away | no change |
| "여기면 어때?" (a building asked about over the answer) | ✕ and a drag down from low return to the earlier answer instead of closing | not changed: going back to the answer by a drag or ✕ may be right here; the user decides |

Lag of the history chip with the seat answer (debug build on the emulator, three presses each, the first warm-up press left out):

| | React commits in 1.5 s | JS render time | map renders | camera |
| --- | --- | --- | --- | --- |
| 5.0/Main, seat | 4 | 40–56 ms | 2–3 | zooms out to the whole campus on open |
| 5.0/Main, meal | 5–10 | 91–209 ms | 4–6, the walking route re-sent 3 times | stays |
| This branch, seat | 4–6 | 29–48 ms | 1–2 | stays |
| This branch, meal | 3–6 | 45–151 ms | 2, no line re-sent | stays |

The cause on 5.0/Main: opening the list made low as tall as middle, so the card's height changed, and the map fitted again. With the seat answer that fit zooms out to the whole campus, with every shuttle stop, route, and study pin. Rule 1 keeps low's height, so the camera no longer moves. Left: each press still renders the main screen twice (the input hides under the list), and the native map gets new marker arrays each time; a content-equal check in `native-map.tsx` could skip those, as a follow-up.

Known, on hold by the user's decision (2026-11-25): the band at low is measured on lines of words from the content's top, so a row of chips or a list row right under the words (the meal's 김민수, the route's 301동에서, the list's next row) can show its top edge above the footer. Not fixed in this ticket.

### The render loop with people picking (2026-11-25 evening, commit `a43beb1e6`)

The user's phone, on a preview merging PR 552 with this ticket: "＋ 같이" gave "Maximum update depth exceeded" at once. Opening picking lays the time card out again, and its reported height came back a fraction of a point different each time (its rows' fractional height taken from a height the phone rounds to its pixels: 112, then 111.79, then 111.71 on the emulator). With every step at its share, the sheet's place hung on that height at every step, so each report moved the sheet in render; on the phone it never settled. The header's and the content's measured heights now move the sheet only by half a point or more (`steady.ts`), and since high stands at one line the time card's height no longer moves it at all. Tests: `frame-card-steady`, `answer-sheet-steady`.

### High at one line (2026-11-26, commit `8f3f8cab3`)

The user's phone, on the preview merging PR 552 with this ticket, twice. First: "하단 카드 높게를 화면 전체로 수정했구나? 원래는 시간 바 밑까지였잖아", once, after people picking with the sheet raised and lowered while new bundles arrived over Metro; it did not come back on purpose. The cause, from the code: the time card told its folded height as its laid-out height less its rows' room as React held it, and the sheet rising to high under an open card shuts that room on the UI thread first, so a layout then told the folded height less the rows' room, below 0 while picking; nothing was laid out again after React folded the card. PR 552 fixed that where the height is told (`8c7709b59`). Second: "내일 저녁이라고 전송하고 로딩하는 동안에는 높게를 하면 화면 전체를 덮기는 하네": while an answer loaded, before its time card, high covered the whole screen. Not reproduced on the emulator: its Android restarted itself under the Mac's load before the picking steps ran.

The user chose one fixed line. High's top edge now stands just under the place the folded time card takes, whatever is above: an answer loading, an answer without a time card (a route, the seats, words only), a tucked card, or any measured height; the sheet no longer hears the time card's height. The place comes from the time card's own layout (`foldedTimeCardOf`): its top padding 12, the head's row (the chips' 32 on 5.0/Main, 36 with PR 552), the lane 20, and the ends' row 16, 4 apart, then the grip's strip 20 under a gap of 4, with the head's and the ends' rows growing with the font: 112 points on 5.0/Main and 116 with PR 552, where the emulator measured the folded card at 115.8. Tests: `answer-sheet-high` (high while an answer loads is high under its time card; it fails before, 634 against 510), `frame-card-high` (the line at the usual and at a larger font).

### Agent usage (2026-11-25)

- Agent time: about 60 minutes in this session (an estimate), plus the other session's start on rule 1 (commit `4281d90e7`, not measured here).
- Tokens (this session, no subagents): input 614 uncached, plus cache reads 88,996,060 and cache writes 440,837; output 139,541.

### Agent usage (2026-11-26)

- Agent time: about 70 minutes in this session (an estimate) on the high over the time card, high at one line, and a fix for PR 552's file that its own commit `8c7709b59` made needless.
- Tokens (this session, no subagents, since 2026-11-26 00:00 KST): input 278 uncached, plus cache reads 29,031,023 and cache writes 256,391; output 106,099 (up to this entry).
