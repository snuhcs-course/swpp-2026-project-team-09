# 02: W1 and W2: the admin site in a browser against the flow stack

Parent: [P11 spec](../spec.md)
Status: resolved
Blocked by: P09-06 (flow-tests: flows named by level), P11-01 (A1 and A2: a Session replaced, and a Leader running a group, in flow-tests)
Touches: flow-tests only: a new Compose overlay, `test/admin-ui/` with its own Vitest configuration and support files, `people.ts`, `package.json` and the lockfile, `.gitignore`, the README. Not the admin site, the main server, the flow stack's Compose files or CI.
Needs a person: a go-ahead to download Playwright's Chromium once (`pnpm exec playwright install chromium`) when the work starts.

## What to build

`pnpm test:admin-ui` in `flow-tests` runs two end-to-end journeys through a screen: the admin site as Production builds it, inside the flow stack and against its real main server, driven by Playwright's headless Chromium under Vitest, so the tests use the harness's `inject` values, Users and inbox unchanged. W1 (US-ADMIN-01 scenario 1) has an Administrator sign in, create a Draft and publish it, and a connected User is then told and sees the Global Event. W2 (US-ADMIN-01 scenario 2) shows that a Draft without a start time or a position cannot be published, that the site names what is missing, and that no User is told. The steps are the spec's "W1 and W2: the browser and the steps".

The admin service comes from a Compose overlay over the flow stack, built from `admin/Dockerfile` with the build arguments and setting the spec gives (spec: "W1 and W2: the admin site in the flow stack"). Google's sign-in script is replaced only at the network: a route handler serves a stand-in that hands the page an ID token signed with the run's key, so the sign-in page, its Server Action, the cookie and the main server's token check run as they do for a person (spec: "W1 and W2: signing in"). Every other request the browser makes outside the site is aborted.

The command runs over `test/admin-ui/`, which P09-06's default configuration already excludes, so `pnpm test` and CI neither build the admin image nor need a browser. It follows P11-01, since both change the flow-tests harness (`people.ts`).

## Acceptance criteria

- [x] `flow-tests/compose.admin-ui.test.yaml` adds one `admin` service over `compose.yaml` and `compose.test.yaml` as the spec describes: built from `./admin` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID=flow-tests-admin.apps.googleusercontent.com` and an empty `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, `MAIN_SERVER_URL=http://main-server:3000`, port 3100 on a free loopback port, depending on a healthy main server, with a `node` health check of `/health/ready`; `startStack` builds, starts, waits for and removes it, under the flow stack's project name.
- [x] `playwright` is a dev dependency of `flow-tests` pinned at one exact version; `pnpm install` downloads no browser; only Chromium runs, headless.
- [x] `people.ts` exports `administratorIdToken()`, and both `signInAsAdministrator()` and the stand-in use it.
- [x] A route handler answers `https://accounts.google.com/gsi/client` with a stand-in defining `google.accounts.id.initialize` and `renderButton` as the site uses them; its button calls the page's callback with the Administrator's (`admin@flow-tests.example`) ID token from `googleIdToken()`. A second handler aborts every request to a host other than the site's, and an aborted request fails the test.
- [x] The browser context runs in `America/Los_Angeles`, opens the site at `http://localhost:<published port>` and accepts `window.confirm`; locators find elements by role and visible text, every assertion waits on a condition, and nothing sleeps for a fixed time.
- [x] W1 passes: the Administrator is sent to sign-in and, after the stand-in's button, lands on the Events page; A's list of Global Events is empty after the Draft is created; after "Publish" is confirmed the page shows the event as published, A receives `global-events-changed` and `GET /global-events` lists one event with the title, the position and the start and end instants typed, the instants converted by the test from the Seoul times typed.
- [x] W2 passes: a title-only Draft's page names a start and a position as missing with "Publish" disabled, and the Events list's "Still needs" names the same two; after a start is added and saved, both name only the position; A receives no `global-events-changed` and its list stays empty.
- [x] `pnpm test:admin-ui` runs a second Vitest configuration over `flow-tests/test/admin-ui/`, whose global setup is the flow stack's with the overlay added and the site's address provided and whose setup file is the flow stack's own; its support files declare no test and pass the level check; `pnpm test` runs neither journey.
- [x] A run writes Vitest's JUnit report, and on a failure a screenshot and a Playwright trace, into a results folder git ignores.
- [x] `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` in `flow-tests` pass; no product code, admin test, existing flow or CI workflow changes.
- [x] `flow-tests/README.md` gains a section on the admin site in a browser (the command, the Chromium install, what the stand-in replaces) and lists Google Identity Services under "What is replaced".
- [x] Every new source file starts with the AI-generated box (`#` for the overlay), each changed source file gets a new row (`CLAUDE.md`), and the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **Files.** The overlay is `flow-tests/compose.admin-ui.test.yaml`. `flow-tests/test/admin-ui/` holds the Vitest
  configuration (`vitest.config.ts`, run by `"test:admin-ui": "vitest run --config test/admin-ui/vitest.config.ts"`),
  the global setup, `browser.ts` (the browser per test), `google.ts` (the stand-in) and both journeys in one file,
  `global-events.e2e.test.ts`. The overlay also sets `init: true`, as every server of `compose.yaml` does.
- **Outside Touches: `test/global-setup.ts`.** Its default export takes an optional second parameter, the stack, which
  stays the flow stack when Vitest calls it. The admin-ui global setup calls it with the flow stack plus the overlay
  (same project name and settings folder), then provides `adminSite` as `http://localhost:<published port>`. That is
  "the flow stack's global setup with the overlay added" without a copy. `stack.ts` is unchanged.
- **Playwright.** `playwright` `1.64.1`, the newest stable release on npm (2026-10-14), pinned exactly. It has no install
  script, so `pnpm install` downloads no browser (no `~/Library/Caches/ms-playwright` after `pnpm add`).
  `pnpm exec playwright install chromium` was run once: Chrome for Testing 156.0.8078.4 (Playwright's `chromium` build
  v1248), Chrome Headless Shell 156.0.8078.4 (`chromium-headless-shell` v1248) and FFmpeg v1013, which that command
  brings along. `chromium.launch({ headless: true })` runs the headless shell.
- **The browser.** `browser.ts` exports an `it` with a `page` fixture: a new headless Chromium per test, a context with
  `baseURL` the site, `timezoneId: 'America/Los_Angeles'`, a 10 s default timeout (the harness's wait), a dialog handler
  that accepts, and tracing. Route handlers: the stand-in answers `https://accounts.google.com/gsi/client`, and every
  other URL whose origin is not the site's is recorded and aborted (`blockedbyclient`). A recorded request fails the
  test from `onTestFinished`, because Vitest 4.1.11 runs a fixture's clean-up again after it threw and so reported the
  error twice.
- **The stand-in** is the script text in `google.ts`: `initialize` keeps the callback, `renderButton` appends a
  `type="button"` "Sign in with Google" (the button sits inside the sign-in form), whose click calls the callback with
  `administratorIdToken()`, made when the page asks for the script. It does not check `client_id`.
- **Waits.** Every check is a Playwright wait: `waitForURL` with a predicate, `locator.waitFor()` on a locator that
  encodes the condition (`getByRole('button', { name: 'Publish', disabled: true })`, a row of the Drafts table that has
  the Draft's link and a cell named exactly `Start, Position`), and `waitForResponse`. W2 waits for the Save Server
  Action's answer (a POST to the page's own address) before going to the list, since the page shows nothing new after
  a save and a navigation started earlier could read the list before the main server stored the start.
- **Expected values.** W1 types a start of 18:30 and an end of 20:00 on tomorrow's Seoul date, and expects
  `new Date('<day>T18:30:00+09:00').toISOString()` and the like; title, description, place and the New Media
  Institute's latitude and longitude are compared as typed. W2's "names" are the page's "To publish, add a start and a
  position." and the list's "Start, Position", then "a position." and "Position".
- **Results.** Vitest writes `admin-ui-results/junit.xml`; a failed test (or one with an aborted request) leaves
  `<test name>.png` and `<test name>-trace.zip` in `admin-ui-results/failures/`. The global setup empties only
  `failures/`: the JUnit reporter opens its file before global setup runs, so emptying the whole folder unlinked the
  report. `/admin-ui-results` is in `flow-tests/.gitignore`.
- **Box rows** are dated 2026-10-23, the day the work was done (`CLAUDE.md`), not 2026-10-22.

### Evidence (2026-10-23)

Each run went through `slot.sh P11-02 --mutex flow-stack`.

- **Red first.** With the journeys written and nothing else, `pnpm typecheck` failed on
  `Cannot find module './browser.js'`.
- **`pnpm test:admin-ui`** at `8589a9fd`: `Test Files  1 passed (1)`, `Tests  2 passed (2)`, W1 1.3 s, W2 2.6 s, 16.4 s
  in all (the images were cached by an earlier run); `JUNIT report written to …/flow-tests/admin-ui-results/junit.xml`
  and `failures/` empty.
- **Planted failures**, a file `test/admin-ui/planted.e2e.test.ts` beside the journeys, removed before the commit:
  - a test that only opens the sign-in page and has the page `fetch('https://example.com/planted')`: the page saw the
    request refused, and the test failed with
    `Error: The browser asked for addresses outside the site, which were aborted: https://example.com/planted`;
  - a test whose stand-in hands a token for `someone@flow-tests.example`: the main server refused it, the page showed
    "This Google account is not a registered Administrator." (in the screenshot), and the test failed with
    `TimeoutError: page.waitForURL: Timeout 10000ms exceeded.`

  W1 and W2 passed in the same run. `junit.xml` read `tests="4" failures="2"`, one `<failure>` per planted test, and
  `failures/` held a `.png` and a `-trace.zip` for each (the trace with its snapshots and resources).
- **What each configuration selects** (`vitest list --filesOnly`, which starts no stack): `pnpm test`'s lists the seven
  files of `test/` and nothing under `test/admin-ui/`, also with the planted file there; `test:admin-ui`'s lists
  `test/admin-ui/global-events.e2e.test.ts` (and the planted file while it was there).
- **`pnpm test --reporter=verbose`** at `8589a9fd`: `Test Files  7 passed (7)`, `Tests  13 passed (13)`, 40.7 s, the
  same 13 tests as after P11-01.
- `pnpm lint` printed `8 test file(s), each named by its test level.` (the support files declare no test), and
  `pnpm format:check` and `pnpm typecheck` pass.
- **After merging the integration tip** (P09-04's admin rename, which changed `admin/package.json` and its lockfile, so
  the admin image was rebuilt): `pnpm test:admin-ui` passed, `Tests  2 passed (2)`, 34.9 s.
- The branch changes only `flow-tests/`: `.gitignore`, `README.md`, `package.json`, `pnpm-lock.yaml`,
  `compose.admin-ui.test.yaml`, `test/admin-ui/` (five new files), `test/people.ts` and `test/global-setup.ts`. No
  product code, admin test, existing flow, Compose file of the flow stack or CI workflow. The new files carry the box
  (`#` for the overlay), and `people.ts` and `global-setup.ts` got the row `2026-10-23  Opus 5.5   prompted by TaeHyun79`.

### Agent usage (2026-10-23)

- Agent time: about 22 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 20,683 thousand in all (cache reads 20,395 thousand, cache writes 287 thousand, uncached under 1
  thousand); output 19 thousand, a lower bound, since the transcript keeps only partial output counts.
