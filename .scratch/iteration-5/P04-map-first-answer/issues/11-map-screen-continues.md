# 11: The map screen says what it continues, and starts anew at one press

Parent: [P04 spec](../spec.md)
Status: in-progress
Blocked by: [10](10-earlier-questions-in-the-pill.md) for the list and the kept conversations.

Native files: none. Releases: an app OTA update only.

## What to build

With the answer closed and a conversation kept, the map screen shows a chip above the input that names the conversation the next message continues ("이어서 · 민수랑 내일 2시 학생회관 ▾") and a "새 대화" button beside the input (board 17). A tap on the chip opens the list of ticket 10 over the map; a tap on a row reopens that answer. "새 대화" starts a new conversation at one press, with the input focused, and the kept one stays in the list. With nothing kept, neither shows. After "새 대화" nothing is continued: the map screen shows ticket 10's "지난 대화 N ▾" instead (board 27).

## What happens now

- "이전 답" at the input's left reopens the last answer, with a dot for a reply not yet seen.
- A message typed after ✕ continues the kept conversation without saying so.

## What changes

- The chip replaces "이전 답"; the unseen dot moves onto the chip.
- The input's placeholder says "이어서 말하기" while a conversation is kept, else today's.
- The everyday map's bottom (row of buttons, 편의기능, the first run's card) keeps its place; the chip takes the room "이전 답" took.

## Must not break

- A message on the map screen continues the kept conversation (decided).
- The first run's card, the tutorial's start, the made Quest's line, and the examples over the keyboard.

## Decided while building (2026-11-22)

- The chip names the latest question of the conversation kept ("이어서 · 셔틀 어디 있어? ▾", cut at the end when long) and stands where ticket 10's "지난 대화 N ▾" stands: at the left with the made Quest's line while the keyboard is down, over the input under the examples while it is up. Board 17's own row right above the input would push the everyday map's row of buttons and the left column up.
- The chip is hidden wherever "지난 대화 N ▾" is: under a card open at the bottom of the map (`room.pastChats`), and with an invitation's or a made Quest's card.
- "이전 답" leaves the input; the unseen dot is on the chip ("이어서, {question}, 새 답 있음" to a screen reader).
- "새 대화" beside the input is board 17's outlined button, in the place of the answer's main button; it starts a new conversation at one press and the input takes the focus.
- The chip's list is ticket 10's card standing on the chip, without the 새 대화 row.

## Acceptance criteria

- [x] After an answer and ✕, the chip names its question; a tap opens the list; a tap on the row reopens the answer. (Integration test.)
- [x] A message sent from the map screen continues the conversation. (Integration test.)
- [x] "새 대화" there starts a conversation whose message sends none of the old one, and the old one is in the list. (Integration test.)
- [x] A reply that came while the answer was closed puts the dot on the chip. (Integration test.)
- [ ] The map screen with the chip on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.
