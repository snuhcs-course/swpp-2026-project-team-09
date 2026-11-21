# 02: The place's flag says what and when, and opens a card

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md) for the day words.

Native files: none. Releases: an app OTA update only.

## What to build

The chosen place's flag carries the Plan's title on its first line and its start with the day word on its second ("민수와 만나기 ›" / "14:00 내일(수) · 비공개"), as board 10 draws it. A tap on the flag opens a card attached to it (board 11): for a Plan with Friends, what "이대로 초대" will make (제목, 공개 범위, 정원, 초대); for every Plan, the basis lines that "근거" opens today. A tap elsewhere on the map, a camera move by the User, a new reply, or closing the answer closes the card.

## What happens now

- The pick's label says the place and the server's place flag ("12:33 식사"), without a date.
- The basis opens in the bottom card from "근거".
- The main server makes a Quest from a Plan with the Plan's title, Closed (비공개), and a size of the Plan's people at least the least size; a new recruiting Quest is Open (공개).

## What changes

- The pick's label words, from the Plan and the day helper of ticket 01.
- An attached-card overlay for marks, placed at the mark's point at the answer's camera: one open at a time, rows as buttons, closed by the events above. Later tickets reuse it for faces, my start, a Proposal, a booking, a restaurant, and an event.
- The flag's card for a Plan: title, visibility, size, invited Friends' names (a Plan alone shows only the title), then the basis lines.
- "근거" stays in the bottom card in this ticket; ticket 04 removes it.

## Must not break

- A tap on a candidate's dot still shows its Plan.
- The map's other presses (faces, the everyday map's marks) and the camera's fit.
- "이대로 초대" and "여기로" send what they send today.

## Acceptance criteria

- [ ] A meet Plan with 김민수 for tomorrow at 14:00: the flag reads its title and "14:00 내일(수) · 비공개". (Integration test, from the map's markers.)
- [ ] A tap on the flag opens the card with 제목, 공개 범위 비공개, 정원 2명, 초대 김민수, and the basis lines. (Integration test.)
- [ ] A tap on the map elsewhere, or a new reply, closes the card. (Integration test.)
- [ ] A Plan alone shows its title and basis, without 공개 범위, 정원, or 초대. (Integration test.)
- [ ] The flag and its card on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
