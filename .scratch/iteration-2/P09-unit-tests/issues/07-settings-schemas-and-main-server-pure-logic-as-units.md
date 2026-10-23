# 07: Settings schemas and main-server's pure logic as units

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-02 (main-server: tests named by level, run and measured apart), P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart)
Touches: the four servers' `test/` folders (their settings tests, and new unit test files; main-server's also for `namedPlace` and the geometry). No `src/` change is expected: the schemas, `namedPlace` and the geometry functions are already exported. P09-08 adds other files to match-server's and socket-server's `test/`.

## What to build

Today 45 tests start a whole server only to check its settings schema, a pure zod object: 22 in main-server, 9 in match-server, 8 in socket-server and 6 in worker-server. They become unit tests of each server's exported `settingsSchema`, with the boundary tables the P09 spec lists under "(a) Settings schemas", and each refusal names the setting it refuses. One start-up refusal integration test stays per server, so a server is still shown to refuse to start on a bad setting; the startup tests for a database or Redis that cannot be reached stay as they are.

main-server's reading of a Global Event's place text, `namedPlace`, and its geometry (`metresBetween`, `encloses`, `metresToRing`) get unit tests, so that a Global Event is never published at the wrong Place (the P09 spec's "(d) main-server"). `namedPlace` is tested on the Places seed read from its file, with place texts taken from the worker's saved event pages; the geometry on distances worked out independently of the code and on simple rings.

The new files follow the spec's "Test design for new unit test files" and "Isolation", and run in each server's `unit` project, with Docker stopped.

## Acceptance criteria

- [ ] Each of the four servers has a unit test of its exported `settingsSchema` that covers, as `it.each` tables, every boundary case of the P09 spec's (a) that applies to its settings, and each refusal asserts the name of the refused setting.
- [ ] The expected values come from that server's `.env.example` and README, and the file's testing strategy comment says so.
- [ ] Of the 45 app-booting settings tests, only one start-up refusal integration test remains per server, and the startup tests for an unreachable database or Redis are unchanged.
- [ ] `namedPlace` is tested on the Places seed read from its file, with place texts from the worker's saved event pages: a Place's name with its building number; a number alone; another campus, a hospital or a station; a street address other than the campus's own; an online event; several places in one text; a campus name glued to a building name.
- [ ] `metresBetween`, `encloses` and `metresToRing` are tested on distances worked out independently, named in the strategy comment, and on simple rings: inside, outside, on an edge and on a corner.
- [ ] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, and uses no real clock, network or file write.
- [ ] `pnpm test:unit` passes in each server with Docker stopped, and in each server `test:unit` and `test:integration` together run exactly the tests `test` runs.
- [ ] `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass in each server.
- [ ] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
