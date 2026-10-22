# 07: Settings schemas and main-server's pure logic as units

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-02 (main-server: tests named by level, run and measured apart), P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart)
Touches: the four servers' `test/` folders (their settings tests, and new unit test files; main-server's also for `namedPlace` and the geometry). No `src/` change is expected: the schemas, `namedPlace` and the geometry functions are already exported. P09-08 adds other files to match-server's and socket-server's `test/`.

## What to build

Today 45 tests start a whole server only to check its settings schema, a pure zod object: 22 in main-server, 9 in match-server, 8 in socket-server and 6 in worker-server. They become unit tests of each server's exported `settingsSchema`, with the boundary tables the P09 spec lists under "(a) Settings schemas", and each refusal names the setting it refuses. One start-up refusal integration test stays per server, so a server is still shown to refuse to start on a bad setting; the startup tests for a database or Redis that cannot be reached stay as they are.

main-server's reading of a Global Event's place text, `namedPlace`, and its geometry (`metresBetween`, `encloses`, `metresToRing`) get unit tests, so that a Global Event is never published at the wrong Place (the P09 spec's "(d) main-server"). `namedPlace` is tested on the Places seed read from its file, with place texts taken from the worker's saved event pages; the geometry on distances worked out independently of the code and on simple rings.

The new files follow the spec's "Test design for new unit test files" and "Isolation", and run in each server's `unit` project, with Docker stopped.

## Acceptance criteria

- [x] Each of the four servers has a unit test of its exported `settingsSchema` that covers, as `it.each` tables, every boundary case of the P09 spec's (a) that applies to its settings, and each refusal asserts the name of the refused setting.
- [x] The expected values come from that server's `.env.example` and README, and the file's testing strategy comment says so.
- [x] Of the 45 app-booting settings tests, only one start-up refusal integration test remains per server, and the startup tests for an unreachable database or Redis are unchanged.
- [x] `namedPlace` is tested on the Places seed read from its file, with place texts from the worker's saved event pages: a Place's name with its building number; a number alone; another campus, a hospital or a station; a street address other than the campus's own; an online event; several places in one text; a campus name glued to a building name.
- [x] `metresBetween`, `encloses` and `metresToRing` are tested on distances worked out independently, named in the strategy comment, and on simple rings: inside, outside, on an edge and on a corner.
- [x] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, and uses no real clock, network or file write.
- [ ] `pnpm test:unit` passes in each server with Docker stopped, and in each server `test:unit` and `test:integration` together run exactly the tests `test` runs.
- [ ] `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass in each server.
- [x] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Settings.** Each server has `test/settings.unit.test.ts`. A refusal is read as NestJS prints it at startup: the first segment of each issue's path, compared with `toEqual([setting])`, so a case passes only when the refused setting, and no other, is named. The valid settings are the server's `.env.example`, read with `node:util`'s `parseEnv`, plus what it leaves to be made as the READMEs say: the ES256 pair of `pnpm keys:generate` (`test/keys.ts`), 64 hex digits for `openssl rand -hex 32` and a Kakao key. So the first test of each file also fails when `.env.example` drifts from the schema.
- **The tables.** Every case of the spec's (a) that applies, and every case of the 45 tests: `PORT` (and `REDIS_PORT`) missing, `abc`, 0 and 65536 refused, 1 and 65535 accepted as numbers; tokens of 31 characters refused, 32 accepted; `ROUND_INTERVAL_SECONDS` missing, 0 and 1.5 refused, 1 accepted; the Assistant's four counts unset give 50, 8, 30000 and 1000, 0 is refused, 1 accepted; a key under the wrong PEM header, a P-384 key, an RSA key and a public key of another pair refused; the app's client ID as the admin site's refused; `;` between addresses or fingerprints refused; a SHA-1 fingerprint refused; `PUBLIC_URL` with and without a trailing slash both `https://snunow.example`. Beyond them, from the READMEs: `KAKAO_REST_API_KEY` missing or empty, the comma-separated email list in lower case, and an empty `REDIS_HOST` in socket-server.
- **The start-up refusal kept** in each server's `test/settings.integration.test.ts`: "stops startup and names PORT when it is missing", the READMEs' example message. The other 44 are gone; `startup.integration.test.ts` is unchanged in the three servers that have it.
- **Describes.** oxlint's `max-lines-per-function` (50) counts a `describe` callback, so each file has `describe('settingsSchema')` for the valid settings and `describe('settingsSchema: <setting>')` per setting (main-server's README, "add a module", step 8).
- **namedPlace's Places.** The test builds them from the seed's files as README.md's "Seed data" says the seed loads them: the campus map's rows inside the Campus Boundary (`readCampusBoundary`), without its `Test` row and with `관악 223동[우석경제관]` read as 우석경제관; OpenStreetMap's two; the national map's four, at a corner of their polygon, since `namedPlace` reads no position. A test checks that this gives 230 Places, the count `test/seed.integration.test.ts` finds loaded. `src/places/places.seed.ts` exports only `loadPlaces`, which writes through Prisma, and the spec rules out Prisma stand-ins, so no `src/` file changed.
- **Place texts.** The worker's saved post pages hold four places (posts 176516, 176525, 176558, 176561); they are copied as literals with their post numbers. A partition none of them covers (another campus, a hospital, a station, another university, another street, the campus's name glued to a Place's) takes one of them with one change, as worker-server's `event-page-parser` test changes its saved pages. Expected Places are the rows of `campus-map-places.json` and `openstreetmap-places.json`; the rules are README.md's "A place names a Place".
- **Geometry.** Distances come from the haversine formula on a sphere of 6,371 km, worked out apart from the code to 1 cm, and are compared to ±5 cm. For `encloses` on an edge or a corner the test asserts that of the two (four) rings sharing it exactly one holds the position, not which: README.md defines no side, and the callers count a position on an edge as inside through `metresToRing` (0 m).
- socket-server's root `passWithNoTests: true` is left as P09-03 set it: the config is outside this ticket's Touches.

### Evidence (2026-10-22)

**Counts.** Before: CI run 39803944532 at f0311a2e, the tip this branch started from, with the unit and integration split of P09-02 and P09-03 (match-server has one more integration test since then, from P10-02). After: at 0d8f38b8, before the merge, `pnpm test:unit` in each server and `vitest list --json` for every project, summed by project and by file suffix (no test in the wrong project).

| Server | Before `test` (unit + integration) | Settings tests that start the server | New unit tests | After `test` | After `test:unit` | After `test:integration` |
|---|---|---|---|---|---|---|
| main-server | 127 files, 1694 (98 + 1596) | 22 → 1 | 97 (settings 60, `namedPlace` 22, geometry 15) | 130 files, 1770 | 9 files, 195 | 121 files, 1575 |
| match-server | 11 files, 74 (6 + 68) | 9 → 1 | 17 | 12 files, 83 | 2 files, 23 | 10 files, 60 |
| socket-server | 6 files, 31 (0 + 31) | 8 → 1 | 20 | 7 files, 44 | 1 file, 20 | 6 files, 24 |
| worker-server | 12 files, 141 (88 + 53) | 6 → 1 | 12 | 13 files, 148 | 8 files, 100 | 5 files, 48 |

In each server the unit and integration counts add up to the count of every project (195 + 1575 = 1770, 23 + 60 = 83, 20 + 24 = 44, 100 + 48 = 148). Each `test/settings.integration.test.ts` runs on its own with 1 test passing.

**Planted faults.** Each fault planted in `src/`, run against its test file alone and taken out again:

| Fault | Fails |
|---|---|
| worker-server `PORT` up to 65536 | `65536 → refused, naming PORT` |
| worker-server `WORKER_TOKEN` from 31 characters | `of 31 characters → refused, naming WORKER_TOKEN` |
| match-server `ROUND_INTERVAL_SECONDS` without `.int()` | `1.5 → refused, …` |
| socket-server no PEM header check | `a private key, under the wrong PEM header → refused, …` |
| main-server keys never compared | `the public key of another pair than the private key → refused, …` |
| main-server `PUBLIC_URL` keeps its slash | `with a trailing slash → accepted as https://snunow.example` |
| main-server equal client IDs allowed | `the app's client ID as the admin site's → refused, …` |
| main-server emails kept in their case | `two addresses separated by a comma, in capitals → …` |
| `namedPlace` without taking the campus's name off a glued name | both glued cases |
| … stations, hospitals, other universities not elsewhere | the station, hospital and other-university cases, one each |
| … street addresses not read | `a street address other than the campus's, …` |
| … a number counting without the campus | `a number alone, without the university's name → no Place` |
| … a name beside a number not checked | `… a number and the name of another Place → no Place` |
| … online parts not set aside | `a Place beside an online room → that Place` |
| … several Places taken as one | `… two by number → no Place` |
| 111,000 m to a degree | the 7 distance cases |
| no cosine for a degree east | 5 distance cases |
| `encloses` crossing no edge | 4 `encloses` cases |
| `metresToRing` to a segment's whole line | the 3 cases outside the ring |

Two faults pass: `<=` in place of `<` in the crossing test, which moves a position on a shared edge to the other ring (the tests leave the side open, as above), and leaving out the closing edge of a ring whose first corner is not repeated (every ring the server reads is a closed GeoJSON ring, and so are the tests').

**No container in `test:unit`.** The `unit` projects have no global setup, and no new file imports `testcontainers` or calls `inject`. `docker ps -a` before and after the four `pnpm test:unit` runs: the same four containers, none added. Run with Docker stopped: pending, made by the orchestrator once all tickets have merged.

**Checks.** In each server `pnpm lint` passes with the level check (`130`, `12`, `7` and `13 test file(s), each named by its test level.`), and `pnpm format:check` and `pnpm typecheck` pass. Full `pnpm test`: left to CI on the merge push; the orchestrator records the run.
