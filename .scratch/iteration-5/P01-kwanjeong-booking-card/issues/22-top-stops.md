# 22: The top cards fold in three stops

Parent: [P01 spec](../spec.md); the several-requests screen page the user approved on 2026-11-27 ("너의 안이 괜찮다고 생각해.", "모두 권장대로 진행해줘.")
Status: done
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

- On an answer to several requests, pushing the time card up folds it to its strip, and the folded card's end still shows at the steps card's edge.
- The steps card never folds.
- The answer sheet's high edge sits under the folded time card's place, whatever is folded.

## What changes

The top of an answer folds upward in stops, as the answer sheet steps below it (`answer/top-stops.tsx`):

- 2: the steps card, with the time card under it;
- 1: the steps card, with an arrow tab under its bottom centre; the time card is wholly behind it;
- 0: one arrow tab at the top's centre, where the lists start.

The time card folds first, then the steps card; opening goes the other way. The tab is an arrow only, with no words, and is the same on one request and on several.

| Gesture | Several requests | One request |
|---|---|---|
| Pull the time card's grip up | 2 → 1 | 2 → 0 |
| Pull it up a long way (72 or more) | 2 → 0 in one drag | 2 → 0 |
| Press the tab under the steps card, or pull it down | 1 → 2 | (no such tab) |
| Pull the tab under the steps card up | 1 → 0 | (no such tab) |
| Press the top tab, or pull it down | 0 → 1 | 0 → 2 |
| Pull the top tab down a long way | 0 → 2 | 0 → 2 |
| The answer sheet rising to high | 2 → 1; 1 and 0 stay | Unchanged: the time card stays where it stands |

A fold never undoes itself: lowering the sheet leaves the stop as it is.

The answer sheet's high edge follows the stop and stays fixed within it, loading included:

- 2: as today, under the folded time card's place, or under the steps card where it reaches lower;
- 1: under the steps card and its tab, the steps card's last height kept while an answer loads;
- 0: under the top tab.

This replaces the one-edge rule of P04 ticket 64 for several requests.

### Answer kinds and stops

| Answer | Stop 2 | Stop 1 | Stop 0 |
|---|---|---|---|
| One request with a time card: a meal, study or meet Plan, a lookup, a booking | The time card | Not used | The top tab |
| Several requests, the step shown is a Plan (meal, study, meet) | Steps card, time card under it | Steps card, tab under it | The top tab |
| Several requests, the step shown is a seat or a room | Shown as stop 1 | Steps card, tab under it; the tab folds to 0 and opens nothing downward | The top tab |
| An answer with no time card or steps card | Unchanged | Unchanged | Unchanged |

`TopBar` (`reply-words.tsx`) is unchanged: the stops live in the sheet link (`sheet-link.ts`), which `StepsTop` and the time card's `Bar` share.

For length, the time card's grip strip moved to `time-card-strip.tsx`, and the grip's sheet followers to `grip-sheet.ts`.

## Acceptance criteria

- [x] Pushing the time card up under a steps card leaves one card and the tab, with no strip of the time card showing under the steps card. (Integration test `answer-top-stops`, the fault: red on Main.)
- [x] The stops come in order: 2 → 1 by the grip, 1 → 0 by the tab's pull up, 0 → 1 by the top tab's press, 1 → 2 by the tab's press. (Same test, red on Main.)
- [x] A long pull on the grip goes 2 → 0 in one drag. (Same test, red on Main.)
- [x] At a seat step the tab under the steps card neither opens a time card by press nor by pull down, and a pull up folds to 0. (Same test, red on Main.)
- [x] The sheet's high edge is the stop's at each of 2, 1 and 0. (Same test, red on Main.)
- [x] The sheet rising to high folds 2 → 1 for several requests, and lowering it leaves stop 1. (Same test, red on Main.)
- [x] One request: the grip folds to the top tab, whose press brings the time card back; the sheet rising to high leaves the time card where it stands. (Same test; the fold is red on Main, the sheet case passes there, as nothing changed in it. `answer-time-bar` and `answer-time-bar-height` now expect the tab after the fold.)
- [ ] Pictures at 1.0 and 1.3 of each stop, for a seat + meal answer and for one request. (Waiting on the emulator.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 55 min in this session, from the build's start (an estimate: active time with gaps over 5 minutes left out). It leaves out the state table sent before the design was approved, and includes the short Main merges into #667 and #673 and #681's format fix at the build's start.
- Tokens: input 260 uncached, with 194,000 cache writes and 92,000,000 cache reads; output 81,000. No subagents.
