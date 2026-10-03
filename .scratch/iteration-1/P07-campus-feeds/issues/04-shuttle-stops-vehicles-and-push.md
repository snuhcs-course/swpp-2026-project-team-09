# 04: Shuttle: stops, vehicles and the push

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines), 03 (Buildings and the Campus Boundary)

## What to build

A User's app draws the circular shuttle route 41946 with its stops and shows each vehicle at the stop the operator reports, moving on as the operator's next answer arrives. The stops are the operator's 14. Their coordinates are seed data from the university's campus map, and the route line is seed data traced along OpenStreetMap's roads through them. Once a day the worker reads the operator's route page: the stops in loop order, each stop's position on the operator's drawing, and the service hours. On weekdays between 08:00 and 21:00 it asks the operator's position endpoint every 15 seconds and sends the vehicles it reports, each as a position on the drawing. The main server stores each vehicle as being at the nearest stop on the drawing, keeps only its latest position, serves the current vehicles, and hands each set of positions to the socket server, which sends it to every connected app with each vehicle's stop, the stop's coordinates and the time the position was received. A position older than a minute is no longer shown, on the server and in the app alike. Outside service hours, or when the operator reports none, the app gets no vehicles, and the service hours to show.

Two steps are a person's: checking the pairs of the operator's stops and the campus map's, and checking the route line on a map. The agent prepares both and records what the person decided under Comments.

## Acceptance criteria

- [x] The stops seed holds the operator's 14 stops in loop order, each with its name as the operator writes it, its position on the operator's drawing as P05 recorded it, and the coordinates of the campus map's stop it is paired with. The campus map lists the loop with 15 stops under names of its own (`.scratch/research/external-sources.md` §6.2); its `제2파워플랜트` is not among the operator's stops and is left out. The agent proposes the 14 pairs from the order of the two lists and the distance to the buildings the names stand for; a person checks them, and the pairs are recorded under Comments (the operator's name, the campus map's name, why).
- [x] The route line seed follows OpenStreetMap's roads around the loop through the 14 stops. The agent produces a first line by following the roads between the stops; a person checks it on a map and corrects it before it is committed, and the corrections are recorded under Comments. P20 rides the loop to confirm it. The stops and the line are stored in ordinary columns, a latitude and a longitude and a list of coordinates, and loaded by ticket 03's seed command, each stop keeping its identifier when the seed is loaded again.
- [x] Once a day, and when ticket 01's command asks for it, the worker sends the operator's stop list from the route page: the names in loop order, each stop's position on the drawing, and the service hours as the page's text. The main server updates the drawing positions and the hours beside the seeded stops. A name the seed does not know is refused and recorded as a failure, because it means the page changed. A page without the expected structure is a failed Collection, as ticket 01 sets.
- [x] On weekdays between 08:00 and 21:00 Asia/Seoul, every 15 seconds, the worker sends the operator's vehicles, each with its `carid` and its position on the drawing. Outside those hours it does not ask. An empty answer is sent as no vehicles.
- [x] The main server stores a vehicle as being at the stop nearest to its drawing position, with the time the position was received, and keeps only the latest position of each vehicle. A position older than a minute is no longer served, so that the vehicles disappear on their own when the service ends or the worker stops.
- [x] A User's route returns the stops in loop order with their coordinates, the route line and the service hours; another returns the current vehicles, each with its stop, the stop's coordinates and the time its position was received. Both need a User's access token. No vehicle carries a label saying its position is estimated.
- [x] Each set of positions the main server stores is sent to the socket server, which sends it to every connected app under one event, each vehicle with its stop, the stop's coordinates and the time its position was received, whether or not the app shows the shuttle layer. The time lets the app drop a vehicle after a minute without a new position (P15).
- [x] Parser tests with saved pages and answers: the route page's stops and hours; vehicles at stops; several vehicles at one stop; an empty answer; a position that is not exactly on a stop, matched to the nearest; the firewall's block page.
- [x] Message-boundary tests: stops stored and served in loop order; an unknown stop name refused and recorded; vehicles stored, served and replaced by a later message; a stale position no longer served; an empty message empties the list; invalid messages refused.
- [x] A socket server test: a positions message from the main server reaches a connected client with each vehicle's stop, coordinates and received time.
- [x] The README of each server records its part: the seed and the pairs, the messages, the routes, and the socket event with what it carries.

## Comments

### Decisions made while implementing (2026-10-02)

The READMEs hold the full text: the main server's Shuttle and Seed data, the worker server's Shuttle and Collections, and the socket server's Shuttle vehicles.

- **A stop is identified by a key of the seed's own.** Each stop in `shuttle-stops.json` has a `key`, a number given once and never reused, and the loader updates a stop in place by it. So a stop keeps its `id` whatever a correction changes, its name, its pair or its place in the loop, as the ticket asks ("each stop keeping its identifier when the seed is loaded again") and as the spec asks of a seed entry whose name changes. Neither origin gives an identifier that outlasts a correction: the operator names its stops only, and the campus map's stop only lends the coordinates. A stop that leaves the file is removed. Places are never removed, because a timetable or a Meetup points at them; nothing that lasts points at a stop, and a stale stop would still be served and matched.
- **The seed keeps what each origin gave, and the pairs in a file of their own.** `campus-map-shuttle-stops.json` holds the campus map's 15 stops as it serves them, `shuttle-stops.json` the operator's 14 names with P05's places on the drawing, each paired with a campus map stop by its name (`campusMapStop`). The loader takes a stop's coordinates from its pair, and fails when a pair names a stop the campus map does not list.
- **A stop's place on the drawing is the seed's only when the stop is first loaded.** After that the route page's Collection keeps it, so that a restart, which loads the seed, does not put P05's places back.
- **The route is one row**, `shuttle_routes` with the number `41946`, holding the line as JSONB, a list of `{ latitude, longitude }`, and the service hours. No spatial type.
- **A stops message must name the seed's stops in its loop order.** The ticket refuses a name the seed does not know because it means that the page changed. A stop left out or a new order means the same, so each is refused too, with an answer of its own: `stops: the seed does not know 법학관`, `stops: not the seed's stops in its loop order, 정문, …`. The handler refuses with `RpcException` before it stores anything, and the worker reports the refusal as a failed Collection with the answer as the reason, as ticket 01 set for a refused message. So the failure is recorded once, by the worker's `collection-failed`. The main server's README names this kind of refusal.
- **Each vehicles message replaces the vehicles as a whole.** The operator lists every vehicle in service in each answer, and its own page redraws them all. A vehicle the operator no longer reports is gone at once, an empty message empties the list as the ticket asks, and the one-minute rule covers a worker that stops sending. `carid` tells the vehicles apart for the app, which follows a vehicle from one set to the next.
- **The vehicles are in Redis, not in a table.** They are the present state of something outside, replaced every 15 seconds, of which no history is kept, as a User's latest position is in P08. The latest set is the one key `shuttle:vehicles`, in the form the route serves, and it expires a minute after the set was received: the expiry is the one-minute rule. The stops and the route stay tables, and the Collection status of `shuttle_vehicles` is recorded in the database, as every Source's is.
- **Several main servers can run.** Messaging publishes a worker's message to every main server, so each stores the set, which leaves the one key the same, and records the Collection's success, which leaves the one row the same. The one whose write changed what is served sends the event, so the apps get each set once. A set that changes nothing, such as no vehicles after no vehicles, is therefore not sent.
- **A set is stored whatever its time.** A message that the worker gave up on can be stored after the next one; the set 15 seconds later puts it right. Refusing an older time would make the vehicles depend on the worker's clock never going back.
- **The nearest stop is taken on the drawing**, between the vehicle's `(x, y)` and each stop's `(left, top)`. A vehicle at a stop is reported at `(left, top + 5)`, and the stops lie at least 50 px apart, so the 5 px never change the nearest stop.
- **The worker sends positions and the main server places them**, as the ticket's and the spec's text on the two servers says. The parser criterion lists "a position that is not exactly on a stop, matched to the nearest" among the parser tests, so it is tested at both seams: the parser sends such a position as it is, and the main server places it at the nearer stop.
- **`receivedAt` is when the worker received the operator's answer**, taken after the request; the message's `collectedAt` carries it. The request can wait behind the menu pages, which are also collected at 10:00 on weekdays. A failure keeps the time the Collection started, as the menus' do.
- **Schedules**: the route page every day at 07:00, before the service starts at 08:00; the vehicles every 15 seconds on weekdays from 08:00:00 to 20:59:45 (`*/15 * 8-20 * * 1-5`). On a holiday, or in a vacation after 18:00, the operator answers with no vehicles, which are sent as such.
- **Timeouts, which ticket 01 left to this ticket.** A page not served within 10 seconds is given up, with an error that names the address, and so is the main server's answer. Without them a Source or a main server that does not answer would hold a Collection due every 15 seconds for 300 seconds, or for good. Both apply to every collector. A vehicle run that is still waiting makes the next ones skip (`waitForCompletion`), so that runs queued behind the menu pages of 10:00, or waiting for a main server that is down, do not go out together. A run still waits behind the menu pages, since the worker asks for one page at a time; the vehicles served disappear meanwhile, which suits positions that old.
- **The push is the event `shuttle-vehicles-updated`**, from the main server to the socket server and from it to every app under the same name, as `session-ended` is. Its payload is the list that `GET /shuttle/vehicles` serves. The main server sends it once the set is stored and does not wait for it: an app that misses one gets the next set 15 seconds later. A set that arrives already more than a minute old leaves nothing to serve, and is sent as it is: the app drops a vehicle by its `receivedAt`.
- **Routes**: `GET /shuttle` gives the stops, the line and the hours, `GET /shuttle/vehicles` the vehicles in the loop order of their stops, then by `carId`.
- **Names**: the Sources `shuttle_stops` and `shuttle_vehicles`, the messages `shuttle-stops-collected` and `shuttle-vehicles-collected`, a feature `shuttle` in each of the three servers, and the saved files `shuttle-stops-2026-10-02.html` and `shuttle-vehicles-2026-10-02.json`. `pnpm collect shuttle_stops shuttle_vehicles` runs the two Collections by hand. `SHUTTLE_SOURCES` lives in the collector, since each of the worker's two message shapes has a file named after its message.
- **`readSeedFile()`** is in `src/common/seed-directory.ts`, since the Places' and the shuttle's loaders read their files the same way.
- **Left as they are**:
  - The `new Set(…).size` checks stay three refinements, as ticket 01's do: a shared helper did not infer its types.
  - The socket test's set-up repeats that of `users.e2e-spec.ts`: its connection differs, and sharing it means changing that ticket's test.
  - A point on the drawing keeps the names its origin gives it: `left` and `top` on the route page, `x` and `y` in the operator's answer, and `drawingLeft` and `drawingTop` in the database, which say whose drawing.
  - One test of the main server reads `shuttle-vehicles-updated` off Redis, though the spec tests the push at the socket server. It is the one check that the main server sends each set, and `session.e2e-spec.ts` reads `session-ended` the same way.
- `stop`, `vehicle` and `route line` are not in `GLOSSARY.md`, nor are `collector` and `seed data`; they can go to `/domain-modeling`.

### The seed and the saved answers (2026-10-02)

- **The saved page and answer** in `worker-server/test/pages/` are the operator's route page and one answer of its position endpoint, each asked once on 2026-10-02 while six vehicles ran, and kept as they were served. The drawing's 14 stops equal the table of `.scratch/research/external-sources.md` §5. §5 says that the page adds no offset to a position; its script subtracts 10 and 12 px before it draws an icon, which centres the icon and does not change the match to a stop.
- **The empty answer and the block page of the tests are not saved ones.** The empty answer is an edit of the saved answer, in the form the operator answered on Sunday 2026-09-27. The block page is written from external-sources.md §2, as ticket 01's is, since no request was blocked.
- **`campus-map-shuttle-stops.json`** is the campus map's answer for its route 61: the 15 stops of §6.2 in order, each with a code, a name and coordinates, and the route's hours by term.
- **The route line** follows the roads of the Overpass query in `shuttle-route.geojson`. OpenStreetMap tags every way of the loop `highway=service`, so the line keeps to the roads open to vehicles: without parking aisles, driveways, the city's trunk roads and the ways marked `access=no` or `motor_vehicle=no`, and along `oneway`. Each stop is placed at the nearest point of a road and joined to the next by the shortest way.
  - It goes through the campus map's 15 stops. Through the operator's 14 alone, the leg from 신소재공동연구소 to 302동 takes a way marked `motor_vehicle=no` and passes 153 m from 제2파워플랜트, which the campus map lists on the loop between them. Through the 15, the line goes south on the west road past 제2파워플랜트, round the one-way turning loop at the southern end, and north past 302동 and 301동.
  - It runs 5,224 m in 215 points, anticlockwise, from 정문 back to 정문. The 14 stops lie 0.6 to 7.1 m from it, 제2파워플랜트 35.5 m. It walks back on itself once: at 정문 the stop lies 16 m north of the junction where the road from 경영대 comes in, so the line goes up to the stop and back down.
  - The script that traced it is not in the repository, so the line cannot be made again from the query alone: it is corrected by hand in its file.
- **The Collections were not run on the real Sources**: the ticket asks for no real run. P20 rides the loop to confirm the line.

### The pairs and the person's check (2026-10-02)

A person checked the 14 pairs and the route line on a map on 2026-10-02 and corrected nothing. Three places of the line were looked at closely: at 정문 the line goes about 15 m north of the junction to the stop and back; at the southern end it goes round OpenStreetMap's one-way turning loop; from 기숙사삼거리 to 국제대학원 it leaves westwards, then turns north. The bus passes the campus map's 제2파워플랜트 without stopping, so it is left out.

The pairs, in loop order. Each was proposed from the order of the two lists and the distance from the campus map's stop to the nearest Place that the operator's name stands for, in the campus map's list.

| # | Operator | Campus map | Why |
|---|---|---|---|
| 1 | 정문 | 정문 | Same name, first in both lists; 67 m from the map's 서울대 정문. |
| 2 | 법과대 | 법대입구 | Second in both lists: the entrance to the law college's buildings, east of the loop, the nearest 197 m away (15-1동). |
| 3 | 자연대 | 자연대500동(행정관) | Third in both lists; named after 500동 of the College of Natural Sciences, 133 m from 24동. |
| 4 | 농생대 | 농생대 | Same name, fourth in both lists; 71 m from 201동. |
| 5 | 38동 | 공대입구 | Fifth in both lists, the entrance to the engineering buildings; 38동 stands 69 m from it, and the next stop 153 m. |
| 6 | 신소재공동연구소 | 신소재연구소 | Sixth in both lists; the same institute, 131동, 56 m away. |
| 7 | 302동 | 302동 공학관 | After the map's 제2파워플랜트, which the operator does not list; 49 m from 302동. |
| 8 | 301동 | 301동 공학관 | 129 m from 301동, which lies 157 m from the map's 302동 공학관. |
| 9 | 유전공학연구소 | 유전공학연구소 | Same name; 29 m from 105동. |
| 10 | 교수회관 | 교수회관입구 | The entrance to the faculty club, 65동, 236 m away; no other stop of the map is nearer to it than 401 m. |
| 11 | 기숙사삼거리 | 기숙사삼거리 | Same name; the three-way junction by the graduate dormitories, 88 m from 903동. |
| 12 | 국제대학원 | 국제대학원 | Same name; 36 m from 140동. |
| 13 | 수의대 | 종합교육연구동 | Thirteenth of the operator's 14 and fourteenth of the map's 15. The map names the stop after 220동, but the College of Veterinary Medicine, 85동, is 170 m from it and 206 m from the next stop, 경영대. |
| 14 | 경영대 | 경영대 | Same name, last in both lists; 40 m from 58동. |

### Tests (2026-10-03)

- Main server, the seed command, on a database of its own: `test/shuttle-seed.e2e-spec.ts` (7). The 14 stops load in loop order at their pairs' coordinates with P05's places on the drawing, and the line as a closed list of coordinates; loading again keeps every identifier and the places the worker stored; in a copy of the seed, a renamed stop and a stop paired with another campus map stop keep their identifiers, the second at that stop's coordinates, and a stop left out is removed.
- Main server, at the message boundary: `test/shuttle.e2e-spec.ts` (25), which sends messages as the worker does and reads `GET /shuttle`, `GET /shuttle/vehicles`, the Collection status and the event on Redis. The stops served in loop order with their coordinates, and the line; the hours of a stops message served and its Collection recorded; an unknown name refused with nothing stored, and the worker's failure recorded; a stop left out and two stops swapped refused; vehicles placed at their stops, three at one stop; a position between two stops placed at the nearer; a later set replacing the vehicles; a set 50 seconds old served and one 61 seconds old not; a set gone by itself a minute after it was received; an empty set emptying the list; each set sent to the socket server, and a set that arrives twice sent once; the places of a stops message deciding where a vehicle is placed; eight invalid messages refused, and the vehicles left as they were; both routes refused without an access token.
- Worker, the parsers fed the saved page and answer: `test/shuttle-route-page-parser.e2e-spec.ts` (5) and `test/shuttle-vehicle-positions-parser.e2e-spec.ts` (6). The stops and the hours; the six vehicles; three at one stop; a position not on a stop; an empty answer; the firewall's block page, to each parser; a stop without its place, a page without hours and a row without a vehicle. Each case that is not the saved page or answer is an edit of it, with a comment that says what it changes.
- Worker, the collector with the Sources and the main server replaced: `test/shuttle-collector.e2e-spec.ts` (12). The route page asked for, and its stops and hours sent; the vehicle positions asked for with a POST of the route as JSON, and sent with the time received; an empty answer sent as no vehicles; the block page and a refusal reported as failed Collections; the two schedules; the command; and, with the timers replaced, a Source and a main server that do not answer given up after 10 seconds, with the next page still asked for, and a vehicle run still waiting making the next runs skip. The menu collector's schedule test finds the menu job among the worker's jobs.
- Socket server: `test/shuttle.e2e-spec.ts` (1). A set sent as the main server sends it reaches two connected apps, with each vehicle's stop, coordinates and received time.
- Each test was written first and seen to fail, except the three invalid stops messages, which the schema of the first slice already refused. Four breaks made by hand were each caught: the seed putting P05's places back, the seed removing nothing, vehicles served at any age, and a set replacing only the vehicles it names.
- With `1.0/Main` merged in and ticket 02 under this ticket: main server 31 files and 374 tests, worker server 11 files and 114 tests, socket server 5 files and 25 tests. `lint`, `format:check` and `typecheck` pass in the three. The seed command logs `Loaded 230 places and 14 shuttle stops`.
- The ticket's one migration, `20261002090315_add_shuttle`, comes after ticket 02's `20261002080053_add_global_events`. From a freshly migrated database, `prisma migrate diff` to the schema finds no difference.

### Agent usage (2026-10-02)

Tickets 02 to 05 were built in one orchestrated run: one session placed the agents and kept the branches and the PRs, and each ticket had an implementing agent in a worktree of its own.

- Agent time for this ticket: about 1 hour 59 minutes, an estimate. The wait for the person's check is not counted.
  - The implementing agent worked about 84 minutes: 59 from reading the ticket to the two proposals, 3 recording the check, 13 acting on the review and 8 moving the branch onto ticket 02's.
  - An exploring agent worked about 8 minutes to save the operator's page and answer while the shuttle ran.
  - The Standards reviewer worked about 11 minutes and the Spec reviewer about 16, at the same time.
- Tokens, for the four agents, counted from their transcripts when this section was written:
  - Input: 167,294,244 in total, of which 164,526,039 were cache reads, 2,767,433 cache writes and 772 uncached.
  - Output: 193,792. The transcripts record only part of the output of most steps, so this is a lower bound.
- The orchestrating session, recorded here once for tickets 02 to 05: about 36 minutes of work between 15:37 and 18:23 KST, an estimate. The time it waited for its agents and for the user is not counted. It read the spec and the tickets, briefed and messaged the agents, rebuilt the branches for one PR per ticket, ran the reviews, and wrote the usage sections and the PRs.
  - Input: 31,164,432 in total, of which 30,789,452 were cache reads, 374,714 cache writes and 266 uncached.
  - Output: 187,422.
  - Counted when this section was written. Opening this ticket's PR, the final report and removing the worktrees came after.
- Moving the ticket's commits onto ticket 02's branch twice more, in the session of ticket 03's review and each time for tickets 02 and 04 together: about 5 minutes each, an estimate.
  - Input: 6,048,007 tokens the first time, of which 6,033,328 were cache reads, 14,659 cache writes and 20 uncached; 12,170,219 the second, of which 12,147,414 were cache reads, 22,779 cache writes and 26 uncached.
  - Output: 8,668 and 12,442.

### Agent usage (2026-10-03)

- One session merged `1.0/Main` into ticket 02's line and into this branch, ran a Standards review and a Spec review side by side, acted on them, and moved the vehicles from a table to Redis: about 46 minutes of work, an estimate. The time it waited for the user is not counted.
- Tokens, with the two reviewers, counted from the transcripts when this section was written:
  - Input: 24,354,352 in total, of which 23,564,566 were cache reads, 789,544 cache writes and 242 uncached.
  - Output: 171,205.
