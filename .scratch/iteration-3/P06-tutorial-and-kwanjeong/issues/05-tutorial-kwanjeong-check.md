# 05: Tutorial 관정 check

Parent: [P06 spec](../spec.md) ("Completing", "The 관정 check")
Status: ready-for-human
Blocked by: 03, 04

## What to build

In the 관정도서관 quest's sheet, 완료했어요 really checks: the phone asks the library for the User's bookings and completes the quest when it finds one it used or booked, showing the booking with "확인됨" and "관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!". When nothing is found or the library cannot be reached, the User picks 다시 확인, 그냥 완료하기 or 어시스턴트에게 예약 부탁하기, so they are never stuck. Without a library session the login opens first.

It adds the check to ticket 03's 관정 sheet and uses ticket 04's library client and fake library.

## Acceptance criteria

- [x] 완료했어요 on the 관정 sheet shows "관정도서관 예약 내역을 확인하고 있어요 ···". Without a session it opens the login first; cancelling the login counts as not found.
- [x] The check calls `getMyBookingList(start = today − 30 days, end = today + 3 days)`. Found means a row with STATUS 2 (booked), 3 (checked in), 4 (좌석미반납, 사용시간 만료: the use time ran out without a return, so the seat was used) or 5 (returned).
- [x] Found: the most recent such row as "{ROOM_NAME} · {SEAT_VNAME}번" / "{M월 D일} {USESTART}–{USEEXPIRE} · 예약·이용 기록" with "확인됨", the completionMessage and 퀘스트 완료, which completes `checked` and opens the next-quest pager.
- [x] Not found: "아직 관정도서관 예약 기록이 없어요.\n예약하고 이용한 뒤 다시 확인해 주세요." with 다시 확인, 그냥 완료하기 (complete `forced`) and 어시스턴트에게 예약 부탁하기.
- [x] Failed (network, or the session ending mid-call): "도서관 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요." with the same three buttons.
- [x] Privacy: the booking rows stay on the phone; the server receives only `complete { by }`. A test inspects the requests to our API mock and finds no library data.
- [x] The check only reads: the fake library records no write request in any of these tests.
- [x] Tests, named by ADR 0007, integration against the API mocks and the fake library: found (a STATUS 2–5 row), not found (only STATUS 6 and 7), failed, the skip, 예약 부탁, and no session opening the login. The date window gets a unit test.
- [x] No native file changes beyond ticket 04's (CLAUDE.md § The app's native files).

## Comments

- Built on 3.0/Main at ab1ba1ef (tickets 01–04 merged). The check is `mobile/src/features/tutorial/kwanjeong-check.ts` (the window, which STATUS counts, the row's words, and the login-then-read order); the sheet's states are in `use-tutorial-flow.ts` (`checking`, `notFound`, `failed`, and `message` with the booking), the bubble in `tutorial-said.tsx`. The places and links moved to `tutorial-places.tsx` to keep `tutorial-sheet.tsx` under the line limit; `TUTORIAL_SHEET_FLAGS` stays in `tutorial-sheet.tsx`, where ticket 07 sets it.
- "Today" is the phone's clock in Korea's calendar (as the login's check reads it), not the mock build's frozen frame time, since the library is the real site in every build.
- A login that ends out of time (5 minutes, "로그인하지 못했어요") counts as not found, as a cancel does. A session that ends mid-call is `failed`; the flag is cleared, so 다시 확인 opens the login.
- 그냥 완료하기 completes `forced` and goes straight to the next-quest pager, as MainTutorialFail's button does, without the completionMessage. While the check runs the sheet shows no buttons and does not close, as in the frames.
- 어시스턴트에게 예약 부탁하기 stays behind `TUTORIAL_SHEET_FLAGS.askAssistantToBook` (false until ticket 07, #179); with it on, it shows on the 관정 sheet and after a check that found nothing or failed, and sends "관정도서관 7층 열람실에 한 자리 예약해줘".
- Wireframes read at version 1793520134-8f7e, the version last reviewed; MainTutorialOk/Fail/Sheet/Next did not change.
- Left for a person (ready-for-human): the check on a real phone against the real site, with a real booking and with none. The hidden web view does not run on web, so there are no screenshots.

### Agent usage (2026-11-02)

- Agent time: about 40 minutes, an estimate, one implementer subagent; most of it waiting on Jest runs.
- Tokens: an estimate, input about 4,000,000 (cache reads about 3,800,000, cache writes about 200,000, uncached under 10,000); output about 45,000.
