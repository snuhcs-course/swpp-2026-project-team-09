# 08: Shuttle or walk

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 07

## What to build

Every way answer weighs the campus loop shuttle against walking. "셔틀 탈까 걸을까" at 16:40 in building 301, before the 17:00 Class in building 58, answers on the map with the shuttle: the stop to walk to, the shuttle's way along the loop, the walk from the stop where you get off, the stop the shuttle last passed, and when to set out (wireframe row 7, board q4; design section 5, The shuttle in every route answer).

## Acceptance criteria

- [x] The way takes the shuttle when it is at least 3 minutes faster than walking (the server's existing rule), and walks otherwise.
- [x] The shuttle's arrival at the stop is estimated from the stop each running shuttle last passed and the riding time from there, and said as "약 N분 뒤" in the basis. With no shuttle reported, the timing file's average wait for that stop and hour is used, and the basis says so.
- [x] The shuttle way's minutes are the walk to the stop, the wait, the ride, and the walk from the stop. Outside service hours or at a weekend, the shuttle is not offered, and the basis says it is not running.
- [x] The basis of every walk of 15 minutes or more has one line comparing it with the shuttle ("셔틀은 17분 넘게 걸려 걸어요").
- [x] The scene of a shuttle way: the walk to the stop, the ride drawn stop by stop along the loop, the walk from the stop, the walking way shown faded as the way not taken, the two stops, and a flag at the stop the shuttle last passed ("셔틀 · 신소재연구소 지남").
- [x] The map scene gains a stop among the places, the shuttle ride and the faded walk among the routes, and the flags for setting out, being late, and the shuttle. These are declared on both sides, and the app's drawing of a Plan still compiles and draws them plainly until ticket 11.
- [x] Unit tests for the estimate (a shuttle reported, none reported, one already past the stop, outside service hours) with timings chosen by hand; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The estimate.** For the boarding stop the way uses, each reported shuttle arrives after the riding time from its last stop to the boarding stop, at that hour's band. The wait is from the User's arrival at the stop to the first shuttle that arrives at or after it. When no reported shuttle arrives in time, or none is reported, the timing's average wait is used. Which stops to board and leave at is chosen as the server's Travel Time chooses them today.
2. **The lines** of a shuttle way: "**셔틀**이 N분 빨라요" / "**HH:MM**에 나서면 HH:MM 도착" when there is a deadline, and "셔틀로 N분이에요" otherwise.
3. **A way the shuttle does not win** still names the shuttle's minutes in the basis when the walk is 15 minutes or more. The design's note says "more than 15", and board q2 (15 minutes) has the line, so the board is followed.
4. **The scene** draws the ride as one route per stretch between stops, from the stops' positions in the shuttle route; the map draws straight lines, as for every route.
5. **Asking only "셔틀 탈까 걸을까"** goes to the User's next item, as ticket 07's way without a Place does.

## Comments

### Decisions taken in the build (2026-11-15)

1. **The legs** come from `TravelProvider.shuttleWay(from, to, departure)`: the stops ridden, each with the ride to it from the boarding stop, the walk to and from the stops, the timing's average wait, the ride to the boarding stop from every stop of the loop, and one lap of the loop; null outside the service. It is the shuttle `travel` weighs, whose answers are unchanged. The method is optional, so that the evaluation's frozen fixture, which knows no shuttle, still stands for the provider; a way on such a provider says the shuttle is not running.
2. **Whole minutes.** Each leg is rounded up, as a walk is. The shuttle is taken when it gets the User there at least 3 minutes before the walk does, in those minutes, so "셔틀이 N분 빨라요" never says less than 3. `travel` still compares seconds.
3. **The estimate.** A reported shuttle comes to the boarding stop at the time it was reported plus the ride from its stop at that band, rounded down to the minute, so that the User is at the stop when it is said to come. A shuttle reported more than a minute from now is not counted, as the app drops a position older than a minute. A shuttle reported at the boarding stop has just left it, so it comes there one lap after the report. A shuttle that reaches the stop before the User does comes again a lap later, as many laps as it takes to come at or after the User's arrival at the stop. A lap is the ride at that band from the boarding stop to the stop before it plus the ride from that stop back, with the timing's fallbacks (`ShuttleWay.lapSeconds`): from 301동 at 14–17, 1,080 s to 302동 and 135 s back. So on board q4, with the only shuttle reported at the 301동 stop at 16:40, it comes at 17:00 and the User walks, as when it is reported one stop later at 유전공학연구소 and comes at 16:58. The operator's empty list and no list collected are the same: the average wait.
4. **Setting out**, for a reported shuttle, is its arrival less the walk to the stop (board q4's 16:43); with the average wait it is now, and the User waits at the stop. The shuttle is weighed for setting out now, even when the deadline is far ahead.
5. **The lines.** "셔틀이 N분 빨라요" compares the arrivals; "셔틀로 N분이에요" (no deadline) and the basis's "모두 N분" count from setting out. Late even by the shuttle, which no board shows: "**16:52**에 나서면 17:03 도착, 3분 늦어요". From off campus: "정문을 **HH:MM**에 지나면 HH:MM 도착".
6. **The basis of a shuttle way** is the board's four lines. The first adds "약 N분 뒤", from now to the shuttle's arrival, for a reported shuttle ("16:43에 나서 정류장까지 2분 · 16:45 셔틀, 약 5분 뒤"); with none it is "지금 나서 정류장까지 2분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 4분". The walk's line says how late the walk is, as the board's does.
7. **The line of a walk of 15 minutes or more**, after the walk's own: "셔틀은 기다림 없이도 N분(정류장 a · 타기 b · 내려서 c)이라 걸어요" when the shuttle is not 3 minutes faster even without a wait (board q1's form); else "셔틀은 N분 걸려 걸어요" when it is no faster at all (board q2's form, without "넘게", since a rounded-up N is never exceeded); else "셔틀은 N분으로 걷기보다 3분 이상 빠르지 않아 걸어요". Outside the service it is "셔틀은 지금 다니지 않아요 (평일 8–21시)". A shorter walk names no shuttle, running or not.
8. **The scene.** A stop's point holds the shuttle stop's id, labelled "301동 정류장"; the boarding stop's tag adds "16:45 셔틀", or "기다림 약 4분" with the average wait, and the alighting stop's tag is its label. Each stretch of the ride carries the difference of the rounded rides from the boarding stop, so that they add up to the ride's minutes; a stretch can be 0 (수의대 → 경영대 on board q4). The shuttle's flag is drawn only for a reported shuttle. At the Place: "16:53 도착" (`place`), late "17:03 도착 · 3분 늦어요" (`late`), and without a deadline "58동 · 셔틀로 10분" (`place`).
9. **The walk's own flags** became `leave` ("12:45 나서기", "08:50까지 정문 통과") and `late` ("13:05 도착 · 5분 늦어요"); its flag without a deadline stays `place`.
10. **The band** of a shuttle way runs from the half hour at or before now to the half hour at or after the later of the deadline and the arrival; its stretch runs from setting out to the arrival, with the text "16:43 나서기 · 셔틀로 10분", or "16:52–17:03 · 셔틀로 11분" when late.
11. **The actions.** A notification at the setting-out time while it is ahead, the shuttle makes the deadline, and the way takes 5 minutes or more: "지금 나서면 16:45 셔틀로 17:00 수업에 맞아요 · 301동 정류장까지 걸어서 2분". Otherwise, and always with the average wait (setting out is now), route guidance only.
12. **What the model is given** gains `shuttle`: null when the User is at the Place, "not running now", or whether it is taken, the two stops, when to set out, when it comes and what that rests on, the arrival, and the minutes late. `WAY_RULES` sends "셔틀 탈까 걸을까" to findWay with `to` left out, and gives one more one-sentence reply, "16:43에 나서 셔틀을 타면 16:53에 도착해요."
13. **The code.** The estimate is `lookup/shuttle-trip.ts`, the shuttle's words and map `lookup/shuttle-lookup.ts`, and how a way calls its start, Place, and stops moved from `way-lookup.ts` to `lookup/way-naming.ts`, which both use. `WayService` reads the route's stops and the shuttles reported.
14. **The app** declares the roles, and its reply check takes every role of the contract, from lists that the compiler holds to the role types; copies of the server's Lookups for boards q2, q3, and q4 (`mobile/__tests__/fixtures/way-lookups/`), written by `wayAnswer` over the seed as ticket 06's copy was, pass it. `answer-marks.ts` draws no stop until ticket 11, the ride in `color.svcShuttle` (4 pt) and the walk not taken in `color.border` (2 pt), and the new flags in the pick tone. The mock's copied Lookup (ticket 06's `way-lookup.json`) gained the basis line the server now adds ("셔틀은 18분 걸려 걸어요"), as the endpoint test reads it.
15. **The endpoint tests** report no shuttle: only `test/shuttle.integration.test.ts` stores shuttles, in the one Redis key every file shares, and one stored there is years from the tests' clock, so it is not counted. A reported shuttle's estimate is tested on the pure answer.

### Where the files differ from the boards

- Board q4 matches the seed but for the flag: the seed's stop is "신소재공동연구소" (the operator's name), so the flag reads "셔틀 · 신소재공동연구소 지남", not "신소재연구소". The walk is 1,478 seconds (25 minutes); to the 301동 stop 111 s (2); the ride 301동 → 경영대 at 14–17 is 420 s (7); from the 경영대 stop to 58동 31 s (1). A shuttle reported at 신소재공동연구소 at 16:40 rides 315 s to the 301동 stop, which gives the board's example 16:45 and the wait of 3 minutes.
- With no shuttle reported, the average wait is 210 s, 4 minutes: board q4 then reads "셔틀이 11분 빨라요" / "16:40에 나서면 16:54 도착", "모두 14분".
- Board q1: the seed's shuttle leaves at 기숙사삼거리, not 경영대: 2 + 4 (210 s) + 8 (437 s) without the wait, 18 with it, as long as the walk, so the line is "셔틀은 18분 걸려 걸어요"; the board writes "셔틀은 기다림 없이도 18분(정류장 2 · 타기 7 · 내려서 9)이라 걸어요".
- Boards q2 and q3: also via 기숙사삼거리, 2 + 4 + 10 (559 s) = 16 without the wait, so "셔틀은 기다림 없이도 16분(정류장 2 · 타기 4 · 내려서 10)이라 걸어요"; the board writes "셔틀은 17분 넘게 걸려 걸어요".
- Board q15: the walk of 10 minutes names no shuttle, which would take 11 (1 + 4 + 3 + 3).

The endpoint's integration tests (`assistant-way-shuttle.integration.test.ts`, the shuttle the model is given in `assistant-way.integration.test.ts` and `assistant-way-time.integration.test.ts`, and the resolver's exact name in `assistant-resolvers.integration.test.ts`) were written but not run on the build machine, whose lock for runs with containers was held by another session; GitHub CI runs them.

### Agent usage (2026-11-15)

Tickets 06, 07, and 08 together, one pull request: this session (the triage of ticket 05, the tickets, the reviews, and the pull request) and two implementer subagents (06 with 07, then 08 with the resolver fix).

- Agent time: about 2 hours 8 minutes, an estimate from the transcripts' timestamps (the union of active stretches, gaps over 5 minutes left out).
- Tokens: output 435,467; input 105,796,401, of which 104,395,504 were cache reads, 1,400,131 cache writes, and 766 uncached. Without cache reads: 1,836,364.
