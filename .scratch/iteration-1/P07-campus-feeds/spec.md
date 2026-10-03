# P07: Connect existing event, dining and shuttle feeds

Status: ready-for-agent

## Problem Statement

Campus information is scattered. Events are announced on the university site, menus are posted on three separate sites, and the shuttle is shown on the operator's page as dots on a drawing. A User has to visit each of them. The app also needs coordinates for buildings, the shuttle route and the campus outline before it can put anything on the map.

## Solution

The worker server collects events, menus and shuttle positions from their original sources on a schedule and hands them to the main server. The main server stores them and serves them to the app: menus by restaurant and meal, the shuttle's stops, route line and vehicles, the list of Places, and a walking route on request. A collected event whose time and place were read is published; the others become Drafts for the Administrator. New vehicle positions are pushed to the app through the socket server.

"Existing" in the task title means data that already exists outside the project. It does not mean calling other apps.

## User Stories

1. As an SNU student, I want today's menus grouped by restaurant and meal, so that I can choose where to eat.
2. As an SNU student, I want the price next to each menu, so that I can compare.
3. As an SNU student, I want a meal's operating hours, so that I do not arrive at a closed door.
4. As an SNU student, I want menus for the coming days, so that I can plan ahead.
5. As an SNU student, I want to see when the menus were last collected, so that I know how fresh they are.
6. As an SNU student, I want the last collected menus when a source is unreachable, so that a failure does not leave the screen empty.
7. As an SNU student, I want the shuttle's stops on the map, so that I know where to wait.
8. As an SNU student, I want each shuttle vehicle shown at the stop the operator reports, as soon as it moves on, so that I can tell how far the next one is.
9. As an SNU student, I want to be told when the shuttle is not in service, so that I do not wait for nothing.
10. As an SNU student, I want the list of the campus's Places with their names and, for buildings, their numbers, so that I can pick a place.
11. As an SNU student, I want a walking route between two points on campus, so that I can find my way.
12. As an SNU student, I want to be told when no route exists, so that I am not shown a wrong one.
13. As an SNU student, I want an announced event whose time and place could be read to appear without waiting for anyone, so that I see events as they are announced.
14. As an Administrator, I want a collected event that could not be read fully to arrive as a Draft, so that nothing incomplete reaches Users.
15. As an Administrator, I want each collected event to carry a link to its source, so that I can check the original.
16. As an Administrator, I want the original text kept when the time or place could not be read, so that I can fill them in myself.
17. As an Administrator, I want an event collected twice to stay one event, so that the list has no duplicates.
18. As an Administrator, I want my edits to survive the next collection, so that I do not redo my work.
19. As an Administrator, I want to see when each source was last collected and whether it failed, so that I notice a broken source.
20. As a developer, I want each parser tested with saved pages, so that a change in a parser is checked without calling the real site.
21. As a developer, I want collection to be infrequent and polite, so that the project does not burden the sources.
22. As a developer, I want the parsers written by the team, so that no code is copied from a project without a licence.
23. As a developer, I want to run one collection by hand, so that a server I have just started holds data without waiting for the next scheduled time.

## Implementation Decisions

### Sources

| Data | Original source | How often |
|---|---|---|
| Menus | The SNU Co-op menu page, the dormitory menu page, the veterinary college cafeteria page | Twice a day, at 05:00 and 10:00, for today and the six days after |
| Events | The university's official events list, filtered to the events from today on, and the detail page of each post not yet stored | Four times a day |
| Shuttle stops and service hours | The operator's route page for the circular route | Once a day |
| Shuttle vehicles | The operator's vehicle position endpoint for the circular route 41946 | Every 15 seconds on weekdays between 08:00 and 21:00 |
| Walking route | Kakao's walking route API | On each request |
| Places, shuttle stop coordinates | The university's campus map; a few Places from OpenStreetMap and the national map | Once, loaded as seed data |
| Shuttle route line, Campus Boundary | OpenStreetMap | Once, loaded as seed data |
| Outlines of the Places | 국토지리정보원's 연속수치지형도 건물 layer, downloaded from VWorld by a person, and OpenStreetMap for what that layer does not draw | Once, loaded as seed data |

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
- A developer runs one collection of a source by hand, with a command of the worker server that does what the scheduled run does. Nothing is collected when the worker starts.
- The worker fetches pages in one place, so that tests replace it with saved pages.
- A page is read only when it has the structure its parser expects, such as the menu table and the date that was asked for. A page without it is a failed collection, not an empty one: the university's firewall answers a blocked request with status 200 and another page. A table that is there and lists nothing is an empty result.
- When a collection fails, the stored data stays and the failure is reported to the main server. The main server records, per source, when it was last collected successfully and, apart from it, the last failure with its time and reason, so that a failure stays visible after a later success. P12 shows the record (story 19).

### Menus

- A restaurant's meal on a day is kept as the lines of its cell, in the page's order: each line's text as the page wrote it and, only when the worker is sure, the kind of line (a heading, a dish or a note), one price and, for a dish with a price, the dish's name without the price. Operating hours, busy hours and closures are note lines of the meal; there is no operating hours field per restaurant. The decision is recorded in `docs/adr/0001-menus-kept-as-lines.md`.
  - The first collection, of the pages of 2026-10-01 and 10-02, read 303 lines of twelve restaurants: 114 dishes with a price, every price read correctly, 84 notes, 26 headings and 79 lines without a kind, 71 of them dishes listed under a heading with a set price.
- Today and the six days after are collected. The Co-op and dormitory pages take a date; from the veterinary college's week table the rows from today on are sent. A restaurant fills in its later days as it posts them, and the next collection brings them.
- A later collection replaces everything its source stored for that day, so that a restaurant the page dropped or renamed does not linger. A restaurant the page lists with an empty cell is stored with no lines for that meal; a closure written in the cell, such as `개천절 휴무`, is a note line.
- The four restaurants whose names start with `* ` (`버거운버거`, `공대간이식당`, `75-1동 4층 푸드코트`, `220동식당`) are not collected. They repeat one fixed menu of up to 240 lines in every meal cell, every day, 80% of the page's lines. The Co-op's restaurant information page (식당안내), with each restaurant's building, floor and hours per weekday, is not collected either.
- `기숙사식당` on the Co-op page and `생협기숙사(919동)` on the dormitory page are one restaurant. It is taken from the dormitory page; the Co-op page's row is skipped.
- Restaurant names are stored without the telephone number the Co-op page appends.
- The veterinary college page has no prices and no year in its dates. The year is taken from the collection date, and the weekday next to each date settles it at the turn of the year. Only lunch is collected; dinner is by reservation and described in text under the table.
- A User's app gets one day's menus, grouped by restaurant and then by meal, with each line, and the time each restaurant's menus were last collected. A day with nothing stored is an empty list, not an error.

### Events

- Events are read by rules only. No language model is used.
- Each run lists the events from today on, with the list's date filter, page by page. On 2026-10-01 that was 94 posts on 8 pages. Posts appear one to three months before the event, so a window of one month gave the same pages.
- The worker asks the main server which of the listed posts it already stores, and reads the detail page of the others only. A post is read once: an edit or a deletion at the source after that is not seen. Reading every post again would multiply the requests on the university's site.
- The parser reads the title, the description (the body as text), the start and end time, the place text and the source link. When the time or place cannot be read, the event is still stored with the original text.
- Application periods and deadlines stay in the description. About half of the posts sampled on 2026-10-01 had one, written in many forms (`신청마감: 2026. 10. 17.(목) 23:59`, `10월 16일(금) 오후 5시까지`, `인원 마감 시까지`), so no rule reads them in this iteration.
- A post is one Global Event, identified by its post number (`bbsidx`). The rules read one start and end per post. A post that describes several sessions, such as a lecture series, is split into one event per session by the Administrator, until AI does it in a later iteration.
- A collected event is published when the rules read both of these, and is a Draft otherwise:
  - its start, with a time of day, from the time line of the body. The date in the post's header is often the application period, so it does not count;
  - its place, matched to exactly one Place of the list by number or by name. The event's position is that Place's.
  - A Draft is therefore an event online or off campus, an event whose place matched no entry or several, and a post that is not an event, such as a call for applicants, which mostly names no place. Of 48 posts sampled on 2026-10-01, 33 gave a start time, 30 a place line, and about ten were not events; 17 of the 18 building numbers the posts named are in the list of Places.
- Only an Administrator publishes a Draft. An Administrator can also correct or cancel an event that a collection published.
- Since a post is read once, no later collection touches a stored event, whatever its state. An Administrator's corrections therefore stay.
- This task defines how Global Events are stored and their states: Draft, published, cancelled and discarded. A stored event's start is optional, because a Draft may have none; publishing needs a title, a start and a position. The position is a latitude and a longitude. A discarded event stays stored, so that the next collection does not bring it back. The administrative API, and the User-facing list of published Global Events, belong to P12; P07 serves no events to Users.

### Shuttle

- The stops are the operator's 14, in loop order, under the operator's names. Their coordinates are seed data from the university's campus map, which lists the campus loop with 15 stops under names of its own (`법과대` is `법대입구`, `38동` is `공대입구`, `수의대` is `종합교육연구동`). The map's `제2파워플랜트` is not among the operator's stops and is left out. A person checks the pairs once.
- The route line is seed data traced along OpenStreetMap's roads through the 14 stops. OpenStreetMap has no relation for the campus shuttle (checked on 2026-10-01: the only bus routes in the campus extent are the city buses 8507, 관악02 and 관악04), and the campus map gives no line. P20 rides the loop to confirm the line.
- The operator reports each vehicle as a position on a drawing, and every position P05 observed in service fell exactly on a stop. A vehicle is therefore stored as being at a stop, the stop nearest to its position on the drawing, with the time the position was received. Its coordinates are the stop's. No fraction of the loop is computed; the app moves a vehicle between stops (P15).
- Only the latest position of each vehicle is kept. Vehicles are told apart by the operator's `carid`. A position older than a minute is no longer served, so that the vehicles disappear on their own when the service ends or the worker stops.
- Each set of positions the main server stores is handed to the socket server, which sends it to every connected app, each vehicle with its stop, the stop's coordinates and the time the position was received. The app drops a vehicle whose position is older than a minute (P15), so that the vehicles disappear from an open map too when no further set arrives. The app fetches the current positions once when it opens the map.
- The stops are served in loop order with the route line and the service hours as the route page's text, so that the app can say the shuttle is not in service outside them. An empty set of vehicles means the same.
- Vehicles are shown without any label saying the position is estimated.
- If the operator provides coordinates later, they replace the stop's.

### Places and Campus Boundary

- The list of Places holds the campus's buildings, each with its number, its name and its coordinates, and its spots without a number, such as `종합운동장` and `자하연`. A building is a Place like any other: one table, one list, one set of rules. It is seed data, stored by the main server and served through a list and a search by name or number.
  - The Places come from the university's campus map. On 2026-10-01 the map listed 237 rows with a number, 215 of them inside the Campus Boundary, and 8 without a number inside it. For the 14 that OpenStreetMap names with the same number, the two sources' coordinates lay a median of 5 m apart, 20 m at most.
  - Two buildings the map does not list, 71-1동 and 901동, are added from OpenStreetMap. Four more are added from the national map, each at the middle of its polygon there: 해동첨단공학관 (303동), 삼성전자서울대연구소 (944동), 디자인연구동 (49-1동) and 배터리공동연구센터, which has no number. The campus map names 303동 only in its amenities.
  - A name the map wraps, such as `관악 223동[우석경제관]`, is stored as `우석경제관`. The other names are stored as the map writes them.
- Only what lies inside the Campus Boundary is in the list. To cover a Place outside it, the Boundary is widened first.
- Each Place keeps the identifier its source gives it, and loading the seed again updates the Places in place. A timetable or a Meetup that names a Place keeps pointing at it.
  - A Place's own identifier is computed from its source and that identifier, not generated by the database, so that a Place has the same identifier in every database (`docs/adr/0002-place-ids-computed-from-the-source.md`).
- The Campus Boundary is one polygon from OpenStreetMap (relation 11917142). It is a file of the main server, read into memory when the server starts, and is not stored in the database. P08 uses it.
  - The outline leaves out a wedge in the north-east, with the faculty housing, the president's residence and the dormitory buildings 915 to 917, and four facilities on the hillside in the south. A User there is hidden.
  - A position up to 10 m outside the polygon counts as inside, because a phone reports its position some metres off. The file stays OpenStreetMap's outline. The one check holds for a User's position and for the list of Places, which so gains `정문수위실`, 2 m outside the outline.
- A Place keeps its outlines: the drawings of a building's walls, or of the edge of a field. They are seed data from 국토지리정보원's 연속수치지형도 건물 layer, the national map, which a person downloads from VWorld after logging in: the polygons in the campus extent that the layer classes as buildings, 356 on 2026-10-03. Wall-less structures, temporary buildings and greenhouses are left out. A Place may have several outlines, since the layer draws some buildings in parts.
  - A Place takes every polygon whose label names its number, as `<number>동`, or as `<number>-A동` for a wing of it. Without such a label it takes the polygon that holds its position, and without that the nearest polygon within 10 m that no Place has, since the campus map sets some buildings just outside their walls. The rules are the same for a Place without a number, which no label can name.
  - A person gives a Place its outlines in a file of the seed where the rules cannot: a list of outlines of either source, or none, with the reason. The file names a Place by its number or, without one, by its name.
  - OpenStreetMap's outlines are used only where that file names them: for 버들골 풍산마당 (100동), 데이터사이언스대학원 (43-2동) and 종합운동장본부석 (149동), which the national map does not draw as buildings, and for what is no building at all, 종합운동장, 야구장, 테니스장, 공대테니스장, 관악사운동장 and 자하연. The seed holds those outlines of OpenStreetMap and no other.
  - On 2026-10-03, 216 of the 230 Places had an outline. The others are stores, links between buildings, a few small buildings, 붉은광장 and the main gate.
- The main server says which Place a position is in, without a database query: the nearest Place, each as far as the edge of its nearest outline, `inside` within 5 m of the edge and `near` up to 20 m. Farther than 20 m from every Place, the answer is none. A Place without an outline is as far as its position and can only be near.
  - Where the outlines of two Places hold the position, the one earlier in the list is the answer: in the stand of 종합운동장 that is 종합운동장본부석 (149동), since Places with a number come first.
  - Nothing shows the answer to Users yet. P08 asks it when a User's position arrives.
- The Places, the stops and the route line are stored in ordinary columns: a latitude and a longitude, and the line and a Place's outlines as lists of coordinates. No spatial type and no spatial query is used, because nothing asks a spatial question of the database: a vehicle is placed by its position on the drawing, and the Boundary and the Place at a position are checked in memory.
- Each seed file is kept with the query or address it came from and the date, so that the export can be repeated.
- The national map's layer is under 공공누리 type 1, which allows a changed copy with its source shown, and OpenStreetMap's data under the ODbL. Each source has seed files of its own, so that each stays under its own licence (`.scratch/research/public-building-outlines.md` §8).
- Coordinates are never read off Kakao, Naver or Google maps. Their terms forbid storing their data. The campus map is drawn on a Kakao map, but the coordinates of its buildings and stops are the university's own.
- The app shows the attributions of OpenStreetMap and of 국토지리정보원's 연속수치지형도 on an information screen.

### Walking route

- The main server calls Kakao's walking route API with a server key and returns the line, the distance and the duration.
- A route is never stored or cached. Kakao's policy does not allow it.
- The API's failure statuses are returned to the app as "no route".

## Testing Decisions

- A good test feeds a saved page to a parser and checks the records that come out, or sends a message to the main server and checks what is stored and served.
- Parsers are tested with saved pages, including a closed restaurant, a dish without a price under a heading with a set price, a line with several prices, an unfilled cell, a page without the structure the parser expects, an event with several days, an event whose time cannot be read, and an event with an application deadline.
- The vehicle parser is tested with saved answers: vehicles at stops, several vehicles at one stop, an empty answer, and a position that is not exactly on a stop.
- The seed is tested against a real database: it loads, it loads again without duplicates, and an entry keeps its identifier when its name changes. A Place gets the outlines the rules give it, by its label, by its position or within 10 m, several where the national map draws it in parts, and the outlines a person gives it in a file of the seed replace them.
- The Place at a position is tested on the started server, with positions whose distances were measured apart from the code: inside an outline, 3 m and 12 m outside a wall, far from everything, at a Place without an outline, between two Places, among the Places of one outline, inside the second outline of a Place, on the field of 종합운동장 and in its stand.
- The main server's handling of worker messages is tested at the message boundary: invalid messages refused, repeated messages stored once, a later collection replacing a day's menus, a failure recorded with the earlier data still served, a collected event published or kept as a Draft by what was read, a discarded post reported as stored so that it is not collected again, a stored post left as it is.
- The command that runs one collection is tested with the sources and the main server replaced: it collects the source it names and no other.
- The push of vehicle positions is tested at the socket server: a positions message from the main server reaches a connected client with the time each position was received.
- The real sites and the Kakao API are never called in tests. They are replaced at the fetch boundary by saved responses. The saved answer of the walking route API is one a real call returned.
- Prior art: the API-level tests of P04.

## Out of Scope

- Filling with AI what the rules could not read, the way the Haengsha project does: rules first, then AI for the start, the end and the place, with each session of a post returned on its own. It comes in a later iteration and raises the share of events that are published without a person.
- The extracurricular programme site.
- Library seats and study spaces.
- Shuttle routes other than 41946.
- Spoken or step-by-step directions. Drawing the walking route on the map is this product's route guidance, and it is part of this iteration.
- Asking the site operators for permission. The team handles it outside the code.
- Letting an Administrator start a collection by hand.
- Collecting when the worker starts. It is designed together with the deployment.
- The fixed-menu restaurants and the Co-op's restaurant information page.
- Reading a dish listed under a heading as a dish, operating hours as times, and linking a restaurant to its Place.
- Places outside the Campus Boundary.
- Reading a post again after it was stored, to see edits or deletions at the source.
- Application periods and deadlines as a field of an event.
- Placing a vehicle between two stops on the server.
- Showing others which Place a User is in. The main server can say it; what is shown, and to whom, is specified later.

## Further Notes

- The schedule names 윤유상 and 김태현 as workers.
- P05 observed the operator's endpoint during service hours: every vehicle position fell on a stop, never between two. The vehicle model above follows that observation; `.scratch/research/external-sources.md` §5 has the details.
- The pages are not versioned interfaces. A change in their layout breaks a parser without notice, and the collection status in story 19 is how the team finds out.
- The campus map publishes no terms of use and no licence. Its data is used on the same footing as the pages the worker collects; `.scratch/research/external-sources.md` §6.2 has what was checked.
