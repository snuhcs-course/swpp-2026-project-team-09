# 01: The three flows across the servers

Parent: [P16 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A project of its own at the repository root, `flow-tests/`, whose `pnpm test` starts the four servers as built, with a
real PostgreSQL and a real Redis, and runs the three demo flows through the servers' public interfaces: HTTP to the main
server and a Socket.IO connection to the socket server, as the app would. Nothing outside the repository is called:
Google's token verification, the pages and endpoints the worker collects from and Kakao's walking route API are replaced
at their boundary, by a small server that answers in their place with saved pages and answers.

Each test reads like the demo script: named Users act one after the other, with a check after each step. Each starts
from an empty state, and a failure names the step and the server's answer.

## Acceptance criteria

### The stack

- [x] `pnpm test` in `flow-tests/` starts `compose.yaml` with `flow-tests/compose.test.yaml` under a Compose project of
      its own, so that a developer's running stack, its ports and its volumes are left alone, waits until every server
      is ready, runs the flows and removes the stack with its volumes.
- [x] The stack takes no setting from the projects' `.env` files: the test stack's settings are its own, the secrets
      and keys made afresh for each run.
- [x] The outside services are replaced at their boundary, with no change to how a server reaches them: Google's keys
      for ID tokens, the Co-op's and the dormitory's menu pages, the shuttle operator's route page and vehicle
      positions, and Kakao's walking route API are answered from the saved pages and answers of the servers' own tests.
- [x] The match server runs its rounds every second.
- [x] Before each test the main and match databases are emptied of everything but the seed and the Administrators, and
      Redis is emptied. No test reads a database or Redis otherwise.
- [x] A wait for a pushed message is bounded and says what it waited for. A check that something is not delivered
      waits a short window.

### Flow 1, event

- [x] A Google account outside SNU is refused.
- [x] Two Users sign in; an Administrator creates and publishes a Global Event through `/admin/global-events`.
- [x] Both ask for Matching with size 2; after a round of the match server both are told and hold the same Shared
      Quest.
- [x] One opens the Party of the Quest; a second Party for the same Quest is refused; the other, a Holder, enters at
      once.
- [x] Both turn the Master Switch on and upload positions inside the Campus Boundary, and each receives the other's
      over the socket.
- [x] A walking route to the event's place is returned.
- [x] A Master Switch turned off removes the User at once and stops delivery both ways.

### Flow 2, Friend

- [x] A User creates an Invite Link; a second User reads and accepts it, and both are told.
- [x] Both turn the Master Switch on, and each receives the other's position.
- [x] A position outside the Campus Boundary is never delivered and removes the User's Avatar.
- [x] A friendship's switch turned off stops delivery both ways.
- [x] One proposes a Meetup; the other accepts; both hold the same Shared Quest.
- [x] The friendship is ended, and positions stop.

### Flow 3, campus services

- [x] The worker collects the Co-op's and the dormitory's menus and the shuttle's stops and vehicles from the saved
      pages, by hand.
- [x] The main server serves today's menus, and a shuttle vehicle at its stop, through the route and over the socket.

### The rest

- [x] The match server's request for a Quest repeated after the main server was stopped and started: covered, or
      recorded below as not covered with the reason.
- [x] `flow-tests/README.md` says how to run the flows, what each covers and what is replaced.
- [x] A CI job runs the flow tests with the project's lint, format and type checks.
- [x] The flows pass on a real run, and the four checks of `flow-tests` pass.

## Comments

### Decisions (2026-10-06)

- **No server changes.** The outside services are replaced on the stack's network instead of through a setting: the
  `sources` container (`flow-tests/sources/serve.ts`, run by Node from the mounted file) has the services' host names
  as Compose network aliases, `www.googleapis.com`, `snuco.snu.ac.kr`, `snudorm.snu.ac.kr`, `vet.snu.ac.kr`,
  `www.snu.ac.kr`, `web.busin.co.kr` and `dapi.kakao.com`, and serves HTTPS with a certificate made by `openssl` for
  each run, which the main and worker servers trust through `NODE_EXTRA_CA_CERTS`. So the built main server checks ID
  tokens with its own `GoogleAuthLibraryVerifier`, against the key the sources container serves at
  `/oauth2/v1/certs`, and needs no test verifier or setting; the worker and the walking route reach the addresses their
  code names.
- **Compose**: `docker compose -p snu-now-flow-tests --env-file flow-tests/.stack/compose.env -f compose.yaml -f
  flow-tests/compose.test.yaml`, run with `spawn` from the tests (not testcontainers), so the README's command and the
  tests' are the same. `env_file: !reset []` on every server, `ports: !reset []` on the stores, the worker and the match
  server, and `127.0.0.1::3000` and `127.0.0.1::3001` read back with `docker compose port`. The global setup removes a
  stack left by an interrupted run before `up --build --wait`, since its containers would keep the files they started
  with, and prints the last 100 log lines when `up` fails.
- **Keys and secrets** are made in the global setup into `flow-tests/.stack/` (git-ignored): the ES256 pair for access
  tokens, a Google RSA pair whose private key reaches the tests through `provide`, `WORKER_TOKEN` and
  `MATCH_SERVER_TOKEN`. `compose.env` writes the PEM keys in double quotes with `\n`, which Compose expands.
- **Saved pages**: a menu page asked for any day is the saved page of 2026-10-01 with that date written in, so the
  parser's date check passes. The veterinary page is not served (404) and not collected: it would need its week moved
  as `worker-server/src/menu/saved-menus.ts` does. The worker's own schedule keeps running in the stack and only records
  failed Collections for what is not served.
- **Empty state**: `TRUNCATE … CASCADE` of every table of `public` in both databases but `_prisma_migrations`,
  `spatial_ref_sys` and, in `main`, `places`, `shuttle_routes`, `shuttle_stops` and `administrators` (the initial
  Administrator is registered only at startup), and `FLUSHALL` on Redis, each through `docker compose exec`.
- **Waits**: a pushed message is waited for up to 10 s (15 s for the match), and a message that must not come for
  1.5 s. The inbox takes the matched message and every one before it, so a later wait sees only later messages.
  Answers and payloads are read with zod schemas, so a changed shape fails with the call that answered it.
- **Not covered: the match server's repeat after the main server was stopped and started.** A round asks the main
  server which requests stand before it forms a match, so the main server would have to stop between that question
  and the request for the Quest, which Compose cannot time. `match-server/test/match-quests.e2e-spec.ts` covers the
  repeat against a stub.
- **CI**: `flow-tests` joins the matrix of the `check` job, which runs its lint, format, type checks and `pnpm test`.
- **Run** three times on 2026-10-06, all three flows passing; the stack was gone after each (`docker compose ls -a`).
  The servers' own suites were not run for this ticket.

### Agent usage (2026-10-06)

- Agent time: about 35 minutes, an estimate: one agent that wrote the ticket and implemented it, including three runs
  of the flows.
- Tokens, counted from the agent's transcript shortly before the commit:
  - Input: about 16,700,000, of which about 16,400,000 were cache reads, 250,000 cache writes and fewer than 200
    uncached.
  - Output: about 6,600 recorded, a lower bound, since the transcript records only part of the output of most steps.
