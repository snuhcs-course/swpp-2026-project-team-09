# 02: W1 and W2: the admin site in a browser against the flow stack

Parent: [P11 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-06 (flow-tests: flows named by level), P11-01 (A1 and A2: a Session replaced, and a Leader running a group, in flow-tests)
Touches: flow-tests only: a new Compose overlay, `test/admin-ui/` with its own Vitest configuration and support files, `people.ts`, `package.json` and the lockfile, `.gitignore`, the README. Not the admin site, the main server, the flow stack's Compose files or CI.
Needs a person: a go-ahead to download Playwright's Chromium once (`pnpm exec playwright install chromium`) when the work starts.

## What to build

`pnpm test:admin-ui` in `flow-tests` runs two end-to-end journeys through a screen: the admin site as Production builds it, inside the flow stack and against its real main server, driven by Playwright's headless Chromium under Vitest, so the tests use the harness's `inject` values, Users and inbox unchanged. W1 (US-ADMIN-01 scenario 1) has an Administrator sign in, create a Draft and publish it, and a connected User is then told and sees the Global Event. W2 (US-ADMIN-01 scenario 2) shows that a Draft without a start time or a position cannot be published, that the site names what is missing, and that no User is told. The steps are the spec's "W1 and W2: the browser and the steps".

The admin service comes from a Compose overlay over the flow stack, built from `admin/Dockerfile` with the build arguments and setting the spec gives (spec: "W1 and W2: the admin site in the flow stack"). Google's sign-in script is replaced only at the network: a route handler serves a stand-in that hands the page an ID token signed with the run's key, so the sign-in page, its Server Action, the cookie and the main server's token check run as they do for a person (spec: "W1 and W2: signing in"). Every other request the browser makes outside the site is aborted.

The command runs over `test/admin-ui/`, which P09-06's default configuration already excludes, so `pnpm test` and CI neither build the admin image nor need a browser. It follows P11-01, since both change the flow-tests harness (`people.ts`).

## Acceptance criteria

- [ ] `flow-tests/compose.admin-ui.test.yaml` adds one `admin` service over `compose.yaml` and `compose.test.yaml` as the spec describes: built from `./admin` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID=flow-tests-admin.apps.googleusercontent.com` and an empty `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, `MAIN_SERVER_URL=http://main-server:3000`, port 3100 on a free loopback port, depending on a healthy main server, with a `node` health check of `/health/ready`; `startStack` builds, starts, waits for and removes it, under the flow stack's project name.
- [ ] `playwright` is a dev dependency of `flow-tests` pinned at one exact version; `pnpm install` downloads no browser; only Chromium runs, headless.
- [ ] `people.ts` exports `administratorIdToken()`, and both `signInAsAdministrator()` and the stand-in use it.
- [ ] A route handler answers `https://accounts.google.com/gsi/client` with a stand-in defining `google.accounts.id.initialize` and `renderButton` as the site uses them; its button calls the page's callback with the Administrator's (`admin@flow-tests.example`) ID token from `googleIdToken()`. A second handler aborts every request to a host other than the site's, and an aborted request fails the test.
- [ ] The browser context runs in `America/Los_Angeles`, opens the site at `http://localhost:<published port>` and accepts `window.confirm`; locators find elements by role and visible text, every assertion waits on a condition, and nothing sleeps for a fixed time.
- [ ] W1 passes: the Administrator is sent to sign-in and, after the stand-in's button, lands on the Events page; A's list of Global Events is empty after the Draft is created; after "Publish" is confirmed the page shows the event as published, A receives `global-events-changed` and `GET /global-events` lists one event with the title, the position and the start and end instants typed, the instants converted by the test from the Seoul times typed.
- [ ] W2 passes: a title-only Draft's page names a start and a position as missing with "Publish" disabled, and the Events list's "Still needs" names the same two; after a start is added and saved, both name only the position; A receives no `global-events-changed` and its list stays empty.
- [ ] `pnpm test:admin-ui` runs a second Vitest configuration over `flow-tests/test/admin-ui/`, whose global setup is the flow stack's with the overlay added and the site's address provided and whose setup file is the flow stack's own; its support files declare no test and pass the level check; `pnpm test` runs neither journey.
- [ ] A run writes Vitest's JUnit report, and on a failure a screenshot and a Playwright trace, into a results folder git ignores.
- [ ] `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` in `flow-tests` pass; no product code, admin test, existing flow or CI workflow changes.
- [ ] `flow-tests/README.md` gains a section on the admin site in a browser (the command, the Chromium install, what the stand-in replaces) and lists Google Identity Services under "What is replaced".
- [ ] Every new source file starts with the AI-generated box (`#` for the overlay), each changed source file gets a new row (`CLAUDE.md`), and the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
