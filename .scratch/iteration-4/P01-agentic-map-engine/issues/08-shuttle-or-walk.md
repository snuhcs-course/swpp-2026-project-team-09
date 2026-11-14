# 08: Shuttle or walk

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 07

## What to build

Every way answer weighs the campus loop shuttle against walking. "셔틀 탈까 걸을까" at 16:40 in building 301, before the 17:00 Class in building 58, answers on the map with the shuttle: the stop to walk to, the shuttle's way along the loop, the walk from the stop where you get off, the stop the shuttle last passed, and when to set out (wireframe row 7, board q4; design section 5, The shuttle in every route answer).

## Acceptance criteria

- [ ] The way takes the shuttle when it is at least 3 minutes faster than walking (the server's existing rule), and walks otherwise.
- [ ] The shuttle's arrival at the stop is estimated from the stop each running shuttle last passed and the riding time from there, and said as "약 N분 뒤" in the basis. With no shuttle reported, the timing file's average wait for that stop and hour is used, and the basis says so.
- [ ] The shuttle way's minutes are the walk to the stop, the wait, the ride, and the walk from the stop. Outside service hours or at a weekend, the shuttle is not offered, and the basis says it is not running.
- [ ] The basis of every walk of 15 minutes or more has one line comparing it with the shuttle ("셔틀은 17분 넘게 걸려 걸어요").
- [ ] The scene of a shuttle way: the walk to the stop, the ride drawn stop by stop along the loop, the walk from the stop, the walking way shown faded as the way not taken, the two stops, and a flag at the stop the shuttle last passed ("셔틀 · 신소재연구소 지남").
- [ ] The map scene gains a stop among the places, the shuttle ride and the faded walk among the routes, and the flags for setting out, being late, and the shuttle. These are declared on both sides, and the app's drawing of a Plan still compiles and draws them plainly until ticket 11.
- [ ] Unit tests for the estimate (a shuttle reported, none reported, one already past the stop, outside service hours) with timings chosen by hand; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The estimate.** For the boarding stop the way uses, each reported shuttle arrives after the riding time from its last stop to the boarding stop, at that hour's band. The wait is from the User's arrival at the stop to the first shuttle that arrives at or after it. When no reported shuttle arrives in time, or none is reported, the timing's average wait is used. Which stops to board and leave at is chosen as the server's Travel Time chooses them today.
2. **The lines** of a shuttle way: "**셔틀**이 N분 빨라요" / "**HH:MM**에 나서면 HH:MM 도착" when there is a deadline, and "셔틀로 N분이에요" otherwise.
3. **A way the shuttle does not win** still names the shuttle's minutes in the basis when the walk is 15 minutes or more. The design's note says "more than 15", and board q2 (15 minutes) has the line, so the board is followed.
4. **The scene** draws the ride as one route per stretch between stops, from the stops' positions in the shuttle route; the map draws straight lines, as for every route.
5. **Asking only "셔틀 탈까 걸을까"** goes to the User's next item, as ticket 07's way without a Place does.

## Comments
