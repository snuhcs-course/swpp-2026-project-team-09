# P07: Connect existing event, dining and shuttle feeds

Status: ready-for-agent

## Problem Statement

Campus information is scattered. Events are announced on the university site, menus are posted on three separate sites, and the shuttle is shown on the operator's page as dots on a drawing. A User has to visit each of them. The app also needs coordinates for buildings, the shuttle route and the campus outline before it can put anything on the map.

## Solution

The worker server collects events, menus and shuttle positions from their original sources on a schedule and hands them to the main server. The main server stores them and serves them to the app: menus by restaurant and meal, the shuttle's stops, route line and vehicles, the building list, and a walking route on request. Collected events become Drafts for the Administrator. New vehicle positions are pushed to the app through the socket server.

"Existing" in the task title means data that already exists outside the project. It does not mean calling other apps.

## User Stories

1. As an SNU student, I want today's menus grouped by restaurant and meal, so that I can choose where to eat.
2. As an SNU student, I want the price next to each menu, so that I can compare.
3. As an SNU student, I want a meal's operating hours, so that I do not arrive at a closed door.
4. As an SNU student, I want tomorrow's menus, so that I can plan ahead.
5. As an SNU student, I want to see when the menus were last collected, so that I know how fresh they are.
6. As an SNU student, I want the last collected menus when a source is unreachable, so that a failure does not leave the screen empty.
7. As an SNU student, I want the shuttle's stops on the map, so that I know where to wait.
8. As an SNU student, I want each shuttle vehicle shown at the stop the operator reports, as soon as it moves on, so that I can tell how far the next one is.
9. As an SNU student, I want to be told when the shuttle is not in service, so that I do not wait for nothing.
10. As an SNU student, I want the list of campus buildings with their names and, where known, their numbers, so that I can pick a place.
11. As an SNU student, I want a walking route between two points on campus, so that I can find my way.
12. As an SNU student, I want to be told when no route exists, so that I am not shown a wrong one.
13. As an Administrator, I want each collected event to arrive as a Draft, so that nothing reaches Users unchecked.
14. As an Administrator, I want each Draft to carry a link to its source, so that I can check the original.
15. As an Administrator, I want the original text kept when the time or place could not be read, so that I can fill them in myself.
16. As an Administrator, I want an event collected twice to stay one Draft, so that the list has no duplicates.
17. As an Administrator, I want my edits to survive the next collection, so that I do not redo my work.
18. As an Administrator, I want to see when each source was last collected and whether it failed, so that I notice a broken source.
19. As a developer, I want each parser tested with saved pages, so that a change in a parser is checked without calling the real site.
20. As a developer, I want collection to be infrequent and polite, so that the project does not burden the sources.
21. As a developer, I want the parsers written by the team, so that no code is copied from a project without a licence.

## Implementation Decisions

### Sources

| Data | Original source | How often |
|---|---|---|
| Menus | The SNU Co-op menu page, the dormitory menu page, the veterinary college cafeteria page | Twice a day, at 05:00 and 10:00, for today and tomorrow |
| Events | The university's official events list, filtered to the events from today on, and the detail page of each post not yet stored | Four times a day |
| Shuttle stops and service hours | The operator's route page for the circular route | Once a day |
| Shuttle vehicles | The operator's vehicle position endpoint for the circular route 41946 | Every 15 seconds on weekdays between 08:00 and 21:00 |
| Walking route | Kakao's walking route API | On each request |
| Buildings, shuttle route line and stop coordinates, Campus Boundary | OpenStreetMap | Once, loaded as seed data |

- Each source's address, request and page format, observed behaviour and limits, and how the Kakao REST API key reaches the server, are in `.scratch/research/external-sources.md`.
- The collection times are provisional. Nobody has observed when the pages change; the team adjusts the times once the collectors run.
- All times are in the Asia/Seoul time zone.
- The source code of Siksha and Haengsha was read to learn which sources exist and how their pages are built. No code, pattern list or keyword list is copied from them, because their repositories carry no licence.
- The extracurricular programme site is not collected. Its detail pages sit behind a waiting queue and a login.

### Worker and main server

- The worker server only collects. It keeps no data of its own. When it needs to know what the main server already holds, such as which event posts are stored, it asks the main server.
- The worker sends what it collected to the main server as request-and-response messages. The main server validates each message against a schema, refuses one that does not match, and stores the rest.
- Storing is repeatable: the same event, the same menu or the same stop sent twice results in one record.
- Schedules run inside the worker with the NestJS schedule module. One worker instance runs.
- The worker fetches pages in one place, so that tests replace it with saved pages.
- When a collection fails, the stored data stays and the failure is reported to the main server. The main server records, per source, when it was last collected successfully and, apart from it, the last failure with its time and reason, so that a failure stays visible after a later success. P12 shows the record (story 18).

### Menus

- A restaurant's meal on a day is kept as the lines of its cell, in the page's order: each line's text as the page wrote it and, only when the worker is sure, the kind of line (a heading, a dish or a note) and one price. Operating hours, busy hours and closures are note lines of the meal; there is no operating hours field per restaurant. The decision is recorded in `docs/adr/0001-menus-kept-as-lines.md`.
  - Checked on 2026-10-01 on two days of the Co-op and dormitory pages: of the 309 lines of the twelve restaurants with daily menus, 36% were a dish with one price, 29% `※` notes, 24% dishes without a price, mostly under a heading with a set price, and the rest headings with or without a price.
  - The model is provisional. Once the collectors run on the real pages, the team reviews what they send, and how many lines got a kind and a price, before relying on it.
- Only today and tomorrow are collected. The Co-op and dormitory pages take a date; from the veterinary college's week table only today's and tomorrow's rows are sent.
- A later collection replaces everything its source stored for that day, so that a restaurant the page dropped or renamed does not linger. A restaurant the page lists with an empty cell is stored with no lines for that meal; a closure written in the cell, such as `개천절 휴무`, is a note line.
- The four restaurants whose names start with `* ` (`버거운버거`, `공대간이식당`, `75-1동 4층 푸드코트`, `220동식당`) are not collected. They repeat one fixed menu of up to 240 lines in every meal cell, every day, 80% of the page's lines. The Co-op's restaurant information page (식당안내), with each restaurant's building, floor and hours per weekday, is not collected either.
- `기숙사식당` on the Co-op page and `생협기숙사(919동)` on the dormitory page are one restaurant. It is taken from the dormitory page; the Co-op page's row is skipped.
- Restaurant names are stored without the telephone number the Co-op page appends.
- The veterinary college page has no prices and no year in its dates. The year is taken from the collection date, and the weekday next to each date settles it at the turn of the year. Only lunch is collected; dinner is by reservation and described in text under the table.
- A User's app gets one day's menus, grouped by restaurant and then by meal, with each line, and the time each restaurant's menus were last collected. A day with nothing stored is an empty list, not an error.

### Events

- Events are read by rules only. No language model is used.
- Each run lists the events from today on, with the list's date filter, page by page. On 2026-10-01 that was 94 posts on 8 pages. Posts appear one to three months before the event, so a window of one month gave the same pages.
- The worker asks the main server which of the listed posts it already stores, and reads the detail page of the others only. A post is read once: an edit or a deletion at the source after that is not seen. Reading every post again would multiply the requests on the university's site and bring nothing the Administrator has not already reviewed.
- The parser reads the title, the description (the body as text), the start and end time, the place text and the source link. When the time or place cannot be read, the Draft is still stored with the original text.
- Application periods and deadlines stay in the description. About half of the posts sampled on 2026-10-01 had one, written in many forms (`신청마감: 2026. 10. 17.(목) 23:59`, `10월 16일(금) 오후 5시까지`, `인원 마감 시까지`), so no rule reads them in this iteration.
- A post is one Draft, identified by its post number (`bbsidx`). The rules read one start and end per post, as Haengsha's rules do. A post that describes several sessions, such as a lecture series, is split into one Draft per session by the Administrator, until AI does it in a later iteration.
- A collected event is always a Draft. Only an Administrator publishes.
- Once an Administrator has edited or published an event, later collections do not change it. Since a post is read once, no later collection touches a stored Draft at all.
- This task defines how Global Events are stored and their states: Draft, published, cancelled and discarded. A discarded event stays stored, so that the next collection does not bring it back as a new Draft. The administrative API, and the User-facing list of published Global Events, belong to P12; P07 serves no events to Users.

### Shuttle

- The route line and the stops' coordinates are seed data drawn from OpenStreetMap. OpenStreetMap has no relation for the campus shuttle (checked on 2026-10-01: the only bus routes in the campus extent are the city buses 8507, 관악02 and 관악04), so the line is traced by hand along OpenStreetMap's roads, and the operator's 14 stops are matched by hand to OpenStreetMap's bus stops. The names differ (`정문` is `서울대정문`, `기숙사삼거리` is `관악사삼거리`), and `38동` had no clear match when checked. P20 rides the loop to confirm the line.
- The route line, the stops, the buildings and the Campus Boundary are stored in the main database as PostGIS spatial data. The spatial queries are written as raw SQL and kept in one module with a small interface. The rest of the code does not contain spatial SQL.
- The operator reports each vehicle as a position on a drawing, and every position P05 observed in service fell exactly on a stop. A vehicle is therefore stored as being at a stop, the stop nearest to its position on the drawing, with the time the position was received. Its coordinates are the stop's. No fraction of the loop is computed; the app moves a vehicle between stops (P15).
- Only the latest position of each vehicle is kept. Vehicles are told apart by the operator's `carid`. A position older than a minute is no longer served, so that the vehicles disappear on their own when the service ends or the worker stops.
- Each set of positions the main server stores is handed to the socket server, which sends it to every connected app with the stop and its coordinates. The app fetches the current positions once when it opens the map (P15).
- The stops are served in loop order with the route line and the service hours as the route page's text, so that the app can say the shuttle is not in service outside them. An empty set of vehicles means the same.
- Vehicles are shown without any label saying the position is estimated.
- If the operator provides coordinates later, they replace the stop's.

### Buildings and Campus Boundary

- The building list holds the name, the coordinates and, where known, the building number. It is seed data from OpenStreetMap, stored by the main server and served through a list and a search by name or number.
  - On 2026-10-01 the campus extent held 222 buildings, 212 with a name and one with a number tag. 52 names carry the number, such as `27동` or `학생회관(63)`; those numbers are read from the name. Filling in the rest from the university's building list is follow-up work on the seed file, not this task.
- The Campus Boundary is one polygon from OpenStreetMap (relation 11917142), stored by the main server. P08 uses it.
- Each seed file is exported with one Overpass query, which is kept beside it so that the export can be repeated.
- Coordinates are never read off Kakao, Naver or Google maps. Their terms forbid storing or tracing their data.
- The app shows the OpenStreetMap attribution on an information screen.

### Walking route

- The main server calls Kakao's walking route API with a server key and returns the line, the distance and the duration.
- A route is never stored or cached. Kakao's policy does not allow it.
- The API's failure statuses are returned to the app as "no route".

## Testing Decisions

- A good test feeds a saved page to a parser and checks the records that come out, or sends a message to the main server and checks what is stored and served.
- Parsers are tested with saved pages, including a closed restaurant, a dish without a price under a heading with a set price, a line with several prices, an event with several days, an event whose time cannot be read, and an event with an application deadline.
- The vehicle parser is tested with saved answers: vehicles at stops, several vehicles at one stop, an empty answer, and a position that is not exactly on a stop.
- The spatial module is tested against a real database with PostGIS: each shape is stored and read back, and the seed loads.
- The main server's handling of worker messages is tested at the message boundary: invalid messages refused, repeated messages stored once, a later collection replacing a day's menus, a failure recorded with the earlier data still served, a discarded post reported as stored so that it is not collected again, Administrator edits preserved.
- The push of vehicle positions is tested at the socket server: a positions message from the main server reaches a connected client.
- The real sites and the Kakao API are never called in tests. They are replaced at the fetch boundary by saved responses.
- Prior art: the API-level tests of P04.

## Out of Scope

- Filling with AI what the rules could not read, the way the Haengsha project does: rules first, then AI for the start, the end and the place, with each session of a post returned on its own. It comes in a later iteration, and the Administrator still confirms every event.
- The extracurricular programme site.
- Library seats and study spaces.
- Shuttle routes other than 41946.
- Spoken or step-by-step directions. Drawing the walking route on the map is this product's route guidance, and it is part of this iteration.
- Asking the site operators for permission. The team handles it outside the code.
- Letting an Administrator start a collection by hand.
- The fixed-menu restaurants and the Co-op's restaurant information page.
- Menus beyond tomorrow.
- Building numbers that OpenStreetMap's names do not carry.
- Reading a post again after it was stored, to see edits or deletions at the source.
- Application periods and deadlines as a field of a Draft.
- Placing a vehicle between two stops on the server.

## Further Notes

- The schedule names 윤유상 and 김태현 as workers.
- P05 observed the operator's endpoint during service hours: every vehicle position fell on a stop, never between two. The vehicle model above follows that observation; `.scratch/research/external-sources.md` §5 has the details.
- The pages are not versioned interfaces. A change in their layout breaks a parser without notice, and the collection status in story 18 is how the team finds out.
- For other tasks:
  - P15: menus are collected for today and tomorrow, not seven days; operating hours arrive as note lines of each meal, not per restaurant; a vehicle arrives as a stop with its coordinates, and the app moves it between stops.
  - P12: the User-facing list of published Global Events is built in P12 with publishing; P07 serves no events to Users. The collection status per source is stored for P12 to show.
- Decided on 2026-10-01 with 김태현, replacing the first version of this spec: the line model for menus; today and tomorrow only; the fixed-menu restaurants left out; every upcoming event collected and each post read once; one post, one Draft; vehicles at stops without a fraction of the loop; spatial types for all four map shapes; the push of vehicle positions in this task; building numbers only where the name carries one.
