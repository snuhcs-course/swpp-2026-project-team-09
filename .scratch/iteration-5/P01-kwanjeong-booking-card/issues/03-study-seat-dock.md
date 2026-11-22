# 03: The study-seat answer in the meal answer's shape

Parent: [P01 spec](../spec.md); the emulator check of `5.0/Main` (d54f8a69) on 2026-11-22 against the six rules of the answer screen's redesign
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

A 관정도서관 seat card whose building is on the map stands there as a label with the room, the seat, and the time (P04 ticket 07), with its band on the time bar and 예약하기 beside the input. The answer's card at the bottom holds the whole seat card, at every height:

- The reply's two lines ("카드에서 확인해 주세요. 예약하기를 누르기 전에는 아무것도 예약하지 않아요." on the mock) name no room, seat, or time.
- Under them come the room chip "7층 열람실 ⌄", the gold "7층 열람실 · 빈 자리 470석", and the seat row "관정관 7층 7A 열람실 2 구역 · 7193번 / 오늘 14:00–15:00". Then the kiosk foot and the site's notes. The map keeps only its top 60%.
- The room is named four ways at once: "관정 7층 열람실 ›" on the map, the chip, the gold line, and "관정관 7층 7A 열람실 2 구역" in the seat row. The label's card names it twice more. The seat picture's head gives it a third wording.
- Raising the card adds nothing, since it already holds everything.
- The bar's words sit under its track, not in its head beside "←".
- While logged out, "로그인" is twice: in the card and as the main button.
- After a drag of the band, the card adds "바꾼 시간이에요. 위 답의 시각은 처음 시간 기준이에요.", which points at an answer above that has no time.
- While the room chooser is open, the seat is hidden but 예약하기 still books it.
- On the map the seat picture opens only from the label's card, and it closes with "✕" at the right.
- After a booking, the label and the bar go away and nothing says "확인".
- On the mock, "공부할 자리", one of the main map's own examples, gets the demo's refusal. "내일 …" books today.

## What changes

### Lowered: one sentence

- While the answer's card is lowered, the seat card says one sentence with the room, the time, and the free seats: "관정 7층 열람실에 14:00부터 1시간, 빈 자리 470석이에요." The reply's words wait for the raised card.
- While the seats are read, the sentence is "관정 7층 열람실의 빈 자리를 찾고 있어요". A failure or a full room shows its one line as before. While a booking is on its way, it says "예약하는 중이에요".
- The caption's right side says "올리면 자리·열람실"; a press raises the card, as dragging does.
- The card stays mounted, so the seat it read, the seat picture, and 예약하기 beside the input stay as they were.

### Raised: everything

- The reply's words, the room chip and its chooser, "빈 자리 470석", and the seat row "관정 7층 열람실 · 7193번 / 오늘 14:00–15:00". Then "다른 자리 고르기", which opens the seat picture from the card too, and "처음 열람실로" (formerly "되돌리기") after a room was chosen. The kiosk foot and the notes close it.
- While the chooser lists the rooms, no seat is offered, so the button beside the input does not book one out of sight.

### One name

- On the map the room is "관정 7층 열람실" everywhere: the label, the label's card (once now, without the site's long name), the seat row, and the seat picture's head ("관정 7층 열람실 좌석 현황"). The gold line under the chip drops the name the chip already shows.
- A seat card in the chat, not on the map, keeps the site's long name in its seat row.

### The rest

- The bar's words stand in its head beside "←", as a meal's bar has them. Its ends stay the space's hours: the reply carries no time for "now" or for the User's next fixed thing.
- Logged out, "로그인" is the main button only; the card says why in one line.
- "바꾼 시간이에요. 위 답의 시각은 처음 시간 기준이에요." is gone.
- The seat picture's way back is "←" at the left of its head ("좌석 현황 닫기" to a screen reader).
- After a booking, "확인" is the main button and closes the answer, keeping the conversation. The done card's "좌석 현황 보기" is the second way on.
- The mock answers "공부할 자리" with the study card. It follows the main server's rules (`main-server/src/assistant/library/library-rules.ts`, as P05 ticket 34 left them): a seat for tomorrow is refused at once, with a time or without ("관정도서관 열람실은 당일만 예약할 수 있어서 지금은 예약할 수 없어요. 내일 07:00에 열람실이 열면 다시 말해 주세요.").

## What stays as it is

- A seat card in the chat (not on the map), with its band, its buttons, and 닫기.
- The label on the map, the walk, and the faded faces.
- The room cards (스터디룸, 스튜디오).

## Acceptance criteria

- [x] Lowered, the card on the map says "관정 7층 열람실에 17:00부터 1시간, 빈 자리 N석이에요." with "올리면 자리·열람실". It shows no reply words and no chip. (Integration test.)
- [x] A step of the bar's end changes the sentence to "… 17:00부터 1시간 30분 …", and no "바꾼 시간이에요" appears. (Integration test.)
- [x] Raised, the card holds the reply, the chip, "관정 7층 열람실 · N번", "빈 자리 N석", "다른 자리 고르기", and the kiosk foot. (Integration test.)
- [x] With the rooms listed, there is no 예약하기. (Integration test.)
- [x] Logged out, there is exactly one "로그인", beside the input. (Integration test.)
- [x] The label's card names the room once; the seat picture's head says "관정 7층 열람실 좌석 현황" with "좌석 현황 닫기". (Integration tests.)
- [x] After 예약하기, the done card shows, and "확인" beside the input closes the answer. (Integration test.)
- [x] The mock answers "공부할 자리" with a seat card, and refuses "내일 공부할 자리" and "내일 14시에 공부할 자리" at once. (Unit test.)
- [x] No native file changes; oxlint, Prettier, and tsc pass on the app.

## Comments

### Emulator check (2026-11-22)

The debug app on an Android emulator with the mock servers, and the tests' fake library in place of the site (a local change that was not committed). "공부할 자리" from the main map gives the seat card on the map. Lowered, the card says "관정 7층 열람실에 14:00부터 1시간, 빈 자리 470석이에요." with "올리면 자리·열람실". A press there raises it to the reply, the chip, "빈 자리 470석", "관정 7층 열람실 · 7193번 / 오늘 14:00–15:00", 다른 자리 고르기, the kiosk foot, and the note. The chooser lists 7층 and 8층. 8층 정숙 열람실 is chosen, and the label follows: "관정 8층 정숙 열람실 › 8001번". After a drag to 14:00–17:00, the bar and the seat row say 17:00, but the label's picture still said 15:00 three seconds later. The label's text follows a bar step in the integration test, so the drawn picture of the label may lag on the emulator; this is not fixed here. 다른 자리 고르기 opens "관정 8층 정숙 열람실 좌석 현황". 예약하기 books on the fake library; the done card shows, with 확인 beside the input, and 확인 returns to the main map with "이어서 · 공부할 자리 ›".

The done card's "사용 다했으면 꼭 반납처리를 해주세요! 저한테 말해주셔도 되고 키오스크를 이용해 반납하셔도 돼요!" became "다 쓰면 꼭 반납해 주세요. 키오스크에서 하거나, 여기서 "반납해 줘"라고 말하면 돼요." in the app's own voice. Still as they were: the finished card's "예약했어요" above "8001번 예약되었어요!", and the reply's words in the open card after the booking.

### Review (2026-11-22)

A seat card that is one of several requests lost its reply's Plan while the card was lowered, since the booking on the map includes a step's seat card. The lowered sentence, the hidden words, and "올리면 자리·열람실" are now for a booking on the map alone, and a step's seat card keeps its own 로그인. The mock now follows P05 ticket 34, merged meanwhile: a seat for tomorrow is refused at once. `answer-frame-cards` ("draws the first Plan on the map…") and `answer-frame-library-room-window` fail on `5.0/Main`'s own code as well, so they are not this ticket's. `tutorial-kwanjeong-check` read the seat row that the lowered card no longer shows, and now reads the sentence.

### Agent usage (2026-11-22)

- Agent time: about 90 minutes in one session, from the study-flow check at 21:52 to the last push at 23:21 (an estimate). It covers the code reading, the emulator holds (three of eight failed on the hung or slow emulator), the fix, the merge of `5.0/Main`, the review's fixes, the tests, and the pictures.
- Tokens: output 163k; input 87.5M, of which 87.2M cache reads, 350k cache writes, and 380 uncached. One read-only subagent (the main server's answers to "공부할 자리"), about 95k tokens in all.
