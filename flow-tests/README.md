# flow-tests

The SNU Now flow tests. They start the four servers as built, with PostgreSQL and Redis, and run the three flows of the
demo from end to end through the servers' public interfaces, as the app would: HTTP to the main server and a Socket.IO
connection to the socket server. Each server's own rules are tested in that server's project; these tests check that
the servers work together, where one hands over to the next.

## Run it

You need Node.js 24, Docker and `openssl`, which macOS and Linux have. The commands use pnpm 12.6.0, the version
declared in `package.json`; with another version, type `npx pnpm@12.6.0` wherever this file says `pnpm`.

```bash
pnpm install
pnpm test
```

`pnpm test` builds the servers' images and starts `compose.yaml` at the repository root with `compose.test.yaml` over
it, as the Compose project `snu-now-flow-tests`. It waits until every server is ready, runs the flows one at a time and
then removes the stack with its volumes. A developer's own stack, its ports and its data are left alone: the test stack
has its own name and volumes, and publishes only the main and socket servers, on free ports of the loopback address.
The first run builds the images, which takes some minutes; later runs reuse Docker's cache.

The stack reads no `.env` file of the projects. Its keys and secrets are made afresh for each run in `.stack/`, which
git ignores, and the rest of its settings are in `compose.test.yaml`. The match server runs a round every second.

A run that was interrupted leaves the stack running; the next run removes it first. To remove it by hand, in the
repository root:

```bash
docker compose -p snu-now-flow-tests --env-file flow-tests/.stack/compose.env -f compose.yaml -f flow-tests/compose.test.yaml down -v
```

## The flows

Each flow is one test that reads like the demo script: named Users act one after the other, with a check after each
step. A failed call names the User, the call and the server's answer, and a wait for a message on the socket names
what it waited for.

| File                           | Flow                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/event.flow.ts`           | An account outside SNU is refused. An Administrator publishes a Global Event. Two Users ask for Matching in a group of two and, after the match server's round, hold the same Shared Quest. One opens its Party; a second Party for the Quest is refused; the other enters. Each receives the other's position, and a walking route to the event is returned. A Master Switch turned off removes the User at once and stops delivery. |
| `test/friend.flow.ts`          | A User accepts another's Invite Link, and each receives the other's position. A position off campus is not delivered and removes the Avatar. A friendship's switch turned off stops delivery until it is on again. A Meetup proposed and accepted gives both the same Shared Quest. The friendship ends, and positions stop.                                                                                                          |
| `test/campus-services.flow.ts` | The worker collects the Co-op's and the dormitory's menus and the shuttle's stops and vehicles, by hand as `pnpm collect` does. Today's menus are served, and a shuttle vehicle is at its stop, pushed to the app and through the route.                                                                                                                                                                                              |

A message that must not arrive is waited for 1.5 seconds; one that is delivered takes milliseconds.

Not covered: the match server asking again for a Quest after the main server was stopped and started. A round asks the
main server which requests still stand before it forms a match, so the main server would have to stop between that
question and the request for the Quest, which a test cannot time. The match server's own tests cover the repeat.

## What is replaced

Nothing outside the repository is called. The `sources` container of `compose.test.yaml` runs `sources/serve.ts` and
answers, over HTTPS, for the host names of the outside services, which Compose gives it on the stack's network. The
main and worker servers trust its certificate through `NODE_EXTRA_CA_CERTS`, so they reach it at the addresses their
code names, unchanged:

| Service                               | Answered with                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Google's keys for ID tokens           | The public key the tests sign their Google ID tokens with                     |
| The Co-op's and dormitory's menus     | The saved pages of `worker-server/test/pages/`, dated as the day asked for    |
| The shuttle's route page and vehicles | The saved page and answer of `worker-server/test/pages/`; car 4522 is at 정문 |
| Kakao's walking route API             | The saved walk of `main-server/test/answers/`, whatever the points asked for  |

The veterinary college's page and the university's events list answer 404: no flow collects them, and the worker's own
schedule, which keeps running in the stack, then records a failed Collection instead of calling the real sites.

## Empty state

Before each test, the main and match databases are emptied of everything but the seed (Places, the shuttle's route and
stops), the Administrators and the migrations, and Redis is emptied. This is the only time the tests reach a database
or Redis, through `docker compose exec`.

## Checks

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | The flows, on the test stack                 |

## Folder layout

```
flow-tests/
├── compose.test.yaml         # the test stack over compose.yaml
├── sources/serve.ts          # Google, the Sources and Kakao, from saved pages
└── test/
    ├── *.flow.ts             # the three flows
    ├── global-setup.ts       # makes the keys, starts and removes the stack
    ├── setup.ts              # empties the state before each test
    ├── stack.ts              # docker compose, the empty state and a Collection by hand
    ├── people.ts             # Users with the app open, and the Administrator
    ├── caller.ts             # calls to the main server and Google ID tokens
    ├── inbox.ts              # what the socket pushes, and bounded waits for it
    ├── answers.ts            # what the flows read from the answers
    └── campus.ts             # positions on and off campus, and times
```
