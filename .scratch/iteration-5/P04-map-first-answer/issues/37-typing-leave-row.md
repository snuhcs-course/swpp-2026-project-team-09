# 37: The cancel row stays above the keyboard, and the tests the frame outdated

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([35](35-frame-navigation.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

- With the keyboard up on a reply that asks to cancel a Quest ("오늘 18:00 저녁 약속을 취소할까요?"), the question stands whole above the keyboard, but its "취소하기" row is gone. The rule of 2026-11-22 keeps a reply's ways to answer above the keyboard.
- Three integration tests, which run nightly, no longer match the app:
  - `answer-map`: its camera padding expects the pill's 48 at the top.
  - `tutorial-kwanjeong-check`: it looks for "예약하기" inside the card; since the seat card stands on the map (ticket 07), that button is beside the input.
  - `answer-ask-while-waiting`: its 그만 case presses an example on the main map, which starts a new conversation since ticket 33.

## What to build

- While typing, the reply's 취소하기 or 나가기 row stays above the input, under the question.
- The three tests read the app as it is now.

## Acceptance criteria

- [x] The cancel row stays above the keyboard under the whole question. (Integration test.)
- [x] The three tests pass. (Integration tests, run locally.)
- [x] No native file changes; lint, format, and types pass on the app.
