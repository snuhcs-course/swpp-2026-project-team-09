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

- [ ] `pnpm test` in `flow-tests/` starts `compose.yaml` with `flow-tests/compose.test.yaml` under a Compose project of
      its own, so that a developer's running stack, its ports and its volumes are left alone, waits until every server
      is ready, runs the flows and removes the stack with its volumes.
- [ ] The stack takes no setting from the projects' `.env` files: the test stack's settings are its own, the secrets
      and keys made afresh for each run.
- [ ] The outside services are replaced at their boundary, with no change to how a server reaches them: Google's keys
      for ID tokens, the Co-op's and the dormitory's menu pages, the shuttle operator's route page and vehicle
      positions, and Kakao's walking route API are answered from the saved pages and answers of the servers' own tests.
- [ ] The match server runs its rounds every second.
- [ ] Before each test the main and match databases are emptied of everything but the seed and the Administrators, and
      Redis is emptied. No test reads a database or Redis otherwise.
- [ ] A wait for a pushed message is bounded and says what it waited for. A check that something is not delivered
      waits a short window.

### Flow 1, event

- [ ] A Google account outside SNU is refused.
- [ ] Two Users sign in; an Administrator creates and publishes a Global Event through `/admin/global-events`.
- [ ] Both ask for Matching with size 2; after a round of the match server both are told and hold the same Shared
      Quest.
- [ ] One opens the Party of the Quest; a second Party for the same Quest is refused; the other, a Holder, enters at
      once.
- [ ] Both turn the Master Switch on and upload positions inside the Campus Boundary, and each receives the other's
      over the socket.
- [ ] A walking route to the event's place is returned.
- [ ] A Master Switch turned off removes the User at once and stops delivery both ways.

### Flow 2, Friend

- [ ] A User creates an Invite Link; a second User reads and accepts it, and both are told.
- [ ] Both turn the Master Switch on, and each receives the other's position.
- [ ] A position outside the Campus Boundary is never delivered and removes the User's Avatar.
- [ ] A friendship's switch turned off stops delivery both ways.
- [ ] One proposes a Meetup; the other accepts; both hold the same Shared Quest.
- [ ] The friendship is ended, and positions stop.

### Flow 3, campus services

- [ ] The worker collects the Co-op's and the dormitory's menus and the shuttle's stops and vehicles from the saved
      pages, by hand.
- [ ] The main server serves today's menus, and a shuttle vehicle at its stop, through the route and over the socket.

### The rest

- [ ] The match server's request for a Quest repeated after the main server was stopped and started: covered, or
      recorded below as not covered with the reason.
- [ ] `flow-tests/README.md` says how to run the flows, what each covers and what is replaced.
- [ ] A CI job runs the flow tests with the project's lint, format and type checks.
- [ ] The flows pass on a real run, and the four checks of `flow-tests` pass.
