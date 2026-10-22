# flow-tests

The SNU Now flow tests. They start the four servers as built, with PostgreSQL and Redis, and run the demo's flows and
the A1 and A2 journeys from end to end through the servers' public interfaces, as the app would: HTTP to the main server
and a Socket.IO connection to the socket server. `pnpm test` also checks the stacks themselves: the Dev Server's,
through its proxy, and the harness that starts them. Each server's own rules are tested in that server's project; these
tests check that the servers work together, where one hands over to the next.

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

`test/deploy-stack.e2e.test.ts` starts a second stack, the Dev Server's: `compose.yaml` with `compose.deploy.yaml` and
`compose.deploy.test.yaml` over it, as the project `snu-now-deploy-test`. It calls the servers through the proxy, on a
free port of the loopback address, and removes the stack with its volumes when it is done.

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

| File                               | Flow                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/event.e2e.test.ts`           | An account outside SNU is refused. An Administrator publishes a Global Event. Two Users ask for Matching in a group of two and, after the match server's round, hold the same Shared Quest. One opens its Party; a second Party for the Quest is refused; the other enters. Each receives the other's position, and a walking route to the event is returned. A Master Switch turned off removes the User at once and stops delivery. |
| `test/friend.e2e.test.ts`          | A User accepts another's Invite Link, and each receives the other's position. A position off campus is not delivered and removes the Avatar. A friendship's switch turned off stops delivery until it is on again. The friendship ends, and positions stop. (Its Meetup step went with the Meetup, retired in Iteration 2.)                                                                                                           |
| `test/campus-services.e2e.test.ts` | The worker collects the Co-op's and the dormitory's menus and the shuttle's stops and vehicles, by hand as `pnpm collect` does. Today's menus are served, and a shuttle vehicle is at its stop, pushed to the app and through the route.                                                                                                                                                                                              |
| `test/session.e2e.test.ts`         | A1 (US-AUTH-02 scenario 1, NFR-07). Two Friends see each other, and one signs in on a second phone. The first phone is told its Session ended and is disconnected; its next upload is refused, and no position of it reaches the Friend. The second phone's upload does.                                                                                                                                                              |
| `test/quest-group.e2e.test.ts`     | A2 (US-QUEST-03 scenarios 1 and 2). A User who only reads a Board finds an Approval Quest on it. Its Leader accepts two Users' requests to join, and each time every Holder is told and reads the new Holder. The Holders enter the Quest's Party; the Leader ends the Party and then the Quest, and the others are told. The Quest is refused as not found, nobody is in a Party, and the Board lists nothing.                       |

A message that must not arrive is waited for 1.5 seconds; one that is delivered takes milliseconds.

Not covered: the match server asking again for a Quest after the main server was stopped and started. A round asks the
main server which requests still stand before it forms a match, so the main server would have to stop between that
question and the request for the Quest, which a test cannot time. The match server's own tests cover the repeat.

## The admin site in a browser

`pnpm test:admin-ui` runs two end-to-end journeys through a screen, the admin site in Playwright's headless Chromium,
both in `test/admin-ui/global-events.e2e.test.ts`:

| Journey | What the Administrator does and what is checked                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1      | US-ADMIN-01 scenario 1. The Administrator signs in, creates a Draft and publishes it. A connected User is told, and lists the event with the title, place and position typed and the instants of the Seoul times typed. |
| W2      | US-ADMIN-01 scenario 2. A Draft with only a title cannot be published: its page and the Events list name a start and a position as missing, and after a start is saved, the position alone. No User is told.            |

The site is the image `admin/Dockerfile` builds for Production, with the build arguments of the release and the main
server of the stack. `compose.admin-ui.test.yaml` adds it over `compose.yaml` and `compose.test.yaml`, under the same
project name, `snu-now-flow-tests`, so run `pnpm test` and `pnpm test:admin-ui` one after the other, never at once. The
journeys use the flows' Users, socket waits and empty state. The browser opens the site at `http://localhost:<port>`,
whose `Secure` cookies Chromium keeps over plain HTTP, in the time zone `America/Los_Angeles`, so that a time read in
the browser's zone instead of Seoul's fails. It accepts the site's `window.confirm` questions.

Install the browser once, after `pnpm install`, which downloads none:

```bash
pnpm exec playwright install chromium
pnpm test:admin-ui
```

Neither `pnpm test` nor CI runs these journeys, so neither builds the admin image or needs a browser. Run them after
changing the admin site, its Server Actions or the main server's Administrator routes.

Google's sign-in is replaced only in the browser: a route handler answers `https://accounts.google.com/gsi/client` with
the stand-in of `test/admin-ui/google.ts`, which defines `google.accounts.id.initialize` and `renderButton` as the
sign-in page uses them. Its button hands the page an ID token of the stack's Administrator, `admin@flow-tests.example`,
signed with the run's key, so the sign-in page, its Server Action, the cookie and the main server's check of the token
run as they do for a person. Every other request the browser makes to a host other than the site's is aborted and fails
the test.

A run writes Vitest's JUnit report to `admin-ui-results/junit.xml`, and for a failed test a screenshot and a Playwright
trace (`pnpm exec playwright show-trace <file>`) to `admin-ui-results/failures/`, which the next run empties. Git
ignores `admin-ui-results/`.

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

Google Identity Services, the script of the admin site's sign-in page, is loaded by the browser, not on the stack's
network. In `pnpm test:admin-ui` the browser's route handler answers it with the stand-in described above.

## Empty state

Before each test, the main and match databases are emptied of everything but the seed (Places, the shuttle's route and
stops), the Administrators and the migrations, and Redis is emptied. This is the only time the tests reach a database
or Redis, through `docker compose exec`.

## Checks

| Command              | Checks                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| `pnpm lint`          | oxlint with type-aware rules, and that each test file names its level      |
| `pnpm format:check`  | Prettier formatting (`pnpm format` fixes it)                               |
| `pnpm typecheck`     | TypeScript in strict mode                                                  |
| `pnpm test`          | The flows, on the test stack                                               |
| `pnpm test:admin-ui` | The admin site in a browser, on the test stack with the admin site over it |

## Folder layout

```
flow-tests/
├── compose.test.yaml              # the test stack over compose.yaml
├── compose.deploy.test.yaml       # the deployment stack's proxy on a free loopback port
├── compose.admin-ui.test.yaml     # the admin site over the test stack, for pnpm test:admin-ui
├── sources/serve.ts               # Google, the Sources and Kakao, from saved pages
└── test/
    ├── admin-ui/                  # pnpm test:admin-ui: its Vitest configuration, global setup, browser and journeys
    │   └── google.ts              # the stand-in for Google's sign-in script
    ├── *.e2e.test.ts              # the end-to-end tests: the flows of the table above, and the one below
    ├── deploy-stack.e2e.test.ts   # the Dev Server's stack, called through its proxy
    ├── stack.integration.test.ts  # tests the harness: a stack of its own project, Compose files and settings
    ├── global-setup.ts            # writes the settings, starts and removes the test stack
    ├── setup.ts                   # empties the state before each test
    ├── settings.ts                # a stack's settings file, with keys and tokens made afresh
    ├── stack.ts                   # docker compose on a stack, the empty state and a Collection by hand
    ├── people.ts                  # Users with the app open, and the Administrator
    ├── caller.ts                  # calls to the main server and Google ID tokens
    ├── inbox.ts                   # what the socket pushes, and bounded waits for it
    ├── answers.ts                 # what the flows read from the answers
    └── campus.ts                  # positions on and off campus, and times
```
