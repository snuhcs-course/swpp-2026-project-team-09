# match-server

The SNU Now match server. It keeps the requests for Matching in its own database and groups them in rounds. Only the
main server calls it, and it calls only the main server, over HTTP; it takes no part in messaging over Redis. It
follows the main server's layout, settings and checks.

## Run it

You need Node.js 24 and Docker. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

First create your settings file in `match-server/`:

```bash
pnpm install
cp .env.example .env
```

The main server calls this server with a secret that the two servers share. Put the `MATCH_SERVER_TOKEN` line of
`main-server/.env` in `.env` too; the main server's README says how to generate it. `MAIN_SERVER_URL` is where this
server reaches the main server, and `ROUND_INTERVAL_SECONDS` the seconds from one round to the next, 60 for now.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis and every server. The match server takes its settings from `match-server/.env` and brings
its database up to the current schema before it starts. `docker compose down` removes the containers and keeps the
database; `docker compose down -v` deletes it too.

While you work on the match server, start only the database in the repository root and run the server yourself in
`match-server/`:

```bash
docker compose up -d postgres
```

```bash
pnpm db:migrate
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3003/health/live`: liveness, the process is up.
- `GET http://localhost:3003/health/ready`: readiness, the database can be reached. It answers 503 and names the
  database when it cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server also stops at startup when it cannot reach the database, and its log names the address it tried, for
example `Can't reach database server at localhost:5432`. It waits at most 5 seconds for the database to answer. Start
it first with `docker compose up -d postgres`. Once the server is running, a database that goes down makes readiness
answer 503 instead.

## Matching requests

A User asks for Matching on a Global Event in the app, which speaks to the main server only. The main server decides
whether the request can be made and passes it here, and this server keeps it. A request holds the User, the Global
Event, the group size from 2 to 4, the User's interest hashtags as they were when it arrived, its state and the time it
arrived. The User and the Global Event are the main server's, so their ids refer to nothing in this database.

A request is in one of four states:

- `waiting`: as it is stored. Only a waiting request can be withdrawn.
- `matched`: put in a match with others by a round (see [Rounds](#rounds)).
- `withdrawn`: withdrawn by its User.
- `expired`: no longer standing, because its Global Event started or was cancelled or its User came to hold a Shared
  Quest for it. A round finds it so, or the main server answers so for its match.

A User has at most one open request, one that waits, for a Global Event, which the database enforces: the table
`matching_requests` has the partial unique index `matching_requests_user_id_global_event_id_key` on the User and the
Global Event of the rows in `waiting`. A second request while one waits is refused, also when two arrive at the same
moment. Once a request no longer waits, the User may ask again, and the latest request is the one read. A check in the
migration keeps the size from 2 to 4.

## Routes for the main server

Every route but the health checks is the main server's. The path names the User the call is about: the main server has
checked the User's access token and whether the request can be made, and this server takes its word.

| Route                                                           | Body                                      | Answer                                      |
| --------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `POST /users/:userId/matching-requests`                         | `{ "globalEventId", "size", "hashtags" }` | 201 with the request, stored as `waiting`   |
| `GET /users/:userId/matching-requests`                          |                                           | 200 with the waiting requests, oldest first |
| `GET /users/:userId/matching-requests/:globalEventId`           |                                           | 200 with the latest request for the event   |
| `POST /users/:userId/matching-requests/:globalEventId/withdraw` |                                           | 204, and the request is `withdrawn`         |

A request reads
`{ "globalEventId": "…", "size": 3, "state": "matched", "arrivedAt": "2026-10-04T08:00:00.000Z", "questId": "…" }`.
`questId` is the Shared Quest of a matched request, and `null` until the main server has created it and for a request
in any other state. The refusals each have a `code`:

| Refusal                                                        | Status | `code`                         |
| -------------------------------------------------------------- | ------ | ------------------------------ |
| A request while the User's request for the event waits         | 409    | `MATCHING_REQUEST_WAITING`     |
| Reading or withdrawing when the User never asked for the event | 404    | `MATCHING_REQUEST_NOT_FOUND`   |
| Withdrawing a request that is not waiting                      | 409    | `MATCHING_REQUEST_NOT_WAITING` |

Every route for the main server follows these rules:

- **Who may call it**: the main server alone. The call carries `Authorization: Bearer <MATCH_SERVER_TOKEN>`, the secret
  of at least 32 characters that the two servers' settings share, and `MainServerGuard` in
  `src/common/main-server.guard.ts`, registered for every route, answers 401 to any other call. A route needs no
  marking for it. `@Public()` from `src/common/public.decorator.ts` opens a route to anyone, as it does the health
  checks. The calls this server makes to the main server carry the same secret.
- **Validation**: the handler takes the body with `@Body({ schema })` and each id with
  `@Param('userId', { schema: z.uuid() })`, the schema zod in the feature's `dto/`. Use `z.strictObject`, so that a
  misspelt field is refused instead of dropped. A call that does not match gets 400 with a message naming the field.
- **Refusals**: a call that matches its schema but not what is stored is refused with
  `{ "statusCode", "error", "code", "message" }`. The main server passes such a refusal on to the app as it is, so its
  `code` is one the main server's README lists for the app. The main server takes any other answer outside 2xx, or
  none within 5 seconds, as a failure and answers the app 502.

In a test, the helpers in `test/main-server.ts` call a route as the main server does, with its token, as
`test/matching-requests.e2e-spec.ts` does:

```ts
const app = await startApp(inject('settings'));
const response = await ask(app, userId, { globalEventId, size: 2, hashtags: [] });
expect(response.status).toBe(201);
await app.close(); // in afterAll
```

`asMainServer(call, token)` sends another token, or none with `null`. Add a new route to the list in
`test/main-server-token.e2e-spec.ts`, which checks that each refuses a call without the token. The database is the
shared one, so each test makes up a User and a Global Event of its own with `randomUUID()`. `connectToDatabase()` gives
a test its own connection, for the states that only the rounds write.

## Rounds

Every `ROUND_INTERVAL_SECONDS`, provisionally a minute, a round turns waiting requests into matches and asks the main
server for each match's Shared Quest. `RoundService` in `src/matching/round.service.ts` runs it, on an interval it
registers with `SchedulerRegistry` from `@nestjs/schedule` when the server starts.

1. **One at a time.** The round opens a transaction and takes PostgreSQL's advisory lock `matching-round` with
   `pg_try_advisory_xact_lock`. While another match server's round holds it, the round is skipped; the lock ends with
   the transaction. No state of a process decides it, so this holds however many match servers run.
2. **Which requests stand.** It sends the waiting requests to the main server, which answers the ones whose Global
   Event is published and has not started and whose User holds no Shared Quest for it. The others become `expired`.
   When the main server does not answer, the round groups and expires nothing. A request withdrawn while the main
   server answers is left as it is; the rest are locked until the round's transaction ends, so a withdrawal waits for
   it.
3. **Groups.** The requests that stand form a pool for each Global Event and size. A pool of at least one group's size
   goes to the grouping module (see [Grouping](#grouping)), and each group it returns is stored as a match, its
   requests `matched`. The others wait for the next round.
4. **Quests.** The transaction ends, and the round asks the main server for the Quest of every match that awaits one,
   the oldest first, each in a transaction of its own that claims the match with `FOR UPDATE SKIP LOCKED`, so that no
   two match servers ask for one match at the same moment.

A match is in one of three states, in `matches.state`:

- `awaiting_quest`: as it is formed. Every round asks the main server for its Quest, also a round after a restart,
  until the main server answers. Nothing about it is kept in memory.
- `quest_created`: the main server created the Shared Quest, whose id is stored with the match, `quest_id`. A check in
  the migration keeps `quest_id` to this state. The request of a matched User whom the main server left out of the
  Quest, for holding a Shared Quest for the Global Event by then, becomes `expired`.
- `closed`: the main server refused it with `GLOBAL_EVENT_NOT_FOUND`, `GLOBAL_EVENT_STARTED` or `MATCH_TOO_SMALL`,
  fewer than two of its Users being free for a Shared Quest. Its requests become `expired`, and it is not asked for
  again. A User whose request expired so asks again.

The main server creates a match's Quest once, by the match's id, so asking again is safe. This one request is repeated
this way; there is no general outbox.

The calls go through `MainServer` in `src/matching/main-server.ts`: HTTP requests to `MAIN_SERVER_URL`, each of which
reaches one main server however many run, with `Authorization: Bearer <MATCH_SERVER_TOKEN>`. Any answer outside 2xx
other than a refusal with a code, an answer of another shape, or none within 5 seconds counts as no answer. The main
server's README describes its two routes, `POST /matching-requests/standing` and `POST /matches/:matchId/quest`.

In a test, `MainServerStub` from `test/main-server.ts` answers in the main server's place: `startApp` takes it as
`mainServer`. Its `standing` and `quest` say how it answers, `null` for no answer, and it keeps each call in `calls`.
A round never runs by itself in the tests, whose settings set an hour between rounds. `useRounds()` from
`test/rounds.ts`, called at the top of a test file, gives the file a database of its own, since a round groups every
waiting request, and `rounds.run(app)` runs a round, as `test/rounds.e2e-spec.ts` does:

```ts
const rounds = useRounds();

it('groups the requests', async () => {
  const mainServer = new MainServerStub();
  const app = await rounds.start(mainServer);
  await rounds.waiting(globalEventId, 2);
  await rounds.waiting(globalEventId, 2);
  await rounds.run(app);
  expect(await rounds.matchesOf(globalEventId)).toHaveLength(1);
});
```

## Grouping

Grouping is one module with one question: given the waiting requests of one Global Event and size, which groups are
formed? `Grouping` in `src/matching/grouping.ts` asks it with `group(requests, size)`, each request with its `id`,
`hashtags` and `arrivedAt`, and answers groups of exactly `size` of the requests given. The requests in no group wait
for the next round. A round calls it only with at least `size` requests. Nothing outside the module knows the rule.

`HashtagGrouping` in `src/matching/hashtag-grouping.ts` is the rule now. It forms as many groups as the requests fill.
Each group starts from the earliest request left and takes, until it is full, the request that shares the most hashtags
with the requests already in it, counted for each of them, the earlier request first where two share as many.
`test/grouping.e2e-spec.ts` tests it on its own.

Grouping by AI lands here in a later iteration: another provider of `Grouping` in `MatchingModule`, which is why
`group()` answers a promise. A test replaces the module as a whole by giving `startApp` a `grouping`.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs Docker running. It starts its own PostgreSQL container and removes it afterwards.

## Folder layout

```text
prisma/
├── schema.prisma                    database schema
└── migrations/                      every schema change, applied in order
src/
├── main.ts                          starts the server
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── main-server.guard.ts         gives every route but the public ones to the main server
│   ├── public.decorator.ts          @Public(): opens a route to calls without the main server's token
│   ├── prisma.module.ts             makes PrismaService available to every feature
│   └── prisma.service.ts            the match database
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
└── matching/                        a feature: the requests for Matching, asked, withdrawn and read, and the
                                     rounds that group them and ask the main server for Shared Quests
test/                                tests, run against PostgreSQL in a container
```

## Database

The match server keeps its records in its own database, `match`, under its own role, `match`. That role cannot reach
the main server's database.

To change the schema, with the database running and `.env` in place:

1. Edit `prisma/schema.prisma`.
2. Record the change as a migration and apply it to your database. Name it after what it does:

   ```bash
   pnpm exec prisma migrate dev --name add-matches
   ```

3. Regenerate Prisma Client, so that the code sees the new schema:

   ```bash
   pnpm exec prisma generate
   ```

4. Commit `schema.prisma` and the new folder in `prisma/migrations/` together.

`pnpm db:migrate` brings any database up to the current schema by applying the migrations it has not seen yet.

Prisma is pinned at 7.10.0. Ignore the message that suggests updating to Prisma 8.

## Adding a feature module

The steps add a feature named `explanations`. Use a short lowercase name, with dashes between words
(`match-explanations`).

1. Create the module. It lands in `src/explanations/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module explanations
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `ExplanationsModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 8):

   ```bash
   pnpm exec nest g controller explanations --no-spec
   pnpm exec nest g service explanations --no-spec
   ```

3. Every route is the main server's unless it is marked `@Public()`, and follows the rules in
   [Routes for the main server](#routes-for-the-main-server).
4. Put request and response shapes in `src/explanations/dto/`. A stored record is a model in `prisma/schema.prisma`
   (step 5), and the code uses the type that Prisma Client generates for it:
   `import { Explanation } from '../generated/prisma/client.js'`. That type exists only at compile time, so add a class
   to `src/explanations/entities/` only when a record is needed as a class, for example to put decorators on its
   fields: `class ExplanationEntity implements Explanation`. Everything else that belongs to the feature stays inside
   `src/explanations/`.
5. If the feature stores records, add its models to `prisma/schema.prisma` and record a migration (see
   [Database](#database)). Read and write them by injecting `PrismaService`. Every record is identified by a UUID v4
   generated by the database:

   ```prisma
   id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   ```

6. If another feature needs `ExplanationsService`, add it to `exports` in `ExplanationsModule` and add
   `ExplanationsModule` to the other module's `imports`. Code shared by two or more features goes in `src/common/`.
7. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose passes `.env` to the server. Add the setting to the
   `match-server` service's `environment` in `compose.yaml` only when it needs another value inside Compose, as the
   database address does. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
8. Write `test/explanations.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes
   with `supertest` and the main server's token, as [Routes for the main server](#routes-for-the-main-server) shows.
9. Run `pnpm format`, then the four checks.

Import classes with a plain `import { ExplanationsService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it.
