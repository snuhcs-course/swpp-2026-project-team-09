# 38: The answer card raises to the full screen and lowers again

Parent: [P02 spec](../spec.md); a request while trying the app on 2026-11-18
Status: ready-for-human
Blocked by: nothing

## What to build

The answer card takes at most about half the stage. A long answer, its cards, and the earlier turns had to be scrolled in that half.

- A grab handle at the top of the answer card. A press on it, or a drag up past half the way, raises the card up to the pill, so that the conversation is read and scrolled there as in a chat. A press again, or a drag down past half the way, lowers it to today's size with the map above.
- A fling counts as far as its speed carries it. A drag shorter than half the way goes back where it started.
- Android's back button lowers a raised card before it hides the frame. A Friend's profile over the card is still hidden first.
- Raised:
  - the current turn, its cards, and the earlier turns scroll inside the card;
  - the input stays at the bottom and follows the keyboard as before;
  - the pill's ✕ and "새 대화" stay reachable above the card;
  - with the keyboard up the card shows the conversation, not the headline alone.
- Lowered: today's layout and camera fit. Only the lowered card tells its height to the map, so raising and lowering move no camera.
- Raising and lowering ask the server nothing and keep the conversation, the shown Plan, a dragged band, and the words being written.
- One handle and two heights: no third height, no setting. The handle's accessibility label is "답 크게 보기", with its expanded state.

## Acceptance criteria

- [x] A press on the handle raises the card up to the pill, and another lowers it to today's size.
- [x] A drag up past half the way raises the card, a drag down lowers it, and a short drag leaves it.
- [x] Android's back button lowers a raised card, and the next press hides the frame.
- [x] Raised with the keyboard up, the card shows the conversation above the input on the keyboard; lowered again, the headline.
- [x] Raising and lowering keep the conversation and the words being written.
- [x] On the emulator: the lowered card, a raised one with a long conversation, and a raised one with the keyboard up.

## Decisions for review

1. **The handle is on the answer frame's card alone.**
   - The everyday map's bottom (the input with "이전 답") shows no conversation to read, and "이전 답" already brings the frame back with its handle.
   - A received invitation's card and a made Quest's card are short and have no conversation, so they keep one height.
2. **The raised card stops under the pill, not at the status bar,** so that ✕ and "새 대화" stay where they are.
3. **The raised card does not tell its height to the map.** The camera fits the answer to the lowered card. Telling the raised height would fit the answer into the strip above the card and then glide back on lowering.
4. **The card is lowered each time the frame is shown again.** Its height belongs to the frame on screen, like the open "지난 답".
5. **The Plan card's own room stays the lowered one.** Raising gives the card room to scroll, and does not lay the Plan's card out again.

## Not in this ticket

- A toast over the map stands above the lowered card's height, so it is under a raised card.

## Comments

### Checked on an emulator (2026-11-18)

The debug build with the mock API. Lowered card with its handle; a drag up held halfway; raised with "지난 답 2개" open; raised with the keyboard up; back puts the keyboard down, back again lowers the card, and the map's camera is where it was before raising.

### Agent usage (2026-11-18)

- Agent time: about 20 minutes in one session, an estimate from the session's first and last messages; no subagents.
- Tokens: input 15,651,412 (cache reads 15,466,218, cache writes 185,012, uncached 182), output 52,048.
