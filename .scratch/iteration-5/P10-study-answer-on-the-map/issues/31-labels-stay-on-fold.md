# 31: A card's height or fold draws no mark again

Parent: [P10 spec](../spec.md). Builds on ticket 30 (#728), the map framed once per event.
Status: ready-for-human

Native files: none. Releases: an app OTA update; it needs no server change.

## Why

The user's phone ran the preview build with #736, #740 and #741 against the real server. He asked "아침 7시에 도서관 갔다가 점심". The lunch step was shown, with the chat card half raised and a restaurant's menu open. Folding the step's time card away under the steps card and bringing it back made the map redraw and blink each time: "시간 카드를 내렸다가 올릴 때 지도가 다시 그려지면서 깜빡이는 것 같아".

## The cause

1. A card's height or fold changes the map's padding, which gives the answer another "own" camera. The cards are the chat card's low, middle and high, the time card's fold and its person rows, and the steps card.
2. `useRestedView`, where an answer's labels are placed, took every change of the own camera for a framing. It placed every label again at that camera.
3. Since ticket 30, such a change moves no camera, so the camera the labels were placed at was one the map never went to.
4. The labels' sides changed, so the marks' pictures changed, and every mark was swapped at once: the blink. Bringing the card back did the same again.

## What changes

`useRestedView` (`use-rested-labels.ts`) now places labels by ticket 30's framing events, which it is given (`Frame`):
- **From a framing event until the map rests after its glide:** at the answer's own camera, following the card's layout as the glide does.
- **From then on:** at the camera where the map rests, in the view as it was when the map came to rest: its size, its labels' area between the cards, and the font size.
- **A card's height or fold** is no framing event and moves no camera, so it places no label again. The next rest, after the User's pan, or the next event places the labels in the room there is then.

Every drawing on the map goes through it (`useDrawnMap`): an answer's Plan, a step shown as its answer with the other steps beside it, the scene the app makes (several requests, a seat card, a Proposal, cards), a Lookup, and an invitation's way. So the class is closed in one place. `sameKey` is shared from `framed-camera.ts`.

## Swept

Each change below is tested there and back, once the map has rested, with one answer and with the other steps beside it:
- the chat card raised to middle;
- the chat card raised high;
- the time card folded away to its strip;
- the time card's person rows opened.

No change of a top or bottom card's height or fold draws a mark again or moves the camera. Ticket 30 already tested the camera; this ticket adds the marks.

## Acceptance criteria

- [x] Once the map has rested, a card folded away and back, or raised and lowered, keeps every label at the camera where the map rests; the User's pan, then a fold, likewise; the next rest takes the new room; a framing event places the labels at the answer's own camera until the map rests. It failed before the fix, for the folds. (Unit test, `rested-view`.)
- [x] Each of the four card changes, there and back, with one answer and with the other steps beside it, keeps every mark's look and moves no camera. It failed before the fix: 6 of 8 cases. (Unit test, `answer-camera-events`.)
- [x] Ticket 30's camera tests stand. (`answer-camera-events`, `answer-map-hook`.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 15 minutes, an estimate: one session from the user's report to the PR, before any emulator check.
- Tokens: input about 38.8M in all: 98 uncached, cache writes about 0.07M, cache reads about 38.7M. Output about 42K. No subagents.
