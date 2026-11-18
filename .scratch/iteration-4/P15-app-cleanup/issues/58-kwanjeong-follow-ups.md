# 58: A 관정 card keeps one time while it books, and a reopened login is not closed by the last one's check

Parent: [P15 spec](../spec.md), item 58; the approving review of #360 (ticket [57](57-kwanjeong-login-and-seat-picker.md)), "Worth a follow-up, not blocking"
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

### The card can show the old time while it books

`BookSeatCard` (`mobile/src/screens/main/library/book-seat-card.tsx:284`) passes `slot={busy ? room.slot : live}` to the seat part. A 17:00 card that draws again after 17:00 has `live` 17:30, so the seats are read for 17:30 and 예약하기 books 17:30. While that booking is on its way, `busy` makes the card take `room.slot` again, which is still 17:00. The seats are read for 17:00, the offer unmounts while they load, and "예약하는 중이에요" goes with it. The room chip's counts are read for the kept 17:00 too.

### A ✕ that still waits can close a login opened again

`LoginChecks` (`mobile/src/library/login-checks.ts:64-96`) keeps one `closing` mark for the view closed while a check ran, and the provider keeps that close's outcome (`library-session.tsx:179-195`). Neither is cleared when 로그인 opens the view again. Case: ✕ while a check runs, then 로그인 again, then the school's login. The closed view's last check ends with no session while `closing` is still set, so `end('noSession')` closes the new view while the User types.

## What changes

- The card holds one time: when the kept time can no longer be booked as it is (its start went by), the kept time becomes the next one it can be (`room.setSlot(live)`). What the card shows, the seats and counts it reads, what it books and the done message name that time at every moment. While a booking is on its way, the kept time stays as it was booked.
- Each login view opened is a new one (`LoginChecks.opened()`). A close that still waits belongs to the view it was made for. When 로그인 opens a view again, that close's outcome is dropped, and a check made for the closed view that finds no session says nothing. One that finds the session still logs the User in, which ends the new view as logged in. The callers of both views hear the new view's outcome.

## What stays as it is

- The band's rules, the booking's guard and everything else of ticket 57.
- The phone check of a first login, the pinch and the screens, which a person owes (ticket 57).

## Acceptance criteria

- [x] A seat book card left open across its start and then booked shows, reads and books the next time it can (17:30–18:30) throughout, and "예약하는 중이에요" stays until the library answers. (Integration test; fails on `37f67bdc`.)
- [x] ✕ while a check runs, then 로그인 again and the school's login: the closed view's last check finding no session leaves the new view open; the new view's own check that finds the session logs the User in and the card loads. (Integration test; fails on `37f67bdc`.)
- [x] The tests of ticket 57's login and booking still pass.
- [x] No native file; CI's lint, Prettier and tsc pass on the app.

## Comments

### Notes from the implementation (2026-11-18)

- The card's one time is `useOneSlot` in `book-seat-card.tsx`. It moves the kept time on in an effect after the card draws, so the room chip's counts follow too (`useRecount`). A time moved this way counts as changed from the Assistant's, so the card says "바꾼 시간이에요. 위 답의 시각은 처음 시간 기준이에요."
- The login side keeps a view number in `LoginChecks`, set by `opened()`, which the provider calls from `logIn`. The waiting close's outcome is dropped there too (`useClose().reopened`).
- Both tests failed on `37f67bdc` before the fix:
  - the card's seats were read for 17:00 again;
  - the reopened view was closed by the old check.
- Run alone, each under the memory cap: the two new files, `answer-frame-library-login-closed` (5), `answer-frame-library-login` (3), `answer-frame-library-book` (14), `answer-frame-library-band-kept` (3), `library-session` (7) and `tutorial-kwanjeong-check` (13). All pass.
- Locally `tsc` and the test-level check also see a git-ignored `mobile/coverage/keep/` folder left in the worktree. CI does not have it.

### Agent usage (2026-11-18)

Estimates from the session transcript, with waits for the shared machine left out:

- Agent time: about 40 minutes, in one Opus 5.5 session (a subagent of the orchestrating session).
- Tokens: output about 25,000. Input about 4 million: about 3.8 million cache reads, 0.2 million cache writes and a few thousand uncached.
