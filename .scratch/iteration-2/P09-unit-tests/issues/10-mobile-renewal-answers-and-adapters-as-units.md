# 10: mobile's renewal edge cases, answer checks and pure adapters as units

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-05 (mobile: tests named by level, run and measured apart)
Touches: new unit test files in mobile's `__tests__/`. No `src/` change is planned.

## What to build

The app's Session renewal, its checks of the main server's answers and its least-covered pure adapters get unit tests in mobile's `unit` project (the P09 spec's "(f) mobile"), so that a dropped network does not sign a User out, a refused renewal does not leave them signed in, and a malformed answer is refused.

`src/api/server/http.ts` is tested with `fetch` stubbed and the token store and Session events as stand-ins, on the three renewal cases no test covers. The shared renewal, a second 401, `SESSION_REPLACED` and `ONBOARDING_REQUIRED` are already covered by mobile's server-session test and are not repeated. `src/api/server/answers.ts` is tested guard by guard against the answer shapes the main server's README documents.

An adapter is pure when its functions take data and return data, with no I/O, hooks or timers; a module it imports that reaches a native module is allowed, since jest-expo stands in for native modules. The events, dining and room adapters come first, then the rest in order of their unit-only coverage in the foundation's first report (P09-05's), least covered first.

## Acceptance criteria

- [ ] `http.ts`'s tests cover: with no refresh token, the Session ends; with a malformed renewal answer, the Session ends; on a network error during renewal, the error is thrown and the Session is kept.
- [ ] Each guard in `answers.ts` accepts the answer shape the main server's README documents, refuses each field missing or of the wrong type, and accepts null only where null is allowed.
- [ ] The events, dining and room adapters have unit tests, then the other pure adapters in order of unit-only coverage in P09-05's first report, and `## Comments` records that order.
- [ ] The tests stub `fetch`, never reach the network, and use fake timers instead of real-time waits.
- [ ] Every new test file is named `.unit.test.ts(x)`, has a one- or two-line testing strategy comment below its box comment naming its partitions and where its expected values come from, and names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms.
- [ ] `pnpm test:unit` in mobile runs these tests, `test:unit` and `test:integration` together run exactly the tests `test` runs, and `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [ ] Every new source file starts with the AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
