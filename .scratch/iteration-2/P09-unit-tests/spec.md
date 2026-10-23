# P09: Unit tests, and test levels that can be run and measured apart

Status: ready-for-agent

## Problem Statement

The schedule's P9 asks for unit tests, P10 for integration tests and P11 for end-to-end tests. Today the code cannot tell the three apart.

- Every server test file is named `*.e2e-spec.ts` (127 in main-server, 11 in match-server, 6 in socket-server, 12 in worker-server), and each server's `vitest.config.ts` includes only that pattern; main-server's project is named `e2e`. NestJS uses that name for tests that start the application, and most of them do, but not all. So nobody can run or measure the unit tests alone.
- Sorted by what they really do (ADR 0007), about 487 of the 3,295 tests are unit tests, and most of main-server's check the AI benchmark's harness in `eval/`, not `src/`.
- admin has no unit tests: its page tests render whole pages against a fake main server, its site tests run against a build of the site, and its `package.json` has no coverage provider.
- mobile's unit tests alone cover about 30% of its statements, against 93.6% for the whole suite.
- No package has a coverage block. By default Vitest counts only the files a test loaded, plus test helpers and generated code: worker-server shows 98.8% that way, against 93.8% for `src/` alone.
- NestJS needs `emitDecoratorMetadata`, whose emitted type checks have a side that never runs. V8 counts each as a branch, so main-server's controllers show about 52% branches.
- 45 tests start a whole server only to check its settings schema, a pure zod object: 22 in main-server, 9 in match-server, 8 in socket-server and 6 in worker-server.
- main-server, match-server and socket-server start their containers (PostgreSQL, Redis) from the root config's global setup, and Vitest 4.1 always runs the root project's global setup, so even a pure test needs Docker.
- Some risky pure logic is reached only through a started server: the match round's handling of requests withdrawn during a round, the socket server's access-token checks, and the admin site's check of the path it follows after sign-in.

## Solution

One foundation change lands first. Every test file is renamed in place to the level it has today (`.unit.test.ts(x)`, `.integration.test.ts(x)` or `.e2e.test.ts`, ADR 0007). Every package except flow-tests gets the same scripts, and `test:unit` runs with Docker stopped. A check in `pnpm lint` fails when a test file has no level suffix or two. Every package gets a coverage block that counts all of `src/` and leaves out generated code.

On that base, P09 adds unit tests by risk, not to fill coverage: the four settings schemas, the round's split of requests and the placement of requests, the socket server's token check, the main server's reading of a Global Event's place and its geometry, three admin modules, and the app's Session renewal, answer checks and a few pure adapters. Pure logic is pulled out of services without changing what it does.

The coverage goals are declared here and merged before the official measurement. The Wiki draft's original goals are quoted unchanged, and new rows are added beside them. The measurement runs once, at the final commit after all P9 to P11 work has merged, on one Mac with every version recorded, and its numbers go into this spec's Results section.

## User Stories

1. As a developer, I want `pnpm test:unit` to run only the unit tests, with Docker stopped, so that I check pure logic in seconds.
2. As a developer, I want `pnpm test:integration` to run only the integration tests with the containers they need, so that I can run the slow level on its own.
3. As a developer, I want `pnpm test` to keep running everything it runs today, plus the new unit tests, so that CI and my habits stay as they are.
4. As a developer, I want a test file's name to say its level, by one rule based on what the test starts, so that I file a new test the way a teammate would.
5. As a developer, I want the rename to keep every import and each file's history, so that `git log --follow` and `git blame` still work.
6. As a developer, I want `pnpm lint` to fail when a test file has no level suffix or two, so that a test added under an old name cannot silently stop running.
7. As a teammate with an open pull request, I want to know how my new test files get their names, so that my branch still runs all its tests after the rename.
8. As the person who measures coverage, I want `pnpm test:cov` and `pnpm test:cov:unit`, counting every file under `src/` and leaving out generated code, type declarations, test support and configuration, so that whole-suite and unit-only coverage each come from one command and an untested file shows 0%.
9. As the person who measures coverage, I want admin to have a coverage provider and one exact Node version pinned, so that someone else can repeat the measurement.
10. As a team, I want the goals declared and merged before the official measurement, with the Wiki draft's original goals quoted unchanged, so that nobody fits a goal to the results.
11. As a reader of the results, I want unit-only coverage beside whole-suite coverage, the decorator artefact explained, and the tests of test tooling counted apart, so that I read each figure for what it is.
12. As a developer, I want each server's settings schema tested as a unit with boundary tables, keeping one start-up refusal test per server, so that each refused setting is checked without starting a server 45 times.
13. As a developer, I want the round's split of requests withdrawn during a round, and the placement of waiting requests into Open Quests, tested as units, so that a withdrawn request is never placed and the earliest Quest takes the earliest requests.
14. As a developer, I want the socket server's access-token check tested with a real `JwtService`, each refused token differing from a valid one in one property, so that each check is shown to refuse on its own.
15. As a developer, I want the main server's reading of a Global Event's place text, and its geometry, tested as units, so that a Global Event is never published at the wrong Place.
16. As an Administrator, I want the sign-in to follow only a path of the admin site, so that a crafted link cannot send me to another site.
17. As a developer, I want the admin site's main-server client and health answer tested as units, so that failures are always reported the same way.
18. As a User, I want my access token renewed and my Session kept, or my Session ended, correctly when the token expires, so that a dropped network does not sign me out and a refused renewal does not leave me signed in.
19. As a developer, I want the app's checks of the main server's answers and the least-covered pure adapters tested as units, so that a malformed answer is refused and what a screen shows is checked without rendering the whole app.
20. As a reviewer, I want every new unit test file to state its partitions and where its expected values come from, so that I can check the expectations against their source.

## Implementation Decisions

### The levels

- Unit, integration and end-to-end, defined by what a test starts (ADR 0007, `docs/adr/0007-test-levels-by-what-a-test-starts.md`, committed with this spec). The ADR's first paragraph is the rule; in short:
  - **Unit**: one module called directly; collaborators are our own pure code, stand-ins, or in-process libraries that behave the same on every run (zod, `JwtService`, the React renderer, a QueryClient without retries); no I/O; none of our runtimes started; saved files may be read; `Test.createTestingModule` for one provider with stand-ins is allowed. Route entry files (mobile `src/app/**`, admin `src/app/**/page.tsx`) are never unit targets. A screen component is a unit only when every hook and data source it uses is a stand-in.
  - **Integration**: joins two or more of our layers, or crosses a real boundary (a database container, HTTP through a started server, the app's router over a fake server). The app on an emulator against its own mock data is integration.
  - **End-to-end**: the whole system driven from outside, through a screen or through the servers' public HTTP and socket interfaces (`flow-tests/`).

### The foundation change

It lands before the test work built on it, because it touches almost every test file. It follows P10's event-flow fix, which merges first.

**Rename.** Each file is renamed in place with `git mv`, so no import changes, and is named after what it does today.

| Package | Today | After |
|---|---|---|
| main-server, match-server, socket-server, worker-server | `test/*.e2e-spec.ts` | `test/*.unit.test.ts` or `test/*.integration.test.ts` |
| admin | `__tests__/*.test.tsx`, `__tests__/site/*.test.ts` | `.integration.test.tsx`, `.integration.test.ts`; none is a unit test today |
| mobile | `__tests__/**/*-test.ts(x)` | `.unit.test.ts(x)` or `.integration.test.ts(x)` |
| flow-tests | `test/*.flow.ts` | `test/*.e2e.test.ts`; the harness's self-test (`stack`) becomes `.integration.test.ts` |

Support files (helpers, saved pages, recorded answers, `test/start-app.ts` and the like) keep their names. The pull request's review checks each file's level.

**Projects and scripts.** Each server and admin has a Vitest project named `unit` and one or more projects whose names start with `integration`; mobile's Jest config has projects `unit` and `integration`. Each selects its files by suffix.

| Script | Vitest packages (servers, admin) | mobile (Jest) |
|---|---|---|
| `test` | `vitest run` (every project) | `jest` (both projects) |
| `test:unit` | `vitest run --project unit` | `jest --selectProjects unit` |
| `test:integration` | `vitest run --project 'integration*'` | `jest --selectProjects integration` |
| `test:cov:unit` | `vitest run --project unit --coverage` | `jest --selectProjects unit --coverage` |
| `test:cov` | `vitest run --coverage` | `jest --coverage` |

- flow-tests keeps `test` only. P11 adds `test:admin-ui` to flow-tests and `build:mock-apk` and `test:device` to mobile; none of them is part of `pnpm test`.
- admin's `pages` and `site` projects become `integration-pages` and `integration-site`, and admin gets a new `unit` project in Node.
- CI keeps running `pnpm test`, which runs everything it runs today plus the new unit tests (and mobile's four shards keep `--shard`). No workflow file changes.

**Containers only for integration.** Each server's global setup moves from the root config into its `integration` project: main-server starts PostgreSQL and Redis, match-server PostgreSQL, socket-server Redis; worker-server's setup, which only provides settings, moves the same way. The `unit` project has no global setup, so `pnpm test:unit` runs with Docker stopped. main-server's `store-contract` project joins the integration level as `integration-store-contract`, keeps its later sequence group, and starts its own Redis container, since a project's global setup provides values to that project only. That file's content changes, so it gets a box-comment row.

**The level check.** A small dependency-free script, `scripts/check-test-levels.ts` at the repository root, run with Node's own TypeScript support and called by each package's `pnpm lint` on that package's files, so CI runs it with no workflow change.

- In a test folder (`test/`, `__tests__/`), every file that declares a test (`describe`, `it` or `test`) must carry exactly one level suffix. A file with a level suffix outside a test folder fails too. Support files that declare no test need no suffix. The check names each file that fails.
- `main-server/eval/` is not a test folder; the benchmark's `*.eval.ts` runs only under `pnpm eval` (P19).
- oxlint's `vitest/consistent-test-filename` was considered; it judges a file by its name alone, so it cannot tell a helper in `test/` from a test that has lost its suffix.
- The pull request shows the check passing on the renamed tree and failing on a test file planted under an old name.

**Coverage configuration**, in every package except flow-tests, which runs the servers' built images:

- Vitest (the four servers and admin): provider `v8`; include `src/**/*.{ts,tsx}`; exclude `src/generated/**` and `**/*.d.ts`; reporters `text-summary`, `json-summary`, `html`, `lcov`; `reportOnFailure: true`. Test support and configuration sit outside `src/`.
- admin adds `@vitest/coverage-v8` 4.1.x, matching its Vitest `~4.1.11`.
- Jest (mobile): `coverageProvider: 'babel'` (Istanbul); `collectCoverageFrom` `src/**/*.{ts,tsx}` without `*.d.ts`; the same four reporters. mobile's `.gitignore` gains `/coverage`.
- No `thresholds` in any config.

**The Node pin.** `.nvmrc` goes from `24` to one exact `24.x.y`, the version on the measurement Mac. CI reads `.nvmrc` through `node-version-file`, so CI runs the same version.

**Documentation.**

- The servers' READMEs keep `--no-spec` in their "add a module" steps but drop the reason: main-server's and match-server's say "because this project tests through HTTP", socket-server's "through the running server"; worker-server's gives none. The new reason: tests live in `test/`, named by level, and pure logic gets a unit test there.
- Every README line that names a test file by its old name, or describes admin's old `pages` and `site` projects, is updated. The root README's test table says that `pnpm test:unit` needs no Docker.
- `CLAUDE.md` and `AGENTS.md` each gain the same line in "AI-generated code markers": "A file that is only renamed, its content unchanged, gets no new row."

**Open pull requests.** P10's event-flow fix merges before the rename. P20's #118 to #122 change mobile tests; each merges before the rename, or rebases after it and renames its new test files. The level check fails any file still under an old name.

**Tests of test tooling.** main-server's tests of the AI benchmark (`test/eval-*`) and flow-tests' harness self-test carry level suffixes and run in `pnpm test` as before. The Results count them on their own line, outside the product's counts. flow-tests' Dev Server stack check (`deploy-stack`) becomes `.e2e.test.ts` and counts among flow-tests' end-to-end tests; it is not one of P11's journeys.

### Unit tests, chosen by risk

A unit test is added where a pure rule's fault would be silent or costly and only a started server reaches it today. Code the integration tests already cover well gets no unit test for its own sake. New logic gets a unit test; this sentence is checked in the normal review, not by a rule file.

**(a) Settings schemas.**

- The 45 tests that start a server to check its schema become unit tests of each server's exported `settingsSchema`, with boundary tables: `PORT` missing, `abc`, 0, 1, 65535, 65536; tokens of 31 and 32 characters; `ROUND_INTERVAL_SECONDS` missing, 0, 1, 1.5; the Assistant's counts at their defaults, 0 and 1; a PEM header of the wrong kind, a key on the wrong curve, a private and public key that do not match; the app's and admin's Google client IDs being equal; an email list with the wrong separator; a SHA-1 fingerprint where SHA-256 is expected; `PUBLIC_URL` with and without a trailing slash.
- Each test asserts that the refusal names the setting. Expected values come from each server's `.env.example` and README.
- One start-up refusal integration test stays per server. The startup tests for a database or Redis that cannot be reached stay as they are.

**(b) match-server.**

- The round's split of the waiting requests into those still locked and those still standing (`src/matching/round.service.ts`, lines 85–91) becomes a pure exported function; the `FOR UPDATE` query stays in the service. Cases: a request withdrawn while the main server answered is left as it is, neither expired nor placed; a waiting request that no longer stands is expired; a standing request goes to placement; one User's requests for two Global Events are told apart; an empty round.
- The extraction lands only after P10's new rounds test, "a request withdrawn while the main server answers which requests stand is left withdrawn, and the other is grouped with no one", has merged. No existing test guards the split: with it removed, all match-server tests pass.
- Placement's `assign` is already pure. It is exported unchanged and unit-tested: the oldest Quest first, a tie on age broken by id; a Holder's own request skipped; free places as the cap; pools by Global Event and size. The existing rounds, placements and matching-withdrawal integration tests guard it.

**(c) socket-server.**

- The verify options (ES256 only, the app's audience) and the payload check (`sub`, `sid`, `exp`) move out of `UsersModule`'s factory and the gateway's private method into one exported module that both use. Behaviour is unchanged. The move lands only after P10's fix of the socket refusal tests, which then guard it.
- Tested with a real `JwtService` and keys made in the test. A good token gives the User, the Session and the expiry. Every refused token is the test's valid token with exactly one property changed: an expiry in the past (signed so, not waited for), another key, HS256, the admin site's audience `snu-now-admin`, no `sid`, no `sub`; and a value that is not a string.
- The connection tests stay integration tests.

**(d) main-server.**

- `namedPlace` (`src/global-events/named-place.ts`) is tested on the Places seed, read from its file, with place texts taken from the worker's saved event pages: a Place's name with its building number; a number alone; another campus, a hospital or a station; a street address other than the campus's own; an online event; several places in one text; a campus name glued to a building name.
- `src/common/geometry.ts` (`metresBetween`, `encloses`, `metresToRing`) is tested on distances worked out independently, and on simple rings: inside, outside, on an edge and on a corner.

**(e) admin.**

- The main-server client's `request()`, through `mainServer`'s exported calls with `fetch` stubbed: no `MAIN_SERVER_URL`; a refusal with a JSON body; a refusal whose body is not JSON; 204 giving nothing; the token, content type and Idempotency-Key headers sent only when given; a rejecting `fetch` passed on to the caller.
- The sign-in's path check, `sitePath`, is a private function of `src/app/sign-in/actions.ts`, a `'use server'` file that may export only async functions, so it moves unchanged to a plain module. It is tested on open-redirect variants: an absolute URL, `//host`, `/\host`, a tab or newline inside the path, an encoded slash, a value that is not a string, and the empty value. A path of the site keeps its query.
- `healthAnswer`: all checks up gives 200 `ok`; one check down gives 503 `error` with that check under `error`; no checks gives 200; the answer always carries `no-store`.

**(f) mobile.**

- `src/api/server/http.ts`, with `fetch` stubbed and the token store and Session events as stand-ins, on the three renewal cases no test covers: with no refresh token, the Session ends; with a malformed renewal answer, the Session ends; on a network error during renewal, the error is thrown and the Session is kept. The shared renewal, a second 401, `SESSION_REPLACED` and `ONBOARDING_REQUIRED` are already covered by `__tests__/api/server-session`.
- `src/api/server/answers.ts`: each guard accepts the answer shape the main server's README documents, refuses each field missing or of the wrong type, and accepts null only where null is allowed.
- An adapter is pure when its functions take data and return data, with no I/O, hooks or timers; a module it imports that reaches a native module is allowed, since jest-expo stands in for native modules. At least the events, dining and room adapters, then the rest in order of unit-only coverage in the foundation's first report.

### Isolation

- No Prisma doubles. Pure logic is extracted from a service without changing its behaviour, under the integration tests (and, for the match round and the socket token check, P10's tests).
- Rules that live in SQL, row locks and TTLs stay integration tests: the visibility rules, the round's advisory lock and `FOR UPDATE`, Redis expiries.
- New tests use no real-time waits: fake timers or an injected clock. main-server's `CLOCK` is provided only by the quests module (the Assistant uses it too), so an extracted function that needs the time takes it as an argument.
- Unit tests stub `fetch`, never reach the network, read saved files and never write any.

### Test design for new unit test files

- **Testing strategy comment.** One or two lines at the top, below the box comment, naming the partitions and where the expected values come from: ticket criteria, user stories, GLOSSARY, ADRs, a README or `.env.example`, or recorded real answers.
- **Boundary tables.** `it.each` wherever a threshold exists: MIN−1, MIN, MAX, MAX+1, and empty or null where the input can be.
- **Names.** `describe(subject)` with `it('condition → result')`, in GLOSSARY terms, the lecture's subject_input_result naming.
- **Shape.** Arrange, Act, Assert, one behaviour per test. Property-based tests or state-transition tables only where they fit.

### Coverage goals

Declared before the official measurement. Every figure is a percentage of the files named.

**Original goals, from the Wiki draft (fixed 2026-10-22), all on the whole suite. Figures and file sets unchanged; the Wiki gives the reasons.**

| Component | Lines | Branches |
|---|---|---|
| main-server | ≥ 90 % | ≥ 80 % |
| match-server, socket-server, worker-server | ≥ 85 % | ≥ 75 % |
| admin | ≥ 70 % | — |
| mobile: logic (`src/api`, `src/features`) | ≥ 80 % | — |
| mobile: UI (`src/screens`, `src/design-system`) | ≥ 60 % | — |
| mobile overall | ≥ 70 % | — |
| flow-tests | every flow passes | — |

**Added rows.**

| File set | Target | Why |
|---|---|---|
| Servers' services, controllers, gateways, collectors and guards (`src/**/*.{service,controller,gateway,collector,guard}.ts`), whole suite | The component's own target above; controllers' branch figure not targeted | They hold the rules and the wiring every request passes through. Controllers' branches are mostly the decorator artefact. |
| Servers' entry points, seeds and command-line scripts: main-server `src/{main,seed,demo-seed,demo-walk,load-seed}.ts`, match-server and socket-server `src/main.ts`, worker-server `src/{main,collect,collect-sources,demo-menus}.ts` | Reported only | No test starts a process. |
| admin overall, whole suite | Branches ≥ 70 % | The admin site's rules are in its branches (refusals, states). |
| mobile I/O wrappers (`src/position/**`, `src/live/**`), whole suite | Lines ≥ 85 %, branches ≥ 70 % | They wrap the location service and the socket, where a fault is silent on a phone. |
| mobile in-app mock (`src/api/mock/**`), route files (`src/app/**`), catalogue (`src/catalogue/**`) | Reported only | Test data, route entries and a development screen. |
| P11's end-to-end journeys (A1, A2, W1, W2) | Every journey passes | They drive the system as a User or an Administrator would. |
| P11's device runs (M1, M2), integration | Every flow passes | The app on a device against its own mock data. |

**Unit-only coverage, reported with no target:** servers' logic (`src/**/*.ts` without `**/*.{controller,service,gateway,module,collector,guard,interceptor,filter}.ts`, the entry files above, `**/*.seed.ts`, `src/demo/**` and `src/generated/**`); admin's modules outside the route tree; mobile logic (`src/features`, `src/auth`, `src/session`, `src/storage`, `src/hooks`); mobile API client (`src/api` without `src/api/mock`); mobile design-system and map components (`src/design-system`, `src/map`).

**Reporting.** Statements, branches, functions and lines, unit-only and whole suite, for each component and file set. A note that `emitDecoratorMetadata` lowers branch figures on decorated class lines, and that V8 (Vitest) and Istanbul (Jest) count branches differently.

### The official measurement

- Once, at the final commit of `2.0/Main` after all P9, P10 and P11 work has merged, on the measurement Mac (an Apple Silicon Mac; its model, chip and memory recorded).
- It records macOS, Node (the pinned version), pnpm 12.6.0, Docker, Java, Playwright and its Chromium build, Maestro, the emulator and its system image, and each command as typed.
- It runs `pnpm test:cov:unit` and `pnpm test:cov` in every package except flow-tests; `pnpm test` and `pnpm test:admin-ui` in flow-tests; `pnpm build:mock-apk` and `pnpm test:device` in mobile.
- The numbers go into the Results section below.

## Testing Decisions

- **A good test** checks behaviour through a public interface (an exported function, a schema, a module's exported calls) and still passes after a refactor that keeps the behaviour. Its expected values come from a source independent of the code under test: a README, `.env.example`, GLOSSARY, an ADR, a ticket's criteria, or recorded real answers, never copied from what the code returns.
- **RIP**: a test must reach the fault, let it infect the state, and propagate it to an assertion, so each boundary case asserts the visible result (the refused setting's name, the request left alone), not only that nothing threw.
- **FIRST**: fast (no container in a unit test), independent (each test builds its own input), repeatable (no real clock, network or timers), self-validating, timely (in the same pull request as the change).
- **Checks of the foundation change.** Each package passes the same number of tests before and after the rename. In every package except flow-tests, `test:unit` and `test:integration` together run exactly the tests `test` runs. `pnpm test:unit` passes in each server with Docker stopped.
- **Modules tested.** The settings schemas of the four servers; match-server's round split and `assign`; socket-server's token check; main-server's `namedPlace` and geometry; admin's main-server client, path check and health answer; mobile's `http.ts`, `answers.ts` and the pure adapters above.
- **Prior art.** worker-server's parser tests on saved pages (the `*-parser` files with `test/pages/`); match-server's grouping test, which calls `HashtagGrouping` directly (`test/grouping`); mobile's design-system tests (`__tests__/design-system/`); main-server's benchmark scorer tests on hand-made traces (`test/eval-*`).

## Out of Scope

- P10's integration tests and P11's end-to-end tests and device runs, apart from the rename, which covers their files too.
- Unit tests for code the integration tests already cover well, and rewriting existing tests. mobile's Jest renders of the whole app stay unchanged, as its local UI integration layer.
- Changes to CI workflows, branch rulesets or the review rules, and coverage thresholds in config.
- infra's bats tests and manifest checks, which keep their names and are outside the level scripts.
- main-server's benchmark run (`pnpm eval`).

## Further Notes

- Moving the services to repository ports with in-memory fakes (Testing I, p. 38) may be considered later; it would let more service logic be tested as units without Prisma doubles. This spec extracts pure functions instead and leaves the database to the integration tests.
- The survey figures come from a file-by-file survey (about 487 unit tests of 3,295) and local coverage runs (about 30% unit-only statements in mobile, about 52% branches in main-server's controllers) at fe5be351 on 2026-10-22. They are approximate, and the official measurement replaces them.

## Results

To be filled in after the official measurement:

- Date and time (KST), and the commit on `2.0/Main`.
- The measurement Mac and the versions listed above.
- The commands, as typed in each package.
- For each component and file set in the coverage goals: the target, then statements, branches, functions and lines, unit-only and whole suite, and whether the target is met.
- Test counts per level for each package (unit, integration, end-to-end), with the tooling tests on their own line.
- Each P11 journey: passed or failed, and its duration. A1, A2, W1 and W2 on the end-to-end line; M1 and M2 on the integration line as device runs, apart from mobile's Jest counts (mobile's `test:integration` does not run them).
- Passed, failed and skipped for each package, with the reason for any failure.
