# 09: admin's main-server client, sign-in path check and health answer as units

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-04 (admin: tests named by level, run and measured apart)
Touches: admin's `src/app/sign-in/` (`sitePath` moves to a plain module) and new unit test files in `__tests__/`. Not the page or site tests.

## What to build

Three admin modules get unit tests in admin's `unit` project, in Node (the P09 spec's "(e) admin"), so that failures are always reported the same way and an Administrator's sign-in follows only a path of the admin site.

The main-server client's `request()` is tested through `mainServer`'s exported calls with `fetch` stubbed. The sign-in's path check, `sitePath`, is a private function of `src/app/sign-in/actions.ts`, a `'use server'` file that may export only async functions, so it moves unchanged to a plain module that the actions import, and is tested on open-redirect variants. `healthAnswer` is tested on its checks.

## Acceptance criteria

- [x] The client's tests cover: no `MAIN_SERVER_URL`; a refusal with a JSON body; a refusal whose body is not JSON; 204 giving nothing; the token, content type and Idempotency-Key headers sent only when given; a rejecting `fetch` passed on to the caller.
- [x] `sitePath` sits unchanged in a plain module, the sign-in actions import it, and admin's integration tests pass unchanged.
- [x] `sitePath`'s tests cover an absolute URL, `//host`, `/\host`, a tab or newline inside the path, an encoded slash, a value that is not a string and the empty value, and none of them leads to another host; a path of the site keeps its query.
- [x] `healthAnswer`'s tests cover: all checks up gives 200 `ok`; one check down gives 503 `error` with that check under `error`; no checks gives 200; the answer always carries `no-store`.
- [x] The tests stub `fetch` and never reach the network.
- [x] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, and names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, with `it.each` tables for the variants.
- [x] `pnpm test:unit` in admin runs these tests, `test:unit` and `test:integration` together run exactly the tests `test` runs, and `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [x] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **The move.** `sitePath` moved to `src/app/sign-in/site-path.ts` in a commit of its own (`031d5e98`): the function
  and its comment as they were, with `export` added; `actions.ts` lost the function and gained
  `import { sitePath } from './site-path'`. The module needs no `server-only`: it reads nothing secret.
- **An open redirect the tests found, fixed apart.** Beyond the listed variants, a dot segment before `//host`
  (`/.//elsewhere.example`, `/..//elsewhere.example`, `/%2e%2e//elsewhere.example`, `/.\\elsewhere.example`) came out
  of the unchanged `sitePath` as `//elsewhere.example`: the URL parser removes the dot segment and keeps the site's
  origin, but a browser reads the result as another host. Next.js 16's Server Action redirect sends it to the client as
  `x-action-redirect`, whose router resolves it against the page and navigates to the outside host, so a crafted
  `/sign-in?next=/.//elsewhere.example` led an Administrator off the site after signing in (user story 16). The four
  variants were added as red tests and fixed in `f49ea1f2`: a path that starts with `//` now leads to the home page.
  So `sitePath` is unchanged at the move and changed by one condition after it; reverting `f49ea1f2` alone undoes the
  fix and its four rows.
- **Files.** `__tests__/main-server.unit.test.ts`, `__tests__/site-path.unit.test.ts` and
  `__tests__/health-answer.unit.test.ts`, all picked up by the `unit` project's pattern with no config change.
- **Client tests.** `fetch` is a `vi.fn` set with `vi.stubGlobal` and reset before each test; `MAIN_SERVER_URL` is
  `http://main-server.test:3000` (a reserved name) set with `vi.stubEnv`. The headers are compared whole (`toEqual`),
  so a header sent without being given fails. Refusal bodies come from main-server's README (`GLOBAL_EVENT_NOT_FOUND`,
  `GLOBAL_EVENT_CHANGED` with `version`, `GLOBAL_EVENT_INCOMPLETE` with `missing`, a 400 with a list as `message`).
- **Health names.** admin's only real check is `mainServer`; the two-check row adds a check named `another` to show
  that a check that is up stays under `info` while the one that is down goes under `error`.
- **Encoded slash.** `/%2F%2Felsewhere.example` and `/%5Celsewhere.example` are kept as they are: the URL parser, a
  browser's included, leaves them encoded, so they stay paths of this site.
- **Left as they are.** `passWithNoTests: true` in `vitest.config.mts` (P09-04 said this ticket may drop it) stays,
  since the config is outside this ticket's Touches. admin's README folder line for `__tests__/` still says "page
  tests, named \*.integration.test.tsx, and their support/", which does not mention the new unit tests; the README is
  outside Touches too.
- **Box date.** The rows say `2026-10-23`, the day of the change, as `CLAUDE.md` asks.

### Evidence (2026-10-23)

**Faults planted and caught** (each in `src/`, restored with `git checkout` afterwards):

- `healthAnswer`: `ok` also requiring a check → "no checks, as for liveness → 200 ok" failed; `no-store` only when
  ok and `error: up` → 4 tests failed.
- `sitePath`: returning `url.pathname` with no origin check and no query → `//host`, `/\host` and "a page with a
  query" failed.
- client: content type sent with a token alone and Idempotency-Key with any token → "signing out" and "registering an
  Administrator" failed; the 204 branch removed and an empty `MAIN_SERVER_URL` let through → "204 → nothing", the four
  header rows and "MAIN_SERVER_URL empty" failed; an unreadable refusal read as `{ code: 'UNREADABLE' }` and a
  rejecting `fetch` turned into a 503 → both non-JSON rows and the rejecting-`fetch` test failed.

**The dot-segment rows, red before `f49ea1f2`:** 8 failed (4 "→ the home page" with `Received: "//elsewhere.example"`,
4 "→ a browser stays on the admin site" with `Received: "https://elsewhere.example"`), 30 passed; green after it.

**Counts.** One full run, `pnpm test --maxWorkers=4 --reporter=default --reporter=json`: 18 files and 146
tests passed. Added up by file suffix from its JSON report: `.unit.test.*` 3 files, 61 tests (`main-server` 16,
`site-path` 38, `health-answer` 7); `.integration.test.*` 15 files, 85 tests, the same as at P09-04's rename. 61 + 85 =
146, so `test:unit` and `test:integration` together run exactly what `test` runs. admin's integration tests are
unchanged and pass.

```
$ pnpm test:unit --maxWorkers=4
$ vitest run --project unit --maxWorkers=4
 Test Files  3 passed (3)
      Tests  61 passed (61)
   Duration  149ms
```

**Checks.** `pnpm lint` ends with `18 test file(s), each named by its test level.` and exits 0; `pnpm format:check`
and `pnpm typecheck` pass.

**No network.** The client's test stubs `fetch` globally before each test and checks that nothing is sent when
`MAIN_SERVER_URL` is missing; `site-path.unit.test.ts` and `health-answer.unit.test.ts`, and the modules they test, do
not call `fetch` at all.

**Box rows.** The three test files and `src/app/sign-in/site-path.ts` are new and carry the box with
`2026-10-23  Opus 5.5   prompted by TaeHyun79`; `src/app/sign-in/actions.ts` gained that row.

### Agent usage (2026-10-23)

- Agent time: about 12 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 10,315 thousand in all (cache reads 10,172 thousand, cache writes 143 thousand, uncached under 1
  thousand); output 22 thousand, a lower bound, since the transcript keeps only partial output counts.
- The orchestrating session, the merges, the code review and its fix round are recorded once, under
  [P09-10](10-mobile-renewal-answers-and-adapters-as-units.md).

### Review round (2026-10-23)

The code review of P09–P11 (2026-10-23); each line starts with what it found.

- **admin's README said `__tests__/` holds the page tests only.** admin's README layout says `__tests__/` holds the unit
  tests (`*.unit.test.ts`) and the page tests, and `__tests__/site/` the integration tests against the built site.
- **The headers table also checked the body, which its name did not say.** main-server.unit.test.ts runs its four calls
  through two tables, `→ only the headers it was given` and `→ the body it was given, or none`; a dropped body and a
  wrong content-type each failed only their own table.
