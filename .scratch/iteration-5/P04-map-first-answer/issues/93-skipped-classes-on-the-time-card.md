# 93: The time card draws the Classes left out, and puts one back

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Blocked by: P05 ticket 54 (the main server leaves the Classes out). This app shows nothing new until a main server sends them.

Native files: none. Releases: an app OTA update.

## What happens now

A meal's time card draws every Class of the asker's day in their lane as a grey block, and nothing can leave one out.

## What to build

The user's decision (2026-11-26), design page "1. 수업 빼기", "조건을 시간 카드에 둔다면: 세 자리" (option 다), and ""뺀 수업" 줄이 넘칠 때".

1. **The bar.** A Class left out (`band.skipped`) is a dashed empty block where its grey block was, on the asker's lane. It is drawn the same on 나's row when the grip pulls the card down.
2. **The line.** While at least one Class is left out, one line appears under the ends' row: "뺀 수업", then one small pill per Class with its start and "✕" ("13:00 ✕").
   - The title row and the ends' row stay as they are, a Friend's notes included.
   - Beyond what fits, only this line scrolls sideways. The label stays in place, and the end with more fades.
3. **The ✕.** It puts that Class back with one recalculation, as a dragged band does, without the model. With the last one put back, the field is left out of the conditions, so nothing new goes to a main server before it.
4. **The card.** It is one fixed step taller while the line shows, both its measured height and the high step's top edge.
5. **The range.** The bar's range is the main server's, which reaches over the time freed. The folded track follows the busy stretches left.
6. **Words.** "3시 수업은 가" works through the main server (`attendClasses`).
7. **The wire.**
   - The app's check accepts `input.skipped` (texts) and `band.skipped` (id, start, end, label), and refuses other shapes.
   - An app before this shows the plan without the block or the line, and sends `skipped` back unchanged.

## Acceptance criteria

- [ ] Tests fail on the code before:
  - the dashed block on the bar and on 나's row;
  - the line with its pill, the ends unchanged;
  - ✕ asking with none left out (the field gone) and, of two, with the other left;
  - five pills in the one row that scrolls, the label outside it;
  - the fades;
  - the card one step taller at font scale 1.0 and 1.3;
  - the checks of both fields;
  - the conditions with one put back.
- [ ] Mock answers for one, two and five Classes left out, for the sessions emulator.
- [ ] No native file changes; lint, format and types pass on the app.

## Comments
