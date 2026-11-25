# 63: The answer sheet's three heights are one for every answer, clearly apart, and a drag only moves or closes

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
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
2. **Three steps clearly apart.** Middle covers 60% of the screen (the status bar's top to the screen's bottom). High stays just under the time card.
3. **A drag only changes the height or closes.** Whatever the sheet shows (an answer, the list of earlier questions, a restaurant's menu), the same steps work, and a drag down from low past the close point closes the answer. A screen reader's step down only lowers the card too.
   - The header is the same everywhere: the history chip, "＋ 새 대화", and ✕. The restaurant's menu gets the chip back.
   - The list of earlier questions keeps the card's step, scrolls with the card's content, and is left by the chip, by picking a row, or by back.
   - The restaurant's menu is left by its "‹ N곳 목록" line or by back (back first returns to the list, then acts as on the list).
   - ✕ closes the answer in every state.
4. **The history chip's lag on the seat answer.** Measure the React commits a press of the chip makes with the library seat answer on screen, against the meal answer, and fix the cause if it is clear.

## Acceptance criteria

- [ ] At low, the meal, seat, study-area, route, and words-only answers and the list of earlier questions (2 and 8 rows) have one top edge, measured on the emulator.
- [ ] No line of words shows cut in half at low.
- [ ] Middle covers 60% of the screen; high stands under the time card.
- [ ] With the list of earlier questions or a restaurant's menu open, a drag moves the card between its steps and closes it from low, and the list or the menu stays.
- [ ] The restaurant's menu shows the history chip.
- [ ] Tests cover the heights, the drag over the list and the menu, and the screen reader's steps.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
