# 34: A study seat for another day is refused at once, not asked its time

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server only. The reply keeps its shape, a refusal with no card, so the app is unchanged.

## What happens now

The library session found this by reading the code, not by running it:

- "공부할 자리" gives the seat card for 관정 7F, with the time filled from when the User arrives (`LIBRARY_ANSWER_RULES`, `proposeLibraryBooking`).
- "내일 공부할 자리" first asks "몇 시부터 몇 시까지 예약할까요?". The answer app's rule says to ask the time of "a seat for another day".
- Once the User answers, proposeLibraryBooking refuses: "열람실은 당일만 예약할 수 있어요". Every answer to that question is refused.
- Called with no time, proposeLibraryBooking also listed "몇 시부터 예약할지 알려 주세요" and "몇 시간 또는 몇 시까지 예약할지 알려 주세요" beside the day's refusal. That invites the same question again.

## The same-day rule is the library's

- The site's own sector list, saved read-only on 2026-11-01, is `.scratch/iteration-3/P06-tutorial-and-kwanjeong/references/kwanjeong-fixtures/getSectorList_all.json`.
- It gives `DAY_FROM 0` and `DAY_TO 0` for every seat space: the 7A and 8A 열람실, the 노트북존s and 대학원 열람실.
- Other spaces in that list:
  - The group study rooms, 창의미디어스페이스, 미디어캐럴, XR Experience Center and Creative Media Studio have `DAY_TO 3`.
  - 정보검색실 and the 멀티미디어 seats have 0.
  - The two 캐럴s have 30 and 120.
- The catalogue's `booking_ahead_days: 0` for the 열람실 is taken from that list.
- What the code does not know: the hour on the day when the site starts taking a seat booking. `window-opening.ts`'s 09:00 is the wireframe's, for rooms.
- What it does know: the 열람실's hours, 07:00–23:00, from the catalogue. The reply names those.

## What to build

- `checkBooking` refuses a seat for a day after today for its day alone: "열람실은 당일만 예약할 수 있어요", bound today. That holds whatever else the request holds or lacks: a time, a length, a seat, people. Asking any of them could only be refused in turn.
- `proposeLibraryBooking` answers that refusal with `sameDayOnly: { opens }`, the space's opening (07:00 for the 열람실), and shows no card.
- The answer app's rule (`LIBRARY_ANSWER_RULES`), the path the released app takes:
  - A seat for a later day is never asked about, with a time or without. The model calls findLibrarySpace and proposeLibraryBooking with that day at once.
  - On `sameDayOnly`, the reply says in one sentence that 관정도서관 takes seat bookings on the day only, so it cannot be booked now. It then says that the User can ask again on that day, when the 열람실 opens at 07:00. It asks nothing back.
  - Rooms keep asking for a missing time.
- The text chat's rules are frozen by `test/fixtures/library/text-chat-rules.txt` and stay as they are. Its tool answers for such a seat now hold the day's refusal alone, with `sameDayOnly`.
- To stay within the 300-line limit, the people checks (`peopleRefusal`, `PARTY_MAX`, `PARTY_REFUSAL`) move unchanged to `booking-people.ts`. `booking-rules.ts` exports them as before.

## Case table

Asked on Wednesday 2026-11-04, from the app that draws answers.

| Row | Asked | Answer | Where tested |
| --- | --- | --- | --- |
| 1 | "공부할 자리" (today, no time) | the card for 7F-7A-zone2, filled from the arrival, as before | `assistant-library-seat-arrival.integration.test.ts`; eval `library-answer-seat-today` |
| 2 | "오늘 5시에 공부할 자리" (today, a time) | the card at 17:00, as before | the same file ("a named start is checked and shown") |
| 3 | "내일 공부할 자리" | refused for the day alone, `sameDayOnly.opens` 07:00, no card, no question | the same file; `library-booking-rules.unit.test.ts`; eval `library-answer-seat-tomorrow` |
| 4 | a weekday named, later this week ("금요일 7층 열람실") | as row 3, for that day | `library-booking-rules.unit.test.ts` (2026-11-06) |
| 5 | "이번 주말 공부할 자리" | as row 3, for the day the model reads. The day's refusal comes before any closing that day | the rule; as row 4 |
| 6 | a day already past | "지난 날짜는 예약할 수 없어요", as before | `library-booking-rules.unit.test.ts` |
| 7 | "내일 아침 9시에 공부할 자리" | as row 3: the time does not bring a card | `assistant-library-seat-arrival.integration.test.ts`; eval `library-answer-seat-tomorrow-at-nine` |
| 8 | a room for a later day within 3 days, no time | asks for the time, as before | `assistant-library-seat-arrival.integration.test.ts` ("a room without a start") |

## Acceptance criteria

- [x] Rows 3, 4 and 7: the day's refusal alone, with `sameDayOnly`, and no card. The unit tests fail on 5.0/Main, which also lists the time and seat refusals.
- [x] Rows 1, 2, 6 and 8 are unchanged.
- [x] The answer app's rule asks nothing of a seat for a later day and says what `sameDayOnly` means. The text chat's rules are unchanged.
- [x] Eval cases for "공부할 자리", "내일 공부할 자리" and "내일 아침 9시에 공부할 자리" from the current app, in a new world `p6-answer` that leaves the frozen P6 suite as it is.
- [ ] The eval cases are run once on a cheap model. Not run yet: this worktree has no `.env` with the team's model key, and a session may not read one. How sessions may reach the key is the user's decision. They run once a way is allowed.
- [x] Lint, format and types of the main server pass.

## Comments
