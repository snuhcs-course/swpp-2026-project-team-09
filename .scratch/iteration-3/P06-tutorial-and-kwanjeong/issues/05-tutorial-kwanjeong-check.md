# 05: Tutorial 관정 check

Parent: [P06 spec](../spec.md) ("Completing", "The 관정 check")
Status: ready-for-agent
Blocked by: 03, 04

## What to build

In the 관정도서관 quest's sheet, 완료했어요 really checks: the phone asks the library for the User's bookings and completes the quest when it finds one it used or booked, showing the booking with "확인됨" and "관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!". When nothing is found or the library cannot be reached, the User picks 다시 확인, 그냥 완료하기 or 어시스턴트에게 예약 부탁하기, so they are never stuck. Without a library session the login opens first.

It adds the check to ticket 03's 관정 sheet and uses ticket 04's library client and fake library.

## Acceptance criteria

- [ ] 완료했어요 on the 관정 sheet shows "관정도서관 예약 내역을 확인하고 있어요 ···". Without a session it opens the login first; cancelling the login counts as not found.
- [ ] The check calls `getMyBookingList(start = today − 30 days, end = today + 3 days)`. Found means a row with STATUS 2, 3, 4 or 5.
- [ ] Found: the most recent such row as "{ROOM_NAME} · {SEAT_VNAME}번" / "{M월 D일} {USESTART}–{USEEXPIRE} · 예약·이용 기록" with "확인됨", the completionMessage and 퀘스트 완료, which completes `checked` and opens the next-quest pager.
- [ ] Not found: "아직 관정도서관 예약 기록이 없어요.\n예약하고 이용한 뒤 다시 확인해 주세요." with 다시 확인, 그냥 완료하기 (complete `forced`) and 어시스턴트에게 예약 부탁하기.
- [ ] Failed (network, or the session ending mid-call): "도서관 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요." with the same three buttons.
- [ ] Privacy: the booking rows stay on the phone; the server receives only `complete { by }`. A test inspects the requests to our API mock and finds no library data.
- [ ] The check only reads: the fake library records no write request in any of these tests.
- [ ] Tests, named by ADR 0007, integration against the API mocks and the fake library: found (a STATUS 2–5 row), not found (only STATUS 6 and 7), failed, the skip, 예약 부탁, and no session opening the login. The date window gets a unit test.
- [ ] No native file changes beyond ticket 04's (CLAUDE.md § The app's native files).
