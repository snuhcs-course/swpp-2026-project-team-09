# 07: The study answer's first frame and its give-up, held in tests

Parent: [P01 spec](../spec.md); the orchestrator's hands-on use of the study answer on the emulator on 2026-11-23
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: none (tests only).

## What happens now

On the emulator, about 30 seconds after asking, the study answer showed no library mark, the Friends' faces at full weight, and "찾고 있어요". The seats came only after about 60 seconds, with no "받지 못했어요" and no "다시 찾기" in between. The emulator was under heavy load, and the app's JavaScript was starved for about a minute.

## What changes

- Two integration tests hold the seats' read, with a library that never answers (`FakeLibrary.holdSeats`):
  - From the first frame, the map holds 관정관's label "관정 7층 열람실 › · 17:00–18:00" and the walk there. The card says "관정 7층 열람실에서 17:00부터 1시간, 빈 자리를 찾고 있어요.", and 예약하기 beside the input is disabled.
  - After 8 s, the card says "관정 7층 열람실의 빈 자리를 받지 못했어요." with 다시 찾기, and no "찾고 있어요".
- Both pass with the app as it is: the label and the walk do not wait for the seats, and the 8 s give-up fires. What the emulator showed was its starved JavaScript, which runs timers and draws the label's picture late.

## Acceptance criteria

- [x] With the seats held, the first frame shows the label and the walk, the loading sentence, and a disabled 예약하기. (Integration test.)
- [x] With the seats held, 8 s later the card says so with 다시 찾기. (Integration test.)

## Comments

### Agent usage (2026-11-23)

- Agent time: about 10 minutes (an estimate), within the session that wrote tickets 03 to 06.
- Tokens: within that session's totals for 2026-11-23.
