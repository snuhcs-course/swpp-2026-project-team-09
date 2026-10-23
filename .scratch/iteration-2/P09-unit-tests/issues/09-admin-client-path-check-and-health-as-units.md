# 09: admin's main-server client, sign-in path check and health answer as units

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-04 (admin: tests named by level, run and measured apart)
Touches: admin's `src/app/sign-in/` (`sitePath` moves to a plain module) and new unit test files in `__tests__/`. Not the page or site tests.

## What to build

Three admin modules get unit tests in admin's `unit` project, in Node (the P09 spec's "(e) admin"), so that failures are always reported the same way and an Administrator's sign-in follows only a path of the admin site.

The main-server client's `request()` is tested through `mainServer`'s exported calls with `fetch` stubbed. The sign-in's path check, `sitePath`, is a private function of `src/app/sign-in/actions.ts`, a `'use server'` file that may export only async functions, so it moves unchanged to a plain module that the actions import, and is tested on open-redirect variants. `healthAnswer` is tested on its checks.

## Acceptance criteria

- [ ] The client's tests cover: no `MAIN_SERVER_URL`; a refusal with a JSON body; a refusal whose body is not JSON; 204 giving nothing; the token, content type and Idempotency-Key headers sent only when given; a rejecting `fetch` passed on to the caller.
- [ ] `sitePath` sits unchanged in a plain module, the sign-in actions import it, and admin's integration tests pass unchanged.
- [ ] `sitePath`'s tests cover an absolute URL, `//host`, `/\host`, a tab or newline inside the path, an encoded slash, a value that is not a string and the empty value, and none of them leads to another host; a path of the site keeps its query.
- [ ] `healthAnswer`'s tests cover: all checks up gives 200 `ok`; one check down gives 503 `error` with that check under `error`; no checks gives 200; the answer always carries `no-store`.
- [ ] The tests stub `fetch` and never reach the network.
- [ ] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, and names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, with `it.each` tables for the variants.
- [ ] `pnpm test:unit` in admin runs these tests, `test:unit` and `test:integration` together run exactly the tests `test` runs, and `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [ ] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
