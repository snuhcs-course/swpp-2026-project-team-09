# 61: The answer's sheet rises, lowers, and hides as one surface, and the time card tucks away

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. Follows ticket 57.

Native files: none. Releases: an app OTA update only.

Boards: the one-sheet proposal v4 (2026-11-24, four rounds with the user), boards a1–a5, b1–b4, c1–c3, d1–d5, e1–e5, h1–h2, k1–k4, p1–p2 (variant A), and u1–u2. Research note: sheet patterns (Android's BottomSheetBehavior, Material's drag handle, Apple's detents).

## What happens now

From the user's phone (2026-11-24): the bottom card has two forms, the dock and the open card, and lowering still shows one becoming the other; the dock's line ends in "더 보기" or "›", which opens the same words again. "N곳 목록 ⌃" under the grip says what a drag brings, in words that crowd the header. The raised card stops under the time card, but the time card cannot be put away, and its grip opens the per-person bars as a second form of the card.

- The card's steps are lowered (the dock, or the content up to about half the stage), raised (under the time card), and full (under the status bar).
- Only the header takes a drag. The content scrolls on its own, whatever the card's step.
- A drag down from the lowered card past half of it closes the answer.

## What to build

1. One surface (a1–a5). The content is laid out once: the header row (the history chip, "＋ 새 대화", ✕) stays at the top, and the answer's words and lists scroll under it. The lowered card is the top of that content, cut at the footer with a soft fade. No dock, no "더 보기", nothing swapped or faded across. The input and the main button are a fixed footer, stacked as today, the same at every step.
2. No label under the grip. A first-time hint instead (u1, u2): one translucent line above the grip, "손잡이를 올리면 더 볼 수 있어요", with no button. It leaves after a few seconds or at the first touch of the card, and shows once on a phone (kept in the app's on-device storage).
3. Three steps: low, middle, and high. High stops just under the time card in its default state, also while the time card is tucked away (h1, h2, k4); the two never overlap. Low shows the header and about two lines of the content; middle about half the stage. No rule reads how much text an answer has: a card shorter than a step stops at its own height.
4. Drags (b, c, d, e). A drag may start anywhere on the card's body; presses on the header row, the main button, and the input stay presses. At high, a drag scrolls the content while it can scroll; with the content at its top, a drag down moves the card (d1–d5). From low, one more drag down or a fling closes the answer to the main map (e1–e3). A let-go lands on the step a fling points to, or on the step nearest where it would come to.
5. The top time card (k1–k4) keeps today's layout and floats with its margins. Pushed up by its grip it slides up as it is, nothing laid out again or reworded, until a thin strip with the grip shows; pulled down, it comes back. Its vertical drag starts only on the grip's 48 dp zone (the band keeps its handles). A press on the card's body no longer opens the per-person view.
6. Per-person bars (p1, p2, variant A). Pulling the grip down from the default state shows one row per person under the combined bar's labels: each person's bar has the same left and right ends and the same scale as the combined bar, with the name as a small caption over its left end. Alone, there is no such state.
7. Closing removes only the sheet: the main map's input stands where the footer's input stood.

## Acceptance criteria

- [ ] The card's steps and its let-go rule are unit tested: the nearest step, a fling one step on, a fling down from low closing, a card shorter than a step.
- [ ] Raising and lowering keep the same content mounted, and no label stands under the grip.
- [ ] The hint shows once on a phone and leaves at the first touch.
- [ ] The frame's integration tests pass with the new steps.
- [ ] On the emulator (mock build), the meal answer, a route Lookup, and a refusal rise, scroll, lower, and close as the boards draw them, at font scale 1.0 and 1.3.
- [ ] The time card tucks and comes back by its grip, and with a Friend it shows the per-person bars.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
