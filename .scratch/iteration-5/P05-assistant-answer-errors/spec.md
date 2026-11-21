# P05: Errors in what the Assistant's answers say

Status: ready-for-agent

## Problem Statement

A usage test on 2026-11-21 gave the app to five synthetic users (persona agents) with 30 tasks, against a local stack with demo data, on a Saturday between 03:00 and 08:00. The heaviest problems it found were errors in what the Assistant's answers say. No screen layout fixes them:

- Facts that contradict each other: 301동식당 is open "11:00–14:30" in one answer and "11:30~13:30" in the next; a seat is booked "07:00~13:00" while the same answer says to leave at 10:54; a tutorial place is left out because it "does not open before 18:00" when it is closed all Saturday.
- Numbers that mean nothing to a person: "식사 210분", "13:53까지 173분 먹을 수 있어요", "22:00까지 함께 780분이에요", "19:00–19:30 · 30분".
- An arrival time shown as if it were the event's time: "07:29 가을 정기 음악회" for a concert that began at 06:00.
- Times without a date: "18:00 체육관 파티에 지호가 있어요" for a 파티 the next day; a list of 파티 at 09:00, 14:00 and 12:21 spread over three days with no day on any of them.
- No sense of the hour: a tour of five campus places "지금" at 03:19, ending at 04:18.
- A place said not to be found or not in view when it is: "인문대라는 이름의 건물은 지도에서 찾을 수 없어요", and only 관정 named while a reading room in another building was on the screen.
- The Assistant taking back what it said before ("근거가 없어요"), including sentences the User never saw, and saying "지금 화면의 일정은 …" about a plan no longer on the screen.
- "예약하기를 눌러야 예약돼요" when the card shows only a 로그인 button.
- "지금 계획과 같아요" for a different restaurant, and "같이 먹으면 식사가 28분 줄어요" that does not change when a Friend is removed.

The full results, with the trace of every task, are outside the repository, in the notes of the session that ran the test.

## Solution

Each ticket removes one cause. The tickets are in order of harm:

1. [01 — A restaurant's hours survive a cell with two counters](issues/01-restaurant-hours-with-two-counters.md)
2. [02 — A seat booking fits the User's day](issues/02-seat-booking-fits-the-day.md)
3. [03 — The model's history holds what the User saw](issues/03-history-holds-what-the-user-saw.md)
4. [04 — The tutorial order knows the day and the hour](issues/04-tutorial-order-knows-the-day.md)
5. [05 — An event's line gives the event's own time and place](issues/05-event-line-gives-its-own-time.md)
6. [06 — A free stretch is not called a meal or time together](issues/06-free-stretch-not-a-meal.md)
7. [07 — A time that is not today carries its day](issues/07-times-carry-their-day.md)
8. [08 — The library's words match the card](issues/08-library-words-match-the-card.md)
9. [09 — Nearby study places: every open space in view, and study-building names](issues/09-nearby-study-places.md)
10. [10 — The how-about comparisons compare like with like](issues/10-how-about-compares-like-with-like.md)
11. [11 — Ways: the shuttle line and a Class on another day](issues/11-ways-shuttle-and-another-day.md)
12. [12 — The menu answer shows the dishes, their prices and the hours](issues/12-menu-answer-shows-prices-and-hours.md)
13. [13 — Small wordings of 파티 and invitations](issues/13-party-and-invitation-wordings.md)

## User Stories

1. As a User, I want a restaurant's hours to be the same in every answer, so that I can trust either one.
2. As a User asking for a seat, I want the booking to end before my next item, so that I am not told to leave in the middle of it.
3. As a User asking for a seat at night, I want the answer to start at the library's opening, so that I am not told to set out at 04:40.
4. As a User, I want the seat's start time in the words, not only my arrival, so that "08:13에 도착" and a booking from 08:30 do not read as a contradiction.
5. As a User, I want the Assistant never to take back a sentence I did not see, so that its corrections mean something.
6. As a User, I want the Assistant to speak of the plan on my screen only when it is on my screen.
7. As a new student on a Saturday, I want the tutorial to say a place is closed today, not that it opens after 18:00.
8. As a new student at night, I want the tutorial order to start when the places open, not now.
9. As a User, I want the tutorial answer to tell me why the places it chose are in it, not only why others were left out.
10. As a User asking what to see, I want the event's own time, name and place in the answer, so that I can tell a concert under way from one that starts at my arrival.
11. As a User, I want the map flag of an event to show the event's time, so that "07:29" is not read as the start.
12. As a User asking where to eat, I want to read when the restaurant closes or when I must leave, not a number of minutes the size of the opening hours.
13. As a User meeting a Friend, I want to read until when we are both free, not "780분".
14. As a User, I want every time that is not today to carry its day ("내일 18:00", "월 12:21"), so that I do not go to a 파티 a day early.
15. As a User, I want the Assistant not to tell me tomorrow has no Classes "until 18:00" when tomorrow is Sunday.
16. As a User signed out of the library, I want the answer to tell me what the card asks of me, not a button I cannot see.
17. As a User, I want one name for one zone of the library in the answer and on the card.
18. As a User asking for a study place nearby, I want every open space in view, ranked, not only the first one.
19. As a User, I want "인문대" to find the humanities library, as students call it.
20. As a User comparing places to eat with Friends, I want "지금 계획과 같아요" only when it is the same place.
21. As a User, I want the time lost by eating together to be measured at the same restaurant, so that removing a Friend changes it when it should.
22. As a User asking about the shuttle when it is not running, I want that said first, whatever time I asked about.
23. As a User asking whether I will be late for a Class on another day, I want the walk to start from the building of the Class before it.
24. As a User asking for a menu, I want the dishes with their prices and the hours in the answer, so that asking again is not needed.
25. As a User, I want the Assistant to say when the menu was collected only when I ask or when it is not today's.
26. As a User, I want a 파티's title and place not to repeat each other.
27. As a User recruiting for an activity with no end, I want only its start, not a made-up 30 minutes.

## Implementation Decisions

- The fixes stay in the main server's answers (the lines and map flags it builds, the tools' results and the model's rules), the worker's menu reader, and the app's wording outside the answer screen. The answer screen itself is being rebuilt by P04 and is not touched here.
- Server lines that the app draws in place of the model's text carry the substance: names, places, start and end times, days. The model's sentence is not relied on to carry it, because the app hides it whenever an answer is drawn.
- A time is written with its day when its date is not today ("내일 18:00", "11월 24일 (월) 12:21"). The server gets one helper for this, built from the day words the library answer already uses; the app uses its existing `koreaDay`.
- Minutes are shown only where they are a length a person can act on (a walk, a stay that ends at someone's next item). A stretch that ends at the day's limit or a restaurant's closing is said as a clock time.
- The chat history the app sends back to the server holds, for a reply that drew an answer or a lookup, the words the User saw in place of the model's hidden text.
- No new database tables and no native changes. The menu fix is in the worker's reader; menus collected before it keep their stored hours until the next collection.

## Testing Decisions

- A wrong calculation gets a unit test that fails before the fix: the worker's hours reader, the seat's fill, the tutorial order, the comparison of eating alone and together, the way lookup.
- Server lines and map flags are tested at the unit level on the answer builders, as the existing `*-answer.unit.test.ts` files do.
- Model rules get an evaluation case in `main-server/eval/cases/` where a rule's wording is the fix; a rule has no unit test that would fail.
- App wording is tested at the unit level beside the existing tests of each feature (`mobile/__tests__/features/`).

## Out of Scope

- Breakfast. The meal planner leaves breakfast out on purpose, so "배고파" at 04:00 plans lunch. Planning breakfast is a decision of its own (see Further Notes).
- A confirmation before [이대로 초대] sends invitations. Sending at one press is what Iteration 4's P03 spec asked for; changing it is a decision of its own.
- The answer screen (`screens/main/answer/`): hiding the model's text when an answer is drawn, the tutorial card not listing its steps, the "답이 없어도 … 가면 돼요" line on every invited card. These go to P04.
- Taps on the map (a restaurant label that presses the building under it, the User's own dot, the origin chip).
- The 파티 reply that says its search found none (P02) and a message with several requests (P03).

## Further Notes

Every error of the usage test's list of answer errors, and where it went:

| Error | Where |
|---|---|
| 301동식당 11:00–14:30 in one answer, 11:30~13:30 in the next | Ticket 01 |
| "07:00~13:00 예약" beside "10:54엔 나서요"; "04:40에 도착해요"; "08:13" for a booking from 08:30 | Ticket 02 (words; the length stays, see below) |
| "근거가 없어요" about sentences never shown; "지금 화면의 일정은 …" about a plan no longer drawn | Ticket 03 |
| "18:00 전에는 열지 않아" on a Saturday; five places "지금" at 03:19; a basis of only the places left out; "오늘 남은 일정이 없어요" | Ticket 04 |
| "07:29 가을 정기 음악회", an arrival read as the start; no name, place or time in the first line | Ticket 05 |
| "식사 210분", "13:53까지 173분 먹을 수 있어요", "22:00까지 함께 780분이에요" | Ticket 06 |
| Times without a date; "내일은 18:00까지 수업이 없어서" for a Sunday | Ticket 07 |
| "예약하기를 눌러야" beside a 로그인 button; "관정관" and "관정도서관" | Ticket 08 |
| A reading room in view left out; "인문대라는 이름의 건물은 지도에서 찾을 수 없어요" | Ticket 09 |
| "지금 계획과 같아요" for another restaurant | Ticket 10 |
| The shuttle question answered with the walk again; a Monday Class reached from where the phone was; "자연과학관6(24동)는" | Ticket 11 |
| A menu answer with no prices; "메뉴는 … 수집된 정보예요" unasked | Ticket 12 |
| "민수랑 학생회관에서 만나기 · 학생회관"; a description repeating the card; "19:00–19:30 · 30분"; "내 파티에 처음 들어왔어요" | Ticket 13 |
| Found later, in use of the released app 26.11.21-2: "월요일에 밥 뭐 먹을까" asked back in text, then "한식" answered with a list of every Restaurant's dishes | Ticket 14 |
| Found later, in use of the released app 26.11.21-3 or -4: "점심 뭐 먹지?" with a lunch already in the schedule answered that there was nowhere to go | Ticket 16 |
| Found later: the Assistant knows nothing of the User's own Quests ("오늘 뭐 있지?", "민수랑 약속 몇 시였지?"), and a planner treats them as a wall | Ticket 17 |
| Found later, designing ticket 17: a step changed in the room leaves every Holder's time to leave for the old time | Ticket 21 |
| Found later, as the app stops dropping words beside a Lookup: a way's reply repeats the map ("문화관(73동)은 여기예요") | Ticket 22 |
| Found later (feedback 2026-11-22): a 파티 already made "changed" by proposing a second one | Ticket 18 |
| Found later (feedback 2026-11-22): a 파티 proposed over the asker's own Class without a word, or with a Class of another day | Ticket 19 |
| Found later (feedback 2026-11-22): "맞는 파티는 없었어요" still opens a reply after P02's rule, on the open-파티 path | Ticket 20 |
| Found later (feedback 2026-11-22): questions back come as words; the Board first, a Place and a time later | Tickets 23 and 24 |
| Found later (feedback 2026-11-22): "<name> · 자리 모름" for two different things | Ticket 25 |
| A first sentence that sounds like a failure ("…파티는 찾지 못했어요", "…열려 있는 게 없어서") | P02 ticket 01 (pull request 384) |
| A part of the request dropped without a word (관정, 16시 and the booking) | P03 tickets 01 and 02 (pull requests 385 and 386) |

Left on purpose, with the reason:

- **Decisions for the product owner.**
  - Breakfast. "배고파" at 04:00 plans lunch because the meal planner leaves breakfast out by design, although the menus hold 천원의아침밥 and 학생회관식당's breakfast.
  - A confirmation before [이대로 초대]. Sending every invitation at one press is what Iteration 4's P03 spec asked for; one tester was uneasy, another liked the confirmation table of the chat's 파티 card.
  - The length of a filled seat. The design fills the longest time from the arrival and says the leave-by time; ending the booking at the leave-by time instead would change it (ticket 02).
- **Not errors.**
  - "같이 먹으면 식사가 28분 줄어요" that stayed after a Friend was removed: the design compares with the User's best plan alone, and the Friend who stayed was the one who limited the plan (ticket 10).
  - The zone's three names (room chip, list cell, catalogue name) are the seat card's design (ticket 08).
- **The answer screen, which P04 rebuilds.** The card hides the model's text whenever an answer is drawn; the tutorial card does not list the order's steps; every invited card repeats "답이 없어도 … 가면 돼요".
- **Artefacts of the test setting.** "06:00 63동 일정 끝" and three identical "63동에서 체육관까지 걸어서 14분" lines (the demo Quest's step at 63동 three hours after seeding, and every demo Friend starting there); "오늘 부대짬뽕" on a Saturday (demo menus are the same every day); origins that change between answers (the moving fake location); "학과" for "학관" (the input tool's typo).
- **Taps on the map.** "500동 / 그곳에는 여는 식당이 없어요" after a restaurant label pressed the building under it.

## Comments
