# 01: Menus: the first Collection, stored as lines

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The worker server runs its first Collection and the main server receives its first worker message. Twice a day the worker reads the menus of today and the six days after from the three menu Sources, the Co-op page, the dormitory page and the veterinary college page, keeps each meal as the lines of its cell (ADR 0001), and sends them to the main server as a request-and-response message. The main server checks the message against a schema, refuses one that does not match, stores the menus so that the same message twice leaves one set of records and a later Collection replaces its Source's day, and records per Source when it last succeeded and, apart from it, its last failure. A User's app then gets one day's menus by restaurant and meal, each line with its text and, where known, its kind, its price and the dish's name, and the time each restaurant's menus were last collected. When a Source cannot be fetched or read, the worker reports the failure, and the stored menus stay and are still served. A developer runs the same Collection by hand with a command, so that a system started after the scheduled times holds menus.

This ticket sets what tickets 02 and 04 follow: how a worker message is named, shaped and validated, what a refused message gets back, how a Source's Collection status is recorded, how a schedule is declared, how a developer runs one Collection by hand, the one place where pages are fetched so that tests replace it with saved pages, and how a test sends a message to the main server. The two servers' READMEs record it.

## Acceptance criteria

- [x] A restaurant's meal on a day is stored as its lines in the page's order: each line's text and, only when the parser is sure, a kind (heading, dish or note), one price and, for a dish with a price, the dish's name without the price, as ADR 0001 decides. There is no operating hours field: hours, busy hours and closures are note lines of the meal.
- [x] The three menu Sources are collected at 05:00 and 10:00 Asia/Seoul, for today and the six days after: the Co-op and dormitory pages by date, and from the veterinary college's week table the lunch rows from today on, with the year taken from the collection date and settled by the weekday at the turn of the year. The times and the number of days are declared in one place, so that they can be changed once the pages' update times are known.
- [x] A command of the worker server runs one Collection of the Source it names and exits. It does what the scheduled run does, hands the result to the main server and says whether it was taken; a failure is recorded like any other. Nothing is collected when the worker starts.
- [x] A page is read only when it has the structure the parser expects: the menu table and the date that was asked for on the Co-op and dormitory pages, the week table with its headers on the veterinary college's. A page without it, such as the firewall's block page, which arrives with status 200, is a failed Collection. A table that is there and lists no restaurant is an empty day.
- [x] The Co-op page's `기숙사식당` row is skipped; the dormitory page's `생협기숙사(919동)` is that restaurant. The four restaurants whose names start with `* ` are skipped. Restaurant names are stored without the telephone number the Co-op page appends.
- [x] The main server validates each worker message against a schema. A message that does not match is refused with an answer naming the problem, and nothing from it is stored.
- [x] Storing is repeatable: the same message twice leaves one set of records. A later Collection of a Source replaces everything that Source stored for the day, so that a restaurant the page dropped or renamed does not linger. A restaurant listed with an empty cell has no lines for that meal; a closure written in the cell is a note line.
- [x] The main server keeps, per Source, the time of the last successful Collection and, apart from it, the last failure with its time and reason. A success does not clear the last failure. A failure reported by the worker records it and leaves every stored record as it is.
- [x] A User's route returns one day's menus grouped by restaurant and then by meal, with each line as stored, and the time each restaurant's menus were last collected. A day with nothing stored is an empty list, not an error. The route needs a User's access token. No price is invented: a line without one is served without one.
- [x] The worker fetches pages in one place, sends a User-Agent that names the project, and asks for one page at a time. The parsers never call the real sites in tests: saved copies of the pages are fed to them.
- [x] Parser tests with saved pages cover a dish with one price and its name, a heading with a set price followed by unpriced dishes, a corner with its dishes and price on one line, a `※` hours line, a closure in a cell, a line with several prices (stored with its text and no price), an empty cell, a cell that holds only the unfilled template `: | :` (read as an empty cell), the firewall's block page, a dormitory page, and the veterinary week table at the turn of the year.
- [x] Message-boundary tests, sending messages as the worker would: a valid message is stored and served; an invalid message is refused and nothing is stored, the Collection status included; the same message twice is stored once; a later Collection replaces its Source's day while another Source's restaurants and the Source's other days stay; a failure is recorded and the earlier menus are still served; an empty day answers an empty list; a request without a User's access token is refused.
- [x] A test of the command, with the Sources and the main server replaced: it collects the Source it names and no other, and starting the worker fetches nothing.
- [x] The READMEs of the worker and main servers record the worker message conventions (names, shape, validation, the refusal answer, the Collection status, the schedule, the command that runs one Collection and when to use it, the fetch boundary, how a test sends a message) and the menu model.
- [x] After one real run against the pages, what the collectors sent is recorded under Comments: per Source, how many lines got a kind and a price, and anything the pages did that the parser did not expect.

## Comments

### What this ticket sets for tickets 02 and 04 (2026-10-01)

The READMEs hold the full text: the main server's Messages from the worker server and Menus, and the worker server's Collections and Menus.

- **Names**: `POST /menus/collected` and `POST /collections/failed`, each path saying what happened. Both are requests that the main server answers, so the worker learns whether a message was taken. Later collectors post to a path that ends in `collected`.
- **Shape**: the payload names its `source` and the time of the Collection (`collectedAt`, `failedAt`) in ISO 8601 with an offset. Menus are `days: [{ date, restaurants: [{ name, lines: [{ meal, text, kind, price, name }] }] }]`, with `date` as `YYYY-MM-DD`. A `kind`, `price` or `name` the worker is not sure of is `null`, never left out.
  - A message lists the days it read, each with every restaurant the page lists. A day on which the page lists none is `restaurants: []`, and storing it empties the Source's day. A flat list of restaurants could not say that a day became empty.
- **Validation**: `@Body({ schema })`, as every route of the main server. Schemas are `z.strictObject`; a price must fit the `INTEGER` column; a day or a restaurant listed twice is refused.
- **The refusal answer**: 400 with `message`, each problem as `path: problem`; the worker joins them with `; `. A message that was taken answers 204.
- **Collection status**: `collection_statuses`, one row per `Source` (`coop_menus`, `dormitory_menus`, `veterinary_menus`), with `lastSucceededAt` and, apart from it, `lastFailedAt` and `lastFailureReason`. The times are the worker's. No route serves it yet, so the tests read it with their own database connection.
- **Schedule**: `@Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })` on the collector's method, the times one constant at the top of its file, with the number of days a Collection covers (`COLLECTED_DAYS`) beside it.
- **By hand**: `pnpm collect <Source> …` runs one Collection of each Source it names and exits (`src/collect.ts`). `collectSources()` in `src/collect-sources.ts` holds the Sources it knows; a new collector adds its Sources there and gives a method that collects one Source and says whether the main server took it, as `MenuCollector.collectOne()` does. The worker collects nothing when it starts.
- **Fetch boundary**: `PageFetcher.fetch(url)`: one page at a time for each collector, the project's `User-Agent`, an error for a status outside 2xx. The tests replace the HTTP call under it (`FETCH`), and without pages from the test every request fails.
- **How a test sends a message**: `sendAsWorker()` in the main server's `test/worker.ts`, a request with the worker's token.
- The worker's end of a Collection, `handOver()` and `send()`, lives in `MenuCollector`. Ticket 02 moves it to `src/common/` when its collector needs it, as the worker's README asks of code two features share.

### Decisions made while implementing (2026-10-01)

- **A line gets a `kind` only from what the line itself says.** `※` or `휴무` makes a note, `<…>` alone a heading, a price after a colon a dish. A line that only names a dish, such as `잡곡밥` under `<셀프코너> 7,000원` or a lunch of the veterinary college's table, has no `kind`. Reading it as a dish would take the line before it or the column into account, the kind of rule ADR 0001 turned down for attaching dishes to corners. The run below counts what this leaves without a kind.
- **`휴무` is the one word read as a closure.** It is the only one the pages were seen to use (`개천절 휴무`, `추석연휴 휴무`).
- **A Collection of a Source is all or nothing.** When one of the Co-op's two pages cannot be fetched or read, nothing is sent for the Co-op and the failure is reported. The other Sources are still collected.
- **A message the main server refuses is reported as a failed Collection**, with the main server's answer as the reason. Handing over is part of a Collection, and a refusal means the two servers disagree, which the Administrator should see.
- **Restaurants are served in the Korean order of their names, sorted in the server.** The database's collation, `en_US.utf8`, put `학생회관식당` before `자하연식당 2층`.
- **The time of collection is served for each restaurant**: the `collectedAt` of the Collection that stored its day. When one Source fails, its restaurants keep their older time.
- **The veterinary college's page names no restaurant**, so its lunches are sent as `수의대식당`. A row is matched to a day by month, day and weekday, which settles the year without computing one.
- **Timeouts** are ticket 04's: a page and the main server's answer are each given up after 5 seconds.
- **The feature is `menus` on the main server and `menu` on the worker**, as each README's neighbours and example name it.

### Tests (2026-10-01)

- Main server, at the message boundary: `test/menus.e2e-spec.ts` (17 tests) and `test/collection.e2e-spec.ts` (4). They send requests as the worker does and read the answer of `GET /menus` and the stored Collection status.
- Worker, parsers: `test/menu-page-parser.e2e-spec.ts` (11) and `test/veterinary-menu-page-parser.e2e-spec.ts` (7) feed saved pages to the parsers and check the lines.
- Worker, collector: `test/menu-collector.e2e-spec.ts` (7) runs the Collections once with the HTTP calls to the Sources and to the main server replaced, and checks the requests and the messages, and the next runs of the schedule.
- `worker-server/test/pages/` holds one page of each Source, each fetched once, on 2026-10-01 at 22:07 KST. Cases those pages do not show are edits made in the tests, each with a comment: the closure (`개천절 휴무` in the lunch cell of 학생회관식당), tomorrow's page (the date the page repeats), the turn of the year and a day written otherwise (the dates of the week table). The firewall's block page is written by hand from external-sources.md §2; none was saved.
- Each test was written first and seen to fail, except these, which earlier slices had already made true. On the main server: a request without an access token, a day emptied by a later Collection, a restaurant listed without a menu, a failure that stays after a later success, and four of the eight invalid messages. On the worker: a corner on one line, an empty cell, the dormitory page, a day without a row in the week table, the December and January rows, and a page the collector cannot read.
- The whole suites pass, also with `TZ=UTC`: main server 20 files and 230 tests, worker server 5 files and 33 tests.

### Review (2026-10-01)

A Standards review and a Spec review ran side by side on the first commit. The second commit acts on them.

- Spec: no requirement was missing. Four findings:
  - The refused messages of the tests carried the time the status row already held, so "the Collection status included" could not fail. They carry a time of their own now.
  - The veterinary lunch was made a `dish` whatever it said. It is read like any other line now (see Decisions).
  - `<…>` alone was always a heading, and the saved Co-op page brackets a notice too: `< 위 메뉴외에도 다양한 메뉴가 준비되어 있습니다>`, at `* 버거운버거`. A sentence between the brackets is no longer a heading.
  - A row of the week table was matched as text, so `10. 01(목)` would have been missed and the day stored as empty. It is matched by number now.
- Standards: the READMEs said things the code did not do, and they are corrected. `Site` is under Avoid in `GLOSSARY.md`, so the test helper and the texts name Sources. `@WorkerMessage()` moved to `worker-message.decorator.ts`, as the other decorators are named. The block page of three tests became one constant, comments that restated the code were removed, and the collector's methods are named `read…`.
- Left as they are: the two uniqueness checks of the menus schema stay two lines, because a shared helper did not infer its types; `handOver()` and `send()` stay in `MenuCollector` until ticket 02. `collector` is not in `GLOSSARY.md`; it can go to `/domain-modeling`.

### The first run on the real pages (2026-10-01)

One run, at 23:05 KST, with both servers built from the second commit, the worker's real `PageFetcher`, and a main server on a database and a Redis of the run's own. A script outside the repository started it, because nothing starts a Collection by hand.

- Five requests, one after the other within three seconds, each answered 200: the Co-op's and the dormitory's page of 2026-10-01 and of 10-02, and the veterinary college's page.
- Three `menus-collected` messages, each answered `{ status: 'ok' }`. `GET /menus?date=2026-10-01` then answered 12 restaurants in the Korean order of their names, `GET /menus?date=2026-10-03` answered `[]`, and a request without a token got 401.

What the collectors sent, for the two days together:

| Source | Restaurants a day | Lines | With a kind | Dish | Heading | Note | No kind | With a price |
|---|---|---|---|---|---|---|---|---|
| `coop_menus` | 9 of the page's 14 | 272 | 197 (72%) | 97 | 26 | 74 | 75 | 105 (39%) |
| `dormitory_menus` | 2 | 29 | 27 (93%) | 17 | 0 | 10 | 2 | 17 (59%) |
| `veterinary_menus` | 1 | 2 | 0 | 0 | 0 | 0 | 2 | 0 |
| All | 12 | 303 | 224 (74%) | 114 | 26 | 84 | 79 | 122 (40%) |

- Every dish, a line with a price after a colon, got its price: 114 of 114. Of the 26 headings, 8 carry a set price.
- The 79 lines without a kind:
  - 71 dishes under a heading: 37 under `<셀프코너> 7,000원` at 두레미담, 24 under `<뷔페> 6,500원` at 302동식당 and 10 under `<+세미뷔페>` at 자하연식당 3층.
  - 4 lines of one notice: 자하연식당 3층 writes it between angle brackets and breaks it over two lines, `<뷔페 특성상 메뉴의 조기품절` and `가능성이 있으니 양해 부탁드립니다>`.
  - 2 lines that list the dishes of the dormitory's breakfast set, under `세미양식부페 : 5,000원`.
  - The 2 lunches of the veterinary college.
- What the pages did:
  - Nothing failed, and no line that got a kind or a price got a wrong one.
  - The page of 10-02 was complete on the evening of 10-01: the same 14 rows as that of 10-01.
  - Dish names carry typos, such as `<A코너>뚝배기)순두부찌개&수제비사리, …` and `철판]청양풍볶음우동&새우까스`. They are served as written, with their prices.
  - Among the collected restaurants, the only lines with several prices are two `※` notes of 301동식당. The dishes with two prices and the prices with typos are at the four `* ` restaurants, which are not collected.
  - The veterinary college's page repeats its table as text in a `meta` description. The parser reads the table only.
  - No closure, no restaurant with every cell empty and no blocked request was met. Those paths are covered by the tests' edited pages alone.
- For the team's review of the model: 26% of the lines have no kind, and nearly all of them are dishes under a heading. A rule that takes the heading before a line into account would label them, at the cost ADR 0001 names; the veterinary lunches would need the column. The times, 05:00 and 10:00, are still provisional: this run says only that tomorrow's page was complete by the evening.

### Agent usage (2026-10-01)

- Agent time: about 1 hour 35 minutes, an estimate, in one session in the main checkout. Nobody was waited for.
  - The session itself worked about 72 minutes, from reading the ticket to this section: the three seams test-first, the READMEs, the review's fixes and the real run.
  - Its Standards and Spec review subagents worked about 11 and 13 minutes, at the same time, added on top. The session spent most of that time waiting for them.
- Tokens, for the session and its two subagents, counted when this section was written:
  - Input: 70,323,565 in total, of which 69,274,341 were cache reads, 1,048,830 cache writes and 394 uncached.
  - Output: 318,483. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 1,925, is a lower bound.

### The additions after the review (2026-10-02)

The spec and this ticket were settled again after the first run. The menu model stays: a line is stored with its text, and a kind is read from the line alone. Four things were added and are built.

- **The dish's name.** A dish whose line ends with its one price carries the text before the colon as `name`: `눈꽃치즈닭갈비 : 6,000원` names `눈꽃치즈닭갈비`, and `<A코너>제육김치덮밥, 잡채 : 6,000원` keeps its corner in the name. A dish without a price, or with text after the price, has none. It is in the worker's message, the main server's schema, the `menu_lines.name` column and the route's answer.
  - The column is in this ticket's one migration, `20261001132241_add_menus_and_collection_statuses`, which was not merged yet. A database that ran the earlier form of it is recreated: `docker compose down -v`, then start again.
  - A message without `name` is refused, so the two servers are updated together.
- **Seven days.** `COLLECTED_DAYS` is 7: a Collection reads the Co-op's and the dormitory's page of today and the six days after, 15 requests a run with the week table. The veterinary college's table holds the current week, so its later days are sent without a restaurant.
- **A command that runs one Collection.** `pnpm collect coop_menus dormitory_menus veterinary_menus`, or `node dist/collect …` in the worker's container. It starts the worker without its HTTP server, runs the Collections one after the other, logs for each whether the main server took it, and exits with status 1 when one was not taken or a name is not a Source. A name that is not a Source collects nothing, whatever else is named.
- **An unfilled cell.** A line without a letter or a digit is not a line, so a cell that holds only the template `: | :` gives no lines, on one line or broken over several.

Tests. The worker's were written before the code and seen to fail without it, 24 of them, except "the worker collects nothing at its start", which was already true. The main server's were written before the code too, and run only after it.

- Worker: `test/menu-page-parser.e2e-spec.ts` (15) checks the name on every line it reads, a price followed by text, and the unfilled cell. `test/menu-collector.e2e-spec.ts` (14) checks the seven days of each Source, the 15 requests, and the command: one Source named, several, a Collection that fails, names that are not Sources, and the worker's start.
- Main server: `test/menus.e2e-spec.ts` (18) stores and serves the name, and refuses a line without one.
- The whole suites pass: main server 20 files and 231 tests, worker server 5 files and 44 tests. `lint`, `format:check` and `typecheck` pass in both, both images build, and `prisma migrate diff` finds no difference between the migrated database and the schema.

One run on the real pages, at 01:05 KST on 2026-10-02, with the command and a main server from this branch on stores of the run's own:

- 15 requests, one after the other, within ten seconds, each answered 200. Three `menus-collected` messages, each taken; the command exited with status 0.

| Source | Days with a restaurant | Lines | With a kind | Dish | Heading | Note | No kind | With a price | With a name |
|---|---|---|---|---|---|---|---|---|---|
| `coop_menus` | 6 of 7 | 532 | 383 (72%) | 177 | 52 | 154 | 149 | 193 (36%) | 177 |
| `dormitory_menus` | 7 of 7 | 93 | 86 (92%) | 53 | 0 | 33 | 7 | 53 (57%) | 53 |
| `veterinary_menus` | 1 of 7 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| All | | 626 | 469 (75%) | 230 | 52 | 187 | 157 | 246 (39%) | 230 |

- Every dish with a price got its name: 230 of 230. No line got a name without being a dish with a price.
- The later days were filled in: the Co-op's pages of 10-06, 10-07 and 10-08 each listed eight restaurants with about 127 lines, as many as a day of this week.
- The holidays came as closures and were read as notes: `개천절 휴무` at 학생회관식당 on 10-03, and `대체공휴일 휴무`, once written `대체공휴일휴무`, at seven restaurants on 10-05. The Co-op's page of Sunday 10-04 listed no restaurant that is collected.
- The 157 lines without a kind are the dishes under a set-price heading at 두레미담 (73), 302동식당 (48) and 자하연식당 3층 (28), the dishes of the dormitory's breakfast set (7) and the veterinary lunch (1).
- No cell with only the template was met; that path is covered by the test's edited page alone.

### Agent usage (2026-10-02)

For the additions after the review, in one session in the main checkout. The review of the model and the settling of the documents ran in the same session before it and are not counted here.

- Agent time: about 16 minutes, an estimate, from the request to this section. Nobody was waited for.
- Tokens, counted when this section was written:
  - Input: 21,726,254 in total, of which 21,621,253 were cache reads, 104,925 cache writes and 76 uncached.
  - Output: 52,201.
