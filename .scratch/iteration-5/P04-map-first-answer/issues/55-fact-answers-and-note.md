# 55: An answer that only tells a fact has no main button, and the off-campus note wraps

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

- A Restaurant's hours or its menu, asked on its own ("302동 몇 시까지 해?", "오늘 301동 메뉴 뭐야?"), docks with a main "길 안내" button. The User asked for a fact, not a way there, and the button takes the dock's whole width.
- The off-campus Lookup's note ("캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요") is a chip in the dock's sideways row. On a phone it is cut off.

## What to build

- The main server marks such a Lookup with `fact: true` (P05 ticket 47). The app reads the field and accepts a Lookup without it, as a main server before it sends.
- A Lookup with `fact === true` has no main button in the dock. Its `actions` stay for the Place's card.
- A Lookup without the field keeps its main button as today: way, place-where, shuttle, study, and a Friend's whereabouts.
- The dock draws a Lookup's `note` as plain text under its words, wrapping to the dock's width. The Plan dock's folded chips are unchanged.

## Acceptance criteria

- [ ] A menu Lookup with `fact: true` docks with no main row and no "길 안내". (Integration test.)
- [ ] The same Lookup without the field keeps "길 안내". (Integration test.)
- [ ] The off-campus note is text in the dock, not a button. (Integration test.)
- [ ] A Lookup whose `fact` is anything but `true` or absent is rejected as malformed.
- [ ] No native file changes; lint, format, and types pass on the app.
