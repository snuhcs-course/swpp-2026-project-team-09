# 12: Dragging the bottom down closes the answer

Parent: [P04 spec](../spec.md)
Status: in-progress
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

## Decided while building (2026-11-22)

- A drag below the lowered card moves the whole card down with the finger; the pill and the time bar fade to 0.35 at once (not with the distance), and "놓으면 지도 화면으로 돌아가요" stands over the card while it is below. Let go past half the card's height, a fling carried on, the answer closes as ✕ does (a building asked about over the answer returns to the answer, as ✕ does); before that it goes back.
- A drag that starts on the raised card only lowers it, however far; the next one closes.
- The handle's screen reader actions add "답 닫기".

## Acceptance criteria

- [x] A drag down past half the card closes the answer and keeps the conversation (the chip shows it). (Integration test.)
- [x] A short drag down goes back. (Integration test.)
- [x] Raised, the first drag down lowers; the next closes. (Integration test.)
- [ ] The drag on a phone, mid-drag with the hint. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.
