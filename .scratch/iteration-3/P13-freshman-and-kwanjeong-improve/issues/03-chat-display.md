# 03: Chat display: seat numbers, the seat hint and markdown in replies

Parent: [P13 spec](../spec.md) ("The chat's display (app only)")
Status: ready-for-agent
Blocked by: none

## What to build

The large seat view draws each seat's number, so that a User can pick the seat they know. The small map in the chat stays colour only. Under the seats card, a short line tells the User that tapping a free seat books it. The Assistant's bubbles render the markdown the model writes (bold, italics, line breaks, lists, safe links) instead of showing its asterisks; the User's bubbles stay plain. App only; the Assistant's "원하는 자리를 눌러 주세요" is a prompt change and is ticket 05's.

## Acceptance criteria

- [ ] `SeatMap` in `mobile/src/screens/main/library/seat-map.tsx` takes `numbered`; `LargeSeatMap` passes it and `SmallSeatMap` does not.
- [ ] A numbered seat shows its `VNAME` centred in its box, in a font no taller than the box and no smaller than 8 px, legible on the free, taken and accessible fills.
- [ ] Each seat's accessible label stays "{VNAME}번 {상태}", and the number adds no accessible element of its own; tapping a free seat in the large view still gives its book card.
- [ ] `seats-card.tsx` shows "빈자리를 누르면 그 자리로 예약할 수 있어요" in `styles.caption` under the caption, while seats can be booked; not with `BOOKING_CLOSED`, and not on a room sector.
- [ ] `mobile/src/screens/main/chat-markdown.tsx`, a hand-written subset with no new dependency, renders in the Assistant's bubbles (`chat-bubbles.tsx`): `**bold**`/`__bold__`, `*italic*`/`_italic_`, line breaks, `- `, `* ` and `1. ` list items with a hanging indent, and `[words](url)`. The User's bubbles keep plain `Text`.
- [ ] A link is live only for a parsed `https:` or `http:` URL and opens with `expo-web-browser`; any other scheme (`javascript:`, `tel:`, `intent:`, relative) shows its words as plain text with no press. A bare URL stays text.
- [ ] Anything else (headings, code, tables, images, HTML, an unclosed `**`) shows as written, markers included; no words are dropped. The bubble's accessible label is the text without the markers.
- [ ] Tests, named by ADR 0007: `mobile/__tests__/chat-markdown.unit.test.ts` (the pure parser: each construct above, the unsafe link, the unclosed marker, a heading kept), `mobile/__tests__/chat-markdown.integration.test.tsx` (an Assistant bubble shows bold without asterisks and opens an https link; a User's bubble with the same text is unchanged), and `mobile/__tests__/chat-library-seat-numbers.integration.test.tsx`, against the API mocks and the fake library: the large view shows the numbers of the seats, the small one none; the hint shows while bookable and is absent when closed; a tap on a numbered free seat gives its book card. The existing `chat-library-rooms-seats.integration.test.tsx` keeps passing.
- [ ] Screenshots of a reply with bold, a list and a link (web target), and of the large view with numbers and the card with the hint in the PR (with the fake library's seats, since the hidden web view does not run on the web target; a test render or the emulator).
- [ ] No native file changes (CLAUDE.md § The app's native files).

## Comments
