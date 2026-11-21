# 12: Dragging the bottom down closes the answer

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-lookups-and-words-one-line.md) for the bottom's heights, [11](11-map-screen-continues.md) for the chip that reopens.

Native files: none. Releases: an app OTA update only.

## What to build

A drag down on the bottom card's handle closes the answer (boards 18 and 19). While it is dragged below the lowered height, the card follows the finger, the pill and the bar fade, and a hint says "놓으면 지도 화면으로 돌아가요". Let go past half the card's height (a fling carried on), the answer closes as ✕ does; let go before, it goes back. With the whole text raised, the first drag down lowers it and the next closes. ✕ and Android's back stay.

## What happens now

- The handle moves the card between its lowered and raised heights only (`useRaiseDrag`).

## What changes

- A third let-go point below the lowered height; the fade and the hint while past it.
- The handle's screen reader actions gain "답 닫기".

## Must not break

- Raising and lowering by drag and by press (`answer-raise`), the camera's fit to the lowered card, and back lowering a raised card first.

## Acceptance criteria

- [ ] A drag down past half the card closes the answer and keeps the conversation (the chip shows it). (Integration test.)
- [ ] A short drag down goes back. (Integration test.)
- [ ] Raised, the first drag down lowers; the next closes. (Integration test.)
- [ ] The drag on a phone, mid-drag with the hint. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
