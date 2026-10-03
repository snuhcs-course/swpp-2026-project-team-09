# worker-server

The SNU Now worker server. It collects the Sources, the pages and feeds outside the project, on a schedule, and hands
what it reads to the main server. It follows the main server's layout, settings and checks, and keeps no data of its
own.

## Run it

You need Node.js 24 and Docker. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

While you work on the worker server, start only Redis in the repository root and run the server yourself in
`worker-server/`:

```bash
docker compose up -d redis
```

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3002/health/live`: liveness, the process is up.
- `GET http://localhost:3002/health/ready`: readiness, Redis can be reached. It answers 503 and names Redis when it
  cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server starts even when it cannot reach Redis, because it only sends messages. Until Redis can be reached,
readiness answers 503.

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

- **By hand**: `pnpm collect` runs one Collection of each Source it names, as the schedule would, and exits. Use it
  after starting the system outside the scheduled times, so that the main server holds data without waiting for the
  next run:

  ```bash
  pnpm build
  pnpm collect coop_menus dormitory_menus veterinary_menus
  ```

  In Compose the worker is built already:

  ```bash
  docker compose exec worker-server node dist/collect coop_menus dormitory_menus veterinary_menus
  ```

  It needs the main server running, logs for each Source whether the main server took what was read, and exits with
  status 1 when one was not taken or a name is not a Source. A collector names the Sources it collects with
  `@Collects()` from `src/common/collector.ts`, and the command runs each with the collector's `collectOne(source)`,
  which gives whether the main server took what was read:

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
- **Handing over**: the collector sends what it read as one request-and-response message and waits for the answer,
  with `handOver(source, collectedAt, pattern, message)` of `Collector`. `send(pattern, message)` sends any other
  message the same way and gives the main server's answer. Both go through the messaging client (`MESSAGING_CLIENT`),
  and give the answer up after 5 seconds, so that a Collection never waits for a main server that is down.
  The main server's README sets how a message is named and shaped and what it answers:
  [Messages from the worker server](../main-server/README.md#messages-from-the-worker-server). The shape of what a
  Collection read is a type in the feature's `dto/`, kept the same as the main server's schema by hand.
- **Failure**: when a page cannot be fetched or read, or the main server does not take the message, `handOver()` logs
  it and sends `collection-failed` with the Source, the time and the reason, such as
  `https://snudorm.snu.ac.kr/foodmenu/?date=2026-10-02 answered 503`, `The page has no menu table` or
  `The main server did not take shuttle-vehicles-collected: no answer within 5 seconds`. The other Sources of the run
  are still collected, and the main server keeps what it stored.

The tests never call a real Source. `startApp` replaces the HTTP call under `PageFetcher` (`FETCH`), and every request
fails unless the test gives it pages. A parser is tested as a function and a collector by running it once, not through
HTTP; their files are still named `*.e2e-spec.ts`, the one pattern Vitest runs.

- **Saved pages**: `test/pages/` holds one page of each Source as it was served, named after the Source and the day it
  was saved, and read with `savedPage(name)`, or `savedAnswer(name)` for a JSON answer. Save a page once, with the
  project's `User-Agent`. Prettier leaves the folder alone:

  ```bash
  curl -A 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)' \
    -o test/pages/coop-menus-2026-10-01.html 'https://snuco.snu.ac.kr/foodmenu/?date=2026-10-01'
  ```

- **A parser** is given a saved page with `savedPage(name)` from `test/pages.ts`, and the test checks what comes out,
  as `test/menu-page-parser.e2e-spec.ts` does. A case the saved page does not show, such as a closure or the turn of
  the year, is an edit of the saved page made in the test, with a comment that says what it changes.
- **A collector** runs once against `sourcesServing(pages)` from `test/sources.ts`, which stands for the Sources, and a
  `MainServerStub` from `test/main-server.ts`, which stands for the main server and keeps the messages the worker
  sends, as `test/menu-collector.e2e-spec.ts` does. `refusals.set(pattern, problem)` makes it refuse a message. The
  test sets the clock with `vi.useFakeTimers({ toFake: ['Date'], now })`. An address given `null` in place of a page
  never answers, and so do the patterns in the stub's `unanswered`; a test that waits for the 5 seconds replaces the
  timers too, as `test/shuttle-collector.e2e-spec.ts` does.
- **The command** is tested through `collectSources(app, names)`, which `src/collect.ts` calls, in the same file.

## Menus

Three Sources are collected at 05:00 and 10:00, each for today and the six days after in Asia/Seoul, and each sent as
one `menus-collected` message. The times (`COLLECTION_TIMES`) and the number of days (`COLLECTED_DAYS`) are constants
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

## Shuttle

Two Sources of the shuttle operator's circular route 41946 (`.scratch/research/external-sources.md` §5), collected by
`src/shuttle/shuttle.collector.ts`. The times are constants at the top of the file.

| Source             | Request                                                                                      | When                                                 | Sent as                      |
| ------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `shuttle_stops`    | `GET https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F`, the route page    | Every day at 07:00                                   | `shuttle-stops-collected`    |
| `shuttle_vehicles` | `POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute` with `{"data":",F,41946,snu_1"}` | Every 15 seconds on weekdays, from 08:00 to 20:59:45 | `shuttle-vehicles-collected` |

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
- A run that fails ends within 10 seconds, 5 for the page and 5 for the main server, before the next one is due, so
  the requests never pile up.
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

`pnpm test` needs Docker running. It starts its own Redis container and removes it afterwards.

## Folder layout

```text
src/
├── main.ts                          starts the server
├── collect.ts                       the command that runs one Collection by hand
├── collect-sources.ts               finds the collector of each Source the command names, and runs it
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── messaging.module.ts          makes the messaging client available to every feature
│   ├── messaging.ts                 options for NestJS messaging over Redis
│   ├── page-fetcher.module.ts       gives every collector a PageFetcher of its own
│   ├── page-fetcher.ts              the one place where pages are fetched
│   └── collector.ts                 the worker's end of a Collection, which every collector extends
├── health/                          a feature: the liveness and readiness checks
├── menu/                            a feature: the collector of the three menu Sources and its parsers
└── shuttle/                         a feature: the collector of the shuttle's route page and vehicle positions, and
                                     their parsers
test/                                tests, run against Redis in a container
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
4. On the main server, add the Source, the message's schema and its handler (see
   [Messages from the worker server](../main-server/README.md#messages-from-the-worker-server)). Name the Source in the
   collector's `@Collects()` too, so that the command can run its Collection.
5. Code shared by two or more features goes in `src/common/`. If another feature needs a provider of this one, add it
   to `exports` in `LibraryModule` and add `LibraryModule` to the other module's `imports`.
6. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env`, to the `worker-server` service in `compose.yaml` at the repository root and to the settings in
   `test/global-setup.ts`. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
7. Save a page of the Source and write the tests of the parser and of the collector (see
   [Collections](#collections)). Start the server with `startApp` from `test/start-app.ts`. A route is called with
   `supertest`, as `test/health.e2e-spec.ts` does.
8. Run `pnpm format`, then the four checks.

Import classes with a plain `import { PageFetcher } from ...`, never `import type`. Nest looks the class up at runtime
to inject it.
