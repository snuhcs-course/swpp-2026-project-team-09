# 02: The Assistant's map-first answer on glass

Parent: [A04 spec](../spec.md)
Status: needs-triage (waits for the P04 work below; P04's owner asked for this on PR #560)
Blocked by:
- 01 (the glass layer);
- P04's #552 (people picked in the time card), #553 (the answer sheet's three heights) and #558 ("여기면 어때?" removed), all merged;
- after them, the P04 two-cards link rework, to be announced on this PR (#560). It rewrites `sheet-link.ts`, `card-run.ts`, `card-drag.ts` and `time-card-grip.ts`.

Until then, no work on `screens/main/answer/` or `design-system/map-answer*` starts here. Whichever goes second merges `5.0/Main` first.

Native files: none. Releases: an app OTA update only.

## What happens now

P04's map-first answer is built (P04-01 to 41 and 44 to 61 are merged). All of its surfaces are solid:

- the top time bar (`screens/main/answer/time-bar.tsx`);
- the bottom card and its caption (`answer-frame.tsx`, `frame-card.tsx`, `answer-caption.tsx`);
- the numbered candidate flags and their labels (`design-system/map-answer.tsx`, `map-answer-label.tsx`, `map-answer-box.ts`);
- the walk minutes on the legs (`features/assistant/answer-walks.ts`);
- the food-kind chips (`screens/main/answer/kind-chips.tsx`, its own bordered `Chip`; kinds 한식/중식/일식/양식/분식).

The Assistant's flows keep changing under P04, and the canvas draws screens the app does not have. Build on what the app shows now.

## What to build

Move every surface of the map-first answer onto the glass layer, following the changelog's § 5-2 to § 5-5 (`references/changelog-11-24.md`) wherever the app has the element:

- Panels (the top bar, the bottom card and bar, the caption, cards on the map): `panel`. Their chips, boxes and white buttons: `inner`. Grey input fields in them: `field`.
- Chips standing on the map (walk minutes, candidate tags, route time chips): `map chip`. Black time and place chips: `dark chip`.
- Numbered flags:
  - They shrink by area to 75% (navy 20→17, gold 30→26) and turn see-through (navy 67%, gold 70%).
  - Dimmed candidates get a light see-through round with a grey number.
  - The chosen place's label is white glass, its time in a light gold pill.
- Time bar:
  - It is glass at 42%, with a thin see-through track.
  - The meal span is light gold.
  - "+ 같이" is see-through navy text.
- Bottom bar: the chosen row's dark beige turns light and see-through, and the list's numbers take the same opacity.
- Food-kind chips and the meal-time choice (점심 / 저녁) become word tabs, like ticket 05's filter rows: chosen on light blue in bold navy, the rest grey text. They keep their own component, as they are in this ticket's files.
- Navy main buttons ("여기로", "일정에 넣기", "완료") and full-screen white pages (the chat's first screen) stay solid.
- The design-system map pin (`map-pin.tsx`) is ticket 06's; leave it.

Before building, capture the "before" screens on the emulator with the mock build, one screen per part below. After building, capture the same screens again. Pick the fewest scenarios that show every part, for example a meal question, a 관정 booking and a 행사 question:

- Top: the question caption, the time bar.
- Bottom: the card and bar, a chosen row, the list numbers, the food-kind chips.
- On the map: a chosen and a dimmed numbered flag, the chosen label, a walk-minute chip, a black time and place chip.

When done, add one line to the P04 spec's Implementation Decisions saying new Assistant panels use the glass layer (`mobile/README.md` § Design system, Glass layer). Agree the line with P04's owner first.

The canvas boards: Mf5Kit, Mf5Row-meal, Mf5Row-back, MfKit, Mf3Kit, Mf4Kit, AmKit (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>).

## Must not break

- Every press and gesture of the answer: choosing a candidate, dragging the card, "메뉴 ›", the kind chips' filtering, the time bar.
- The `answer-*` integration tests (`answer-frame*`, `answer-meet-chips`, `answer-band-*` and the rest). A test that finds an element by a look this ticket changes is changed to find it the new way.
- Text contrast on glass: no text drops below 4.5:1 against the glass over a light map.

## Acceptance criteria

- [ ] Every part in the list above is drawn on the glass layer at its level. (The answer tests pass. The emulator "before" and "after" pairs of each part go in the pull request.)
- [ ] The food-kind chips are word tabs, and the chosen one is still selected for accessibility. (Integration test.)
- [ ] Navy main buttons and full-screen white pages are unchanged.
- [ ] The P04 spec has the agreed line.
- [ ] No native file changes; lint, format and types pass on the app.

## Comments
