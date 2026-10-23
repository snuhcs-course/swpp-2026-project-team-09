---
status: accepted
---

# A test's level follows what it starts, and its file name says the level

Every automated test is a unit, integration or end-to-end test, the course's three scopes. A unit test calls one module of ours, a function, class, hook or component, directly. What it depends on outside that module is our own pure code or a stand-in, it does no I/O (network, database, Redis, socket, real timers, file writes), and it starts none of our runtimes: no Nest application or module graph, no expo-router app, no Next page with its Server Actions. It may read saved files, and `Test.createTestingModule` may build one provider with stand-ins. Libraries that behave the same on every run and stay inside the test's process, such as zod, `JwtService`, the React renderer or a QueryClient without retries, may be real. Route entry files (the app's and the admin site's route files) are never unit targets, and a screen component is a unit only when every hook and data source it uses is a stand-in. An integration test joins two or more of our layers, or crosses a real boundary: a database container, HTTP through a started server, or the app's router over a fake server. An end-to-end test drives the whole system from outside, as a User or an Administrator would: through a screen (the admin site in a browser, the app on a device against the started servers) or through the servers' public HTTP and socket interfaces (`flow-tests/`). Outside services are replaced only at the network. The level is in the file name, `.unit.test.ts(x)`, `.integration.test.ts(x)` or `.e2e.test.ts`, and a Maestro flow's level is its folder, `mobile/maestro/integration/` or `mobile/maestro/e2e/`.

The servers' tests were all named `*.e2e-spec.ts`, NestJS's name for tests that start the application. By the course's definition they are integration tests, and some are unit tests. So unit and integration tests could be neither run nor measured apart, and the levels the Testing Documentation described did not match the code. A rule that looks only at what a test starts lets anyone file a new test at the same level.

## Considered Options

- **Unit, Integration and System**, as the Wiki's first draft had it. System is a level in the lecture's testing hierarchy and in the V-model, but the schedule and the lecture's scopes say end-to-end. End-to-end corresponds to system testing in that hierarchy.
- **The draft's rule**, under which a test is a unit test whenever only the boundaries are faked. A render of the whole app against a fake server would then be a unit test, although it tests the interfaces of many components.
- **Google's small, medium and large sizes**, which sort tests by the resources they use, not by the course's scopes.
- **`unit/` and `integration/` folders.** Moving over 300 test files changes their relative imports. Renaming the suffix in place keeps the imports and `git log --follow`.
- **Keeping the names and listing each file's level in the documentation**, which the next new test would leave out of date.

## Consequences

- The rename lands before the test work that is built on it, because it touches almost every test file.
- A test that starts the application only to check a pure rule, such as each server's settings schema, is named an integration test until it is rewritten as a unit test, with one start-up refusal test left for each server.
- The servers' READMEs no longer give testing through HTTP or through the running server as the reason modules are added with `--no-spec`: pure logic gets unit tests beside the tests that start the server.
- The app on an emulator against its own mock data is an integration test. Only a run against the started servers is end-to-end.
- Tests of the test tooling, such as the AI benchmark's harness and the flow-tests harness, carry level suffixes but are reported apart from the product's pyramid.
