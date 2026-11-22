# 04: The study answer's seats that do not come, its walk, and back over the room list

Parent: [P01 spec](../spec.md); what ticket 03 left for later
Status: ready-for-agent
Blocked by: 03

Native files: none. Releases: an app OTA update only.

## What happens now

- **Seats that do not come.** On the map, a study answer whose seats do not come waits a long time. The read times out after 15 s, or up to 35 s counting the hidden page's load. Until then the card says "관정 7층 열람실에서 14:00부터 1시간, 빈 자리를 찾고 있어요.". Then it says "관정의 자리 정보를 받지 못했어요" with 다시 시도.
- **The label has no walking time.** The label on the map says the room, the seat, and the time, but not the walk there. A meal's label does say it ("걸음 N분").
- **Back closes the whole answer.** With the room list open in the raised card, Android's back closes the answer rather than the list.

## What changes

- On the map, the seats' read gives up after 8 s (`SEATS_WAIT_MS`). The card then says "관정 7층 열람실의 빈 자리를 받지 못했어요." with "다시 찾기", which reads again, and 닫기. A read that answers late is not heard. A seat card in the chat keeps its own waits, words, and 다시 시도.
- The label's second line ends with the walk there, "· 걸음 N분", while the User's position is known and the seat is not booked yet. A booked seat's label ends with "· 예약됨".
- Android's back closes the open room list first and keeps the answer. The next back goes on as before.

## What stays as it is

- "나" in the middle of the walking line, which is the map's drawing.
- The seat card in the chat.

## Acceptance criteria

- [x] A read that fails on the map says "관정 7층 열람실의 빈 자리를 받지 못했어요." with 다시 찾기, and no "찾고 있어요"; 다시 찾기 brings the sentence with the free seats. (Integration test.)
- [x] A read that does not answer within 8 s gives up; one that answers in time gives its seats; its own failure passes on. (Unit test.)
- [x] Android's back over the open room list closes the list and keeps the answer. (Integration test.)
- [x] The label says "관정 7층 열람실 › · N번 17:00–18:00 · 걸음 N분". (Integration test.)
- [x] No native file changes; oxlint, Prettier, and tsc pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 15 minutes in one session, from 00:02 to the pull request (an estimate).
- Tokens: output 17k; input 11.3M, of which 11.25M cache reads, 22k cache writes and 30 uncached. No subagents.
