# 22: The top cards fold in three stops, to the time card's grip strip

Parent: [P01 spec](../spec.md); the several-requests screen page the user approved on 2026-11-27 ("너의 안이 괜찮다고 생각해.", "모두 권장대로 진행해줘."), and the folded shape he chose on the redrawn page the same night ("이 안으로")
Status: done
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

- On an answer to several requests, pushing the time card up tucks it to its strip at the stage's top, and the folded card's end shows above the steps card.
- The steps card never folds.
- The answer sheet's high edge sits under the folded time card's place, whatever is folded.

## What changes

The top of an answer to several requests folds upward in stops, as the answer sheet steps below it (`answer/top-stops.tsx`):

- 2: the steps card, with the time card under it;
- 1: the time card wholly behind the steps card, only its grip strip showing under the steps card's bottom edge, at the card's own width and corners;
- 0: the steps card gone up too, the one grip strip left at the stage's top.

The strip is the time card itself stopped short; no other shape stands in for it. The time card folds first, then the steps card; opening goes the other way. An answer to one request folds as it did: its card tucked to its strip at the stage's top.

| Gesture | Several requests | One request |
|---|---|---|
| Pull the grip strip up | 2 → 1 → 0, one drag through both | Tucked to the strip, as before |
| Pull it down | 0 → 1 → 2, one drag through both, then open | Shown, then open, as before |
| Press the strip | Opens one stop: 0 → 1, 1 → 2, then open | As before |
| A screen reader's tuck and untuck | One stop each way | As before |
| The answer sheet rising to high | 2 → 1; 1 and 0 stay | As before: an open card folds to its place |

A fold never undoes itself: lowering the sheet leaves the stop as it is.

How it moves: the time card's grip moves one value on the UI thread. Past its place behind the steps card, the steps card's lift follows it point for point, so the strip stays hung under the steps card's bottom edge up to the stage's top. The time card stands in a frame that starts under the steps card's rounded top and moves with the lift. No part of the card shows above the steps card, however tall the card is.

The ghost at the fold, the fault the user saw on his phone ("접는 순간에 순간적으로 잔상들이 섞이면서 자연스럽고 부드럽게 되지는 않아."): when the card arrived at its strip, it was set back to its full place on the UI thread and then swapped for a tab by React. For a frame or more both the card and the tab were drawn. Now nothing is swapped: the card stays mounted, stops short, and tells the stop only once it has arrived.

The answer sheet's high edge follows the stop and stays fixed within it, loading included:

- 2: as today;
- 1: under the steps card and the strip, the steps card's last height kept while an answer loads;
- 0: under the strip at the stage's top.

This replaces the one-edge rule of P04 ticket 64 for several requests; one request keeps it.

### Answer kinds and stops

| Answer | Stop 2 | Stop 1 | Stop 0 |
|---|---|---|---|
| One request with a time card: a meal, study or meet Plan, a lookup, a booking | The time card | Not used | Not used: the card tucks to its strip as before |
| Several requests, the step shown is a Plan (meal, study, meet) | Steps card, time card under it | Steps card, the time card's strip under it | The strip at the stage's top |
| Several requests, the step shown is a seat or a room | Shown as stop 1 | Steps card, a strip of its own under it (`steps-strip.tsx`): it folds to 0 and opens nothing downward | The strip at the stage's top |
| An answer with no time card or steps card | Unchanged | Unchanged | Unchanged |

`TopBar` (`reply-words.tsx`) is unchanged: the stops live in the sheet link (`sheet-link.ts`), which `StepsTop` and the time card's `Bar` share.

The strip of a step with no time card is drawn from the time card's own parts (`CARD_FACE`, `GripLine` in `time-card-strip.tsx`).

For length, the time card's grip strip moved to `time-card-strip.tsx`, the grip's places to `grip-places.ts`, and its sheet followers and the lift to `grip-sheet.ts`.

## Acceptance criteria

- [x] Folding the time card under the steps card leaves the same card mounted, its strip of 20 under the steps card's bottom edge, in a frame that clips everything above the steps card's rounded top; there is no tab. (Integration test `answer-top-stops`, the fault. Not run on Main's code: there the tuck takes the card to the stage's top, its end above the steps card, so the check cannot pass.)
- [x] The stops come in order by the grip's steps, 2 → 1 → 0. At 0 the steps card and the card's frame stand with the steps card's bottom at the stage's top. A press opens 0 → 1 → 2. (Same test.)
- [x] One long pull goes 2 → 0, and one long pull down 0 → 2. (Same test.)
- [x] At a seat step the strip of its own stands under the steps card; a press or a pull down opens nothing; a pull up folds to 0 and a press brings it back. Changing back to the Plan at stop 1 brings its card behind the steps card, drawn only once its height is known. (Same test.)
- [x] The sheet's high edge is the stop's at each of 2, 1 and 0. (Same test.)
- [x] The sheet rising to high folds 2 → 1 for several requests, and lowering it leaves stop 1. (Same test.)
- [x] One request tucks to its strip at the stage's top as on Main, in no frame, and the sheet rising to high leaves it. (Same test; `answer-time-bar` and `answer-time-bar-height` are as on Main.)
- [x] The places, the press and the screen reader's steps between them, and each stop's room. (Unit test `grip-places`.)
- [x] The Plan's bar under the steps card tells its height without an endless update loop (a fault on Main: a new callback each render, told again in an effect). (`answer-top-stops`: its first run ran out of memory on "Maximum update depth exceeded" at `StepsTop`; passing since the callbacks are stable.)
- [ ] Pictures at 1.0 and 1.3 of each stop, for a seat + meal answer and for one request. (Waiting on the emulator.)
- [ ] The motion on the user's phone: one continuous fold, no ghost. (Pictures cannot show it; the build goes to his phone before any merge.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 2 h 20 min in this session (an estimate: active time with gaps over 5 minutes left out): 55 min for the first build with tabs, then 1 h 25 min for its pictures, the rework to the grip strip, the ghost's cause, and the update loop the new test found. It leaves out the state table sent before the design was approved. It includes the short Main merges into #667 and #673 and #681's format fix at the build's start.
- Tokens: input 640 uncached, with 496,000 cache writes and 162,500,000 cache reads; output 244,000. No subagents.
