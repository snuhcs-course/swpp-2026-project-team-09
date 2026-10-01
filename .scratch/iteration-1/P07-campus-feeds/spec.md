# P07: Connect existing event, dining and shuttle feeds

Status: ready-for-agent

## Problem Statement

Campus information is scattered. Events are announced on the university site, menus are posted on three separate sites, and the shuttle is shown on the operator's page as dots on a drawing. A User has to visit each of them. The app also needs coordinates for buildings, the shuttle route and the campus outline before it can put anything on the map.

## Solution

The worker server collects events, menus and shuttle positions from their original sources on a schedule and hands them to the main server. The main server stores them and serves them to the app: collected events as Drafts for the Administrator, menus by restaurant and meal, shuttle stops and vehicles placed on the real route, the building list, and a walking route on request.

"Existing" in the task title means data that already exists outside the project. It does not mean calling other apps.

## User Stories

1. As an SNU student, I want today's menus grouped by restaurant and meal, so that I can choose where to eat.
2. As an SNU student, I want the price next to each menu, so that I can compare.
3. As an SNU student, I want a restaurant's operating hours, so that I do not arrive at a closed door.
4. As an SNU student, I want menus for the coming days, so that I can plan ahead.
5. As an SNU student, I want to see when the menus were last collected, so that I know how fresh they are.
6. As an SNU student, I want the last collected menus when a source is unreachable, so that a failure does not leave the screen empty.
7. As an SNU student, I want the shuttle's stops on the map, so that I know where to wait.
8. As an SNU student, I want the shuttle vehicles moving along the road, so that I can tell how far the next one is.
9. As an SNU student, I want to be told when the shuttle is not in service, so that I do not wait for nothing.
10. As an SNU student, I want the list of campus buildings with their numbers and names, so that I can pick a place.
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
| Menus | The SNU Co-op menu page, the dormitory menu page, the veterinary college cafeteria page | Twice a day |
| Events | The university's official events list and the detail page of each event | Four times a day |
| Shuttle stops | The operator's route page for the circular route | Once a day |
| Shuttle vehicles | The operator's vehicle position endpoint for the circular route 41946 | Every 15 seconds on weekdays between 08:00 and 21:00 |
| Walking route | Kakao's walking route API | On each request |
| Buildings, shuttle route line, Campus Boundary | OpenStreetMap | Once, loaded as seed data |

- Each source's address, request and page format, observed behaviour and limits, and how the Kakao REST API key reaches the server, are in `.scratch/research/external-sources.md`.
- All times are in the Asia/Seoul time zone.
- The source code of Siksha and Haengsha was read to learn which sources exist and how their pages are built. No code, pattern list or keyword list is copied from them, because their repositories carry no licence.
- The extracurricular programme site is not collected. Its detail pages sit behind a waiting queue and a login.

### Worker and main server

- The worker server only collects. It keeps no data of its own.
- The worker sends what it collected to the main server as request-and-response messages. The main server validates each message against a schema and stores it.
- Storing is repeatable: the same event, the same menu or the same stop sent twice results in one record.
- Schedules run inside the worker with the NestJS schedule module. One worker instance runs.
- When a collection fails, the stored data stays and the failure is recorded with its time.

### Events

- Events are read by rules only. No language model is used.
- The parser reads the title, the description, the start and end time, the place text and the source link. When the time or place cannot be read, the Draft is still stored with the original text.
- A post can describe several sessions, such as a lecture series. As in the Haengsha project, each session becomes its own Draft.
  - The rules of this iteration read one start and end per post, as Haengsha's rules do. Splitting a post into its sessions comes with AI in a later iteration.
  - Until then, an Administrator splits such a post by creating the other sessions.
- A Draft is identified by its post and the start and end of its session as collected. A post whose time could not be read is identified by the post alone.
  - The collected start and end are kept apart from the Administrator's corrections, so an edited Draft is still found.
  - A session collected with a new time arrives as a new Draft, and the Administrator discards the old one.
- A collected event is always a Draft. Only an Administrator publishes.
- Once an Administrator has edited or published an event, later collections do not change it.
- This task defines how Global Events are stored and their states: Draft, published, cancelled and discarded. A discarded event stays stored, so that the next collection does not bring it back as a new Draft. The administrative API belongs to P12.

### Menus

- A menu entry has a restaurant, a date, a meal type, a menu name and an optional price. Operating hours are kept as the original line of text per restaurant.
- The veterinary college page has no prices and no year in its dates. The year is taken from the collection date.

### Shuttle

- The route line and the stop coordinates come from OpenStreetMap and are stored in the main database as spatial data.
- The operator reports each vehicle as a position on a drawing, not as coordinates. The main server turns that position into a fraction of the loop between two stops and asks PostGIS for the point at that fraction on the real route line.
- The spatial queries are written as raw SQL and kept in one module with a small interface. The rest of the code does not contain spatial SQL.
- Only the latest position of each vehicle is kept.
- Vehicle positions reach the app the same way User locations do in P08: pushed with their coordinates. The app fetches the current positions once when it opens the map.
- Vehicles are shown without any label saying the position is estimated.
- If the operator provides coordinates later, they replace the computed position.

### Buildings and Campus Boundary

- The building list holds the building number, the name and the coordinates. It is seed data from OpenStreetMap, stored by the main server and served through a list and a search.
- The Campus Boundary is one polygon from OpenStreetMap, stored by the main server. P08 uses it.
- Coordinates are never read off Kakao, Naver or Google maps. Their terms forbid storing or tracing their data.
- The app shows the OpenStreetMap attribution on an information screen.

### Walking route

- The main server calls Kakao's walking route API with a server key and returns the line, the distance and the duration.
- A route is never stored or cached. Kakao's policy does not allow it.
- The API's failure statuses are returned to the app as "no route".

## Testing Decisions

- A good test feeds a saved page to a parser and checks the records that come out, or sends a message to the main server and checks what is stored and served.
- Parsers are tested with saved pages, including a closed restaurant, a menu without a price, an event with several days and an event whose time cannot be read.
- The shuttle computation is tested against a real database with PostGIS: a vehicle at a stop, between two stops, and at the point where the loop closes.
- The main server's handling of worker messages is tested at the message boundary: invalid messages refused, repeated messages stored once, two sessions of one post stored as two Drafts, Administrator edits preserved.
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

## Further Notes

- The schedule names 윤유상 and 김태현 as workers.
- P05 observed the operator's endpoint during service hours: every vehicle position fell on a stop, never between two. How a vehicle is shown between stops is open; `.scratch/research/external-sources.md` §5 has the observations.
- The pages are not versioned interfaces. A change in their layout breaks a parser without notice, and the collection status in story 18 is how the team finds out.
- Whether the OpenStreetMap roads cover the whole loop needs a look at the map. P20 rides the loop to confirm the line matches the real route.
