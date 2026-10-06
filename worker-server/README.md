# worker-server

The SNU Now worker server. It collects the Sources, the pages and feeds outside the project, on a schedule, and hands
what it reads to the main server. It follows the main server's layout, settings and checks, and keeps no data of its
own.

## Run it

You need Node.js 24, and Docker to run the whole system. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

While you work on the worker server, run it yourself in `worker-server/`. It keeps no data and needs no data store:

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

`.env` needs `WORKER_TOKEN`, the same line as in `main-server/.env` (see the main server's README: Run it). The worker
hands what it collects to the main server at `MAIN_SERVER_URL`, so a Collection is taken only while the main server
runs.

The server answers two health checks:

- `GET http://localhost:3002/health/live`: liveness, the process is up.
- `GET http://localhost:3002/health/ready`: readiness, the main server can be reached. It answers 503 and names the
  main server when it cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server starts even when it cannot reach the main server. Until it can, readiness answers 503.

## Collections

A Collection is one run of the worker reading a Source and handing what it read to the main server. Every collector
follows these rules; `src/menu/menu.collector.ts` is the first. A collector extends `Collector` from
`src/common/collector.ts`, which holds the worker's end of a Collection.

- **Schedule**: `@Cron()` from `@nestjs/schedule` on the collector's method starts its Collections. The times are a
  constant at the top of the collector's file, one for each schedule, a cron expression with seconds, and the time zone
  is `Asia/Seoul`:

  ```ts
  const COLLECTION_TIMES = '0 0 5,10 * * *';

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
  ```

  One worker instance runs, so each Collection runs once. The worker collects nothing when it starts.

- **By hand**: `pnpm collect` runs one Collection of each Source it names, as the schedule would, and exits. It stops
  its own schedule first, so that no run that falls due meanwhile, such as the vehicle positions' every 15 seconds,
  collects a Source it was not asked for. Use it after starting the system outside the scheduled times, so that the
  main server holds data without waiting for the next run:

  ```bash
  pnpm build
  pnpm collect coop_menus dormitory_menus veterinary_menus
  ```

  In Compose the worker is built already:

  ```bash
  docker compose exec worker-server node dist/collect coop_menus dormitory_menus veterinary_menus
  ```

  It needs the main server running, logs for each Source whether its Collection succeeded, and exits with
  status 1 when one failed or a name is not a Source. A collector names the Sources it collects with
  `@Collects()` from `src/common/collector.ts`, and the command runs each with the collector's `collectOne(source)`,
  which gives whether the Collection succeeded:

  ```ts
  @Injectable()
  @Collects(MENU_SOURCES)
  export class MenuCollector extends Collector {
  ```

  `src/collect-sources.ts` finds the collector of each Source named, and `src/collect.ts` starts the worker without its
  HTTP server to run them.

- **Fetching**: every page is fetched with `PageFetcher.fetch(url)` from `src/common/page-fetcher.ts`, never with
  `fetch` itself. It sends a `User-Agent` that names the project and fails when the answer's status is not 2xx or when
  the page has not come within 5 seconds. Each collector has a `PageFetcher` of its own, which asks for one page at a
  time: a collector's pages wait for one another, and never for another collector's, so the shuttle's vehicle positions
  are asked for on time while the menus' fifteen pages are read. `fetch(url, body)` asks with a POST of the body as
  JSON, as the shuttle operator's vehicle positions want.
- **Parsing**: a parser is a function from a page's text to what the message carries, in the feature's folder, such as
  `src/menu/menu-page.parser.ts`. No page is a versioned interface, and the university's firewall answers a blocked
  request with status 200 and another page. So a parser checks that the page is the one it knows, such as the table
  being there and the date being the one asked for, and throws an `Error` that says what is wrong.
- **Handing over**: the collector sends what it read to the main server as one HTTP request and waits for the answer,
  with `handOver(source, collectedAt, path, message)` of `Collector`. It goes through `MainServer` from
  `src/common/main-server.ts`, which posts the message as JSON with the worker's token (`WORKER_TOKEN`) and gives the
  answer up after 5 seconds, so that a Collection never waits for a main server that is down. A request reaches one
  main server, however many run. `MainServer.ask(path, question, schema)` asks a question the same way and gives the
  answer, checked against its schema: the worker keeps nothing, so a Collection that needs to know what the main server
  holds asks it, as the events collector asks which posts are stored, through its `ask(path, question, schema)`. A
  collector reaches the main server through `handOver()` and `ask()` alone. The main server's README sets the paths, the
  shapes and the answers: [Requests from the worker server](../main-server/README.md#requests-from-the-worker-server).
  The shape of what a Collection read is a type in the feature's `dto/`, kept the same as the main server's schema by
  hand.
- **Failure**: when a page cannot be fetched or read, or the main server does not take the message or answer the
  question, `handOver()` logs it and posts the Source, the time and the reason to `/collections/failed`, such as
  `https://snudorm.snu.ac.kr/foodmenu/?date=2026-10-02 answered 503`, `The page has no menu table` or
  `The main server did not take /shuttle/vehicles/collected: no answer within 5 seconds`. The other Sources of the run
  are still collected, and the main server keeps what it stored. The events collector skips a post's page that is not
  the post instead, and when it stops early it hands over what it read with why it stopped, as [Events](#events) says.

The tests never call a real Source or the main server. `startApp` replaces the HTTP call under `PageFetcher` (`FETCH`),
and every request fails unless the test gives it pages; and the one under `MainServer` (`FETCH_MAIN_SERVER`), with a
`MainServerStub`. A parser is tested as a function and a collector by running it once, not through
HTTP; their files are still named `*.e2e-spec.ts`, the one pattern Vitest runs.

- **Saved pages**: `test/pages/` holds pages of each Source as they were served, named after the Source, the page when
  the Source has several, and the day it was saved, and read with `savedPage(name)`, or `savedAnswer(name)` for a JSON
  answer. Save a page once, with the project's `User-Agent`. Prettier leaves the folder alone:

  ```bash
  curl -A 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)' \
    -o test/pages/coop-menus-2026-10-01.html 'https://snuco.snu.ac.kr/foodmenu/?date=2026-10-01'
  ```

- **A parser** is given a saved page with `savedPage(name)` from `test/pages.ts`, and the test checks what comes out,
  as `test/menu-page-parser.e2e-spec.ts` does. A case the saved page does not show, such as a closure or the turn of
  the year, is an edit of the saved page made in the test, with a comment that says what it changes.
- **A collector** runs once against `sourcesServing(pages)` from `test/sources.ts`, which stands for the Sources, and a
  `MainServerStub` from `test/main-server.ts`, which stands for the main server and keeps the messages the worker
  sends, as `test/menu-collector.e2e-spec.ts` does. `answers.set(path, answer)` gives the stub its answer to a
  question, and `refusals.set(path, problem)` makes it refuse a message. The test sets the clock with
  `vi.useFakeTimers({ toFake: ['Date'], now })`. An address given `null` in place of a page never answers, and so do
  the paths in the stub's `unanswered`; a test that waits for the 5 seconds replaces the timers too, as
  `test/shuttle-collector.e2e-spec.ts` does.
- **The command** is tested through `collectSources(app, names)`, which `src/collect.ts` calls, in the same file.

## Menus

Three Sources are collected at 05:00 and 10:00, each for today and the six days after in Asia/Seoul, and each sent as
one message to `/menus/collected`. The times (`COLLECTION_TIMES`) and the number of days (`COLLECTED_DAYS`) are constants
at the top of `src/menu/menu.collector.ts`. The times are provisional: nobody has observed when the pages change. A
restaurant fills in its later days as it posts them, and the next Collection brings them.

| Source             | Page                                                  | Read                                   |
| ------------------ | ----------------------------------------------------- | -------------------------------------- |
| `coop_menus`       | `https://snuco.snu.ac.kr/foodmenu/?date=YYYY-MM-DD`   | one page for each day                  |
| `dormitory_menus`  | `https://snudorm.snu.ac.kr/foodmenu/?date=YYYY-MM-DD` | one page for each day, the same format |
| `veterinary_menus` | `https://vet.snu.ac.kr/cafe_menu/`                    | the table of the current week, once    |

- The Co-op page's restaurants are sent without the telephone number the page appends. The four whose names start with
  `* ` are left out: they repeat one fixed menu in every cell, every day. Its `기숙사식당` is left out too: it is
  `생협기숙사(919동)` of the dormitory page, and is taken from there.
- The veterinary college's table names no restaurant, so its lunches are sent as `수의대식당`. It writes a day as
  `10. 1(목)`, without a year: a row is a day's when the month, the day and the weekday match, which settles the year
  at the turn of the year. A day without a row, such as a Saturday or a day of next week, is sent without a restaurant.
  Only the lunch column is read.
- A meal is sent as the lines of its cell, in the page's order
  ([ADR 0001](../docs/adr/0001-menus-kept-as-lines.md)). A line is the text between two line breaks, without the
  spaces around it and with no-break spaces as spaces. A line without a letter or a digit is dropped, so an empty cell
  gives no lines, and neither does a cell that was not filled in and holds only the page's template, `: | :`.
- `src/menu/menu-line.ts` reads each line by itself, and sets a `kind`, a `name` and a `price` only when it is sure:

  | Line                                                                                     | `kind`    | `name`                | `price`       |
  | ---------------------------------------------------------------------------------------- | --------- | --------------------- | ------------- |
  | Starts with `※`, or says `휴무`: `※ 운영시간 : 11:00~14:30`, `개천절 휴무`               | `note`    | never                 | never         |
  | Only `<…>`, with or without a price: `<주문식 메뉴>`, `<뷔페> 6,500원`                   | `heading` | never                 | the set price |
  | A price after a colon: `눈꽃치즈닭갈비 : 6,000원`, `<A코너>제육김치덮밥, 잡채 : 6,000원` | `dish`    | the text before `: …` | the price     |
  | Anything else                                                                            | `null`    | never                 | never         |

  The price is set when the line holds exactly one amount of won, written without a typo: `6,000원`, `4,500 원`.
  `9,900원 / 12,400원` and `8,3000 원` stay in `text` alone. The name is set when the price is and the line ends with
  it: `눈꽃치즈닭갈비 : 6,000원` names `눈꽃치즈닭갈비`, so that the app shows the name and the price as a row.

- So a line that only names a dish has no `kind`: `잡곡밥` under a heading with a set price, or a lunch of the
  veterinary college's table. Nor has a sentence between angle brackets, which is a notice:
  `< 위 메뉴외에도 다양한 메뉴가 준비되어 있습니다>`.

What the collectors sent on the real pages, and how many lines got a `kind`, a `name` and a `price`, is recorded in
`.scratch/iteration-1/P07-campus-feeds/issues/01-menus-first-collection.md`.

## Demo menus

`pnpm demo:menus` sends the menus of the pages saved in `test/pages/` as those of today and the six days after, one
message per Source to `/menus/collected`, as a Collection would, and exits with status 1 when the main server refuses
one. The demo profile of `compose.yaml` runs it as `demo-menus` (the main server's README: Demo data). The Co-op's and
the dormitory's page of 1 October 2026 stand for each day's, and the veterinary college's week is moved by whole weeks
to the current one, so that each weekday keeps its lunch. The same parsers read them, and the Co-op's restaurants are
left out as the collector leaves them out (`src/menu/saved-menus.ts`).

## Events

The university's events list, the Source `snu_events`, is collected four times a day, at 00:00, 06:00, 12:00 and 18:00,
and posted as one message to `/global-events/collected`. The times (`COLLECTION_TIMES`) and the days the list's date
filter covers (`LISTED_DAYS`) are constants at the top of `src/event/event.collector.ts`. The times are provisional. To
run one Collection by hand, name the Source: `pnpm collect snu_events`.

A Collection does four things, one page at a time:

1. It lists the events from today on, page by page until a page lists no post:
   `https://www.snu.ac.kr/snunow/events?sc=y&df=2026.10.02&dt=2027.10.02&page=1`, the list's date filter from today
   over the next 365 days. The pager's links drop the filter, so the collector builds each page's address. A page whose
   posts were all listed before fails the Collection, since a list that answered every page with an earlier one would
   be read without end.
2. It asks the main server which of the listed posts it stores, at `/global-events/stored-posts`. The question and its
   answer are shaped in `src/event/dto/stored-event-posts.dto.ts`.
3. It reads the page of each post the main server does not store,
   `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525`, one after the other. A page that cannot be fetched, or the
   firewall's block page, stops it: a blocked request is likely followed by more. A page that is not the post asked for
   is skipped: the post is sent with its title from the list alone, so that it waits as a Draft for an Administrator,
   who reads it at the Source. Three such pages in a row stop it instead, since then the pages have changed, not the
   posts; none of the three is sent. A skipped post is kept back until a post after it is read or the list ends, so a
   Collection that stops before then does not send it either. A Collection that read no post fails as well and sends
   none of its skipped posts: it cannot tell an odd post from pages that have changed.
4. It sends what it read, in the list's order, in one message. When every post is stored, the message has no event and
   still records a successful Collection. When the Collection stops, the posts read before are sent all the same, with
   why it stopped as `failureReason`: the main server stores them, so that they are never read again, and records the
   failure in place of a success in the same transaction. The command then says the Collection failed.

So a post is read once, and an edit at the Source after that is not seen. One post whose page is not a post holds up
neither the posts after it nor the Collection status, as long as the Collection reads another: it is logged as a
warning and waits as a Draft. Three in a row, or a Collection that reads none, fail it, as step 3 says, and those
posts are read again at the next Collection.

A page is read only when it has the structure the parser expects. A page of the list shows its posts, each with its post
number, or the end of the list (`검색된 자료가 없습니다.`), and repeats the filter it was asked for, since an unfiltered
list runs to some 600 pages. A post's page has its title and its body, and its canonical link is the address of the post
asked for. A page of the list without it fails the Collection; a post's page without it is skipped, as step 3 says.
The firewall's block page, which refreshes to `snucert.snu.ac.kr/waf/error.html`, is recognised before either and
fails the Collection.

From a post's page, `src/event/event-page.parser.ts` reads, by the team's own rules:

- The title, and the post's address as the post number and the source link.
- The description: the body as text, one line of the page per line, with no-break spaces as spaces.
- A label, of the time line or the place line, is followed by a colon, a `]` or a `|`, as in `- 일시:`, `• 장소]` or
  `장소 | …`. A label alone on its line, with no colon, `]` or `|`, as in `4. 장소`, takes the next line as its
  value, unless that line has a label of its own or is Hangul words alone, such as `- 학생회관`.
- The time line: the first line of the body labelled `일시`, `일자`, `일정` or `기간` that has a value. A bullet or a
  number may come before the label, and spaces inside it, no-break spaces included, do not count: `· 일   시:`,
  `○일 정 :`, `- 일시:`. A label that only ends with one, such as `신청 기간` or `접수기간`, is another line, so
  application periods and deadlines stay in the description, unread.
- The start and the end, from the time line, by `src/event/event-time.ts`:
  - The start is the first day written with its year, as `2026. 10. 13.(화)`, `2026.10.16(금)` or
    `2026년 10월 7일(수요일)`, with the time after it, if one comes before a range mark (`~`, `∼`, `〜`, `～`, `-`,
    `–`). `3시간` is a length, not a time.
  - A time is read only when it is clear whether it is before or after noon: on the 24-hour clock, with two digits
    before a colon or an hour after 12 (`09:30`, `17:00`, `14시`), or with `오전`, `오후`, `저녁`, `AM` or `PM` before
    or after it (`오후 2시`, `(오후) 3:00`, `저녁 7시 30분`, `PM 02:00`, `5:00 PM`). `2시`, `2:00` or `7시 30분` alone
    could be either, 12 with a half of the day is read only as noon, `오후 12시` or `12:00 PM`, and `밤` or `낮` before
    an hour up to 12 says neither half for certain, as in `밤 09:00`. A time that is not clear is not read, and the
    start is its day.
  - The end follows the range mark: a day, with or without its year, and a time. A day without its year is in the
    start's year, or in the next when it would come before the start. The end takes the start's form, a time when the
    start has one and a day otherwise, and is dropped when it does not come after the start. So
    `1부(18:30~19:30) / 2부(20:00~21:00)` gives the first session. An end on the start's day that names no half of the
    day is in the start's, unless it then comes before the start: `오후 2시 ~ 4시` ends at 16:00.
  - Without a time line that names a day with its year, the start and the end come from the header's date, such as
    `2026.10.12. ~ 2026.10.16.`, which is often the application period. `readFrom` says which of the two they came
    from.
- The place line: the first line labelled `장소`, or with a label that names the event's own place, that has a value,
  as it is written. Those labels are `행사 장소`, `개최 장소`, `교육 장소`, `강연 장소`, `강의 장소`, `오프라인 장소`,
  `대면 장소`, and `일시 및 장소`, `일시와 장소`, `시간 및 장소` or `시간과 장소`, whose value also holds the time. A place to gather or to apply,
  such as `집결 장소` or `신청 장소`, is somewhere else and is not read.

What the rules cannot read is sent as `null`, and the post is still sent with its text. The main server decides from
what was read whether the event is published: [Global Events](../main-server/README.md#global-events).

`test/pages/` holds the list's first two pages and the page past its end, and six posts, each saved once on 2026-10-02:
176525 (a time and a place, after an application period with times), 176516 (a time in words), 176561 (two sessions,
and an application deadline), 176558 (a range of days and several places), 176564 (no time line, and the application
period as the header's date) and 176549 (lists and a table, and not an event). Cases they do not show, such as a range
across the new year, are edits of them made in `test/event-page-parser.e2e-spec.ts`.

## Shuttle

Two Sources of the shuttle operator's circular route 41946 (`.scratch/research/external-sources.md` §5), collected by
`src/shuttle/shuttle.collector.ts`. The times are constants at the top of the file.

| Source             | Request                                                                                      | When                                                 | Sent as                       |
| ------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| `shuttle_stops`    | `GET https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F`, the route page    | Every day at 07:00                                   | `/shuttle/stops/collected`    |
| `shuttle_vehicles` | `POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute` with `{"data":",F,41946,snu_1"}` | Every 15 seconds on weekdays, from 08:00 to 20:59:45 | `/shuttle/vehicles/collected` |

- The route page: each stop is a `span.route_point` in `#routef`, with its name in `em` and its place on the operator's
  drawing in its inline style, `top: 35px; left:157px;`. The stops are sent in the page's order, which is the loop
  order, each with `left` and `top`. The service hours are the header's one `li`, sent as text with a line for each
  `<br>` and plain spaces for the page's no-break spaces. A page without a stop, with a stop without its name or place,
  or without the hours is a failed Collection.
- The vehicle positions: the answer is `{"d":"row;row;…"}`, each row `carid/x/y/count/plates/code`. Each row is sent as
  `{ carId, x, y }`, the position on the same drawing. The count and the plates describe everything at that position,
  not one vehicle, and are left out; several vehicles at one stop are several rows. An empty `d` is sent as no
  vehicles. The answer carries no time, so `collectedAt` is when it arrived. An answer that is not this JSON, such as
  the firewall's block page, is a failed Collection.
- The vehicle positions are not asked for outside those hours, the service hours of the semester, nor at weekends. On a
  holiday or in a vacation the operator answers with no vehicles, which is sent as such.
- The operator is asked once in each run, and the request is given up after 5 seconds, so the requests never pile up.
  A run itself lasts 15 seconds at the longest, when the page comes late and the main server answers neither the
  message nor the failure's report, each waited for 5 seconds.
- The main server places each vehicle at a stop and sends the vehicles on to the apps:
  [Shuttle](../main-server/README.md#shuttle).

`test/pages/` holds the route page and the vehicle positions as the operator answered them, each asked for once, at
15:40 KST on Friday 2026-10-02, when six vehicles ran.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs no Docker: the tests run the worker alone.

## Folder layout

```text
src/
├── main.ts                          starts the server
├── collect.ts                       the command that runs one Collection by hand
├── collect-sources.ts               finds the collector of each Source the command names, and runs it
├── demo-menus.ts                    the command that sends the saved pages' menus, `pnpm demo:menus`
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── main-server.module.ts        makes MainServer available to every feature
│   ├── main-server.ts               the worker's way to the main server: HTTP requests with the worker's token
│   ├── page-fetcher.module.ts       gives every collector a PageFetcher of its own
│   ├── page-fetcher.ts              the one place where pages are fetched
│   ├── seoul-day.ts                 the calendar day in Asia/Seoul
│   └── collector.ts                 the worker's end of a Collection, which every collector extends
├── health/                          a feature: the liveness and readiness checks
├── menu/                            a feature: the collector of the three menu Sources and its parsers
├── shuttle/                         a feature: the collector of the shuttle's route page and vehicle positions, and
│                                    their parsers
└── event/                           a feature: the collector of the events list and its parsers
test/                                tests, which stand in for the Sources and the main server
└── pages/                           pages saved from the Sources, which the tests read in place of them
```

## Adding a feature module

Apart from the health checks, the worker's features are collectors, one for each kind of Source. The steps add one
named `library`. Use a short lowercase name, with dashes between words (`shuttle-stop`).

1. Create the module. It lands in `src/library/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module library
   ```

2. Write the collector in `src/library/library.collector.ts`, extending `Collector`, and add it to the `providers` of
   `LibraryModule`, as `src/menu/` does. It reads its Source on a schedule and hands what it read to the main server
   (see [Collections](#collections)). Put a parser for each page format beside it. A feature with HTTP routes has a
   controller instead, as `src/health/` does: `pnpm exec nest g controller library --no-spec`.
3. Put the shape of the message it sends in `src/library/dto/`. There is no `entities/` folder, because the worker
   server stores no records. Everything that belongs to the feature stays inside `src/library/`.
4. On the main server, add the Source, the message's schema and its route (see
   [Requests from the worker server](../main-server/README.md#requests-from-the-worker-server)). Name the Source in the
   collector's `@Collects()` too, so that the command can run its Collection.
5. Code shared by two or more features goes in `src/common/`. If another feature needs a provider of this one, add it
   to `exports` in `LibraryModule` and add `LibraryModule` to the other module's `imports`.
6. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose reads `worker-server/.env`; add the setting to the
   `worker-server` service's `environment` in `compose.yaml` at the repository root only when it needs another value
   inside Compose, as `MAIN_SERVER_URL` does. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
7. Save a page of the Source and write the tests of the parser and of the collector (see
   [Collections](#collections)). Start the server with `startApp` from `test/start-app.ts`. A route is called with
   `supertest`, as `test/health.e2e-spec.ts` does.
8. Run `pnpm format`, then the four checks.

Import classes with a plain `import { PageFetcher } from ...`, never `import type`. Nest looks the class up at runtime
to inject it.
