# 02: main-server: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: main-server only (the names of its `test/` files, the store-contract test, `vitest.config.ts`, `package.json`, `README.md`), plus main-server's row of the root README's test table.

## What to build

This is the P09 spec's foundation change for main-server. Each of its 127 `test/*.e2e-spec.ts` files is renamed in place with `git mv` to the level it has today under ADR 0007, `.unit.test.ts` or `.integration.test.ts`. No import changes, and support files keep their names. A test that starts the application only to check the settings schema stays an integration test until P09-07 rewrites it. The benchmark's tests (`test/eval-*`) get level suffixes too and still run in `pnpm test`. They test test tooling, so the Results count them apart.

The Vitest config gets a `unit` project with no global setup, so `pnpm test:unit` runs with Docker stopped. It also gets an `integration` project, and the global setup that starts PostgreSQL and Redis moves there from the root config. The `store-contract` project becomes `integration-store-contract`. It keeps its later sequence group, and its test starts its own Redis container, because a project's global setup provides values only to that project. The scripts follow the spec's "Projects and scripts" table, and the coverage block follows its "Coverage configuration". `pnpm lint` calls P09-01's level check on main-server's files.

The README keeps `--no-spec` in its "add a module" steps, but "because this project tests through HTTP" gives way to the spec's new reason ("Documentation"). Every line that names a test file by its old name uses the new name.

## Acceptance criteria

- [x] Every test file in `main-server/test/` has a level suffix under ADR 0007, and none is named `*.e2e-spec.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [x] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [x] `pnpm test:unit` passes with Docker stopped.
- [x] The projects are `unit`, `integration` and `integration-store-contract`. Only the integration projects start containers, and `integration-store-contract` still runs after the others, against a Redis container it starts itself.
- [x] `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [x] The coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [x] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [x] `main-server/README.md` gives the new reason for `--no-spec` and names no test file by an old name. main-server's row of the root README's test table says that `pnpm test:unit` needs no Docker.
- [x] A file that is only renamed gets no new box row. Every other changed source file gets one (`CLAUDE.md`), the store-contract test among them.
- [x] No CI workflow file changes.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Levels.** Six files are unit tests: `demo-walk` (calls `src/demo/walk.ts` and reads the saved seed files) and the benchmark scorer's `eval-actions`, `eval-checks`, `eval-normalise`, `eval-observed` and `eval-run-score` (hand-made traces, no I/O). The other 121 are integration tests: they start the app (`startApp`), open a PostgreSQL or Redis connection (`database`, `redis-module`, `seed`, `shuttle-seed`, `seed-outlines`, `seed-place-outlines`, the store contract), or write files. `eval-options` and `eval-scorecard` are mostly pure but each has one test that writes a run or a scorecard to a temporary folder, which ADR 0007 keeps out of a unit test, so the files are integration tests; splitting them is left out, as the spec does not rewrite tests. `settings` stays an integration test until P09-07. No file calls `Test.createTestingModule` for one provider with stand-ins (`redis-module` builds `RedisModule` against a real Redis).
- **Tooling tests.** The ten `test/eval-*` files test the benchmark, not `src/`: five unit files with 94 tests and five integration files with 79 (`eval-cases` 28, `eval-options` 27, `eval-runner` 12, `eval-scorecard` 11, `eval-tool-errors` 1). They keep running in `pnpm test`; the Results count them apart. So the product's unit level today is `demo-walk` alone, 4 tests.
- **Config.** The root keeps `globals`, `root`, `unstubEnvs`, `hookTimeout`, `maxWorkers: 8` and the coverage block, with no `globalSetup`. The projects use `extends: true`: `unit` (`test/**/*.unit.test.ts`), `integration` (`test/**/*.integration.test.ts` without the store contract, `globalSetup: ['test/global-setup.ts']`) and `integration-store-contract` (`sequence: { groupOrder: 1 }`, as before). The old comment about not extending the root is gone, since the root has no global setup left to repeat.
- **Store contract.** `test/redis-idempotency-store.integration.test.ts` starts its own Redis with `startRedis()` and `redisSettings()` from `test/containers.ts` in `beforeAll` and stops it in `afterAll`. Before that change, its project, with no global setup, failed: `inject('settings')` was `undefined` (19 tests skipped, 1 file failed); after it, 19 of 19 passed.
- **Outside the Touches.** Four comments named a test file by its old name: `test/assistant`, `test/seed` and `test/stored-event-posts` (`.integration.test.ts`), and `eval/world.ts`. They now give the new names, so those four files changed and got a box row. `eval/world.ts`'s and the README's "e2e helpers" and "e2e machinery" now say "test helpers" and "the integration tests' machinery". `eval/vitest.config.ts` still says it "reuses the e2e global setup"; it names no file and is left as it is.
- **READMEs.** As in P09-03: the old names replaced (long lines rewrapped at 120), the `--no-spec` reason, a paragraph on the levels and scripts in "Checks", the `test/` line of the folder layout, and step 8 adds `test/party.unit.test.ts` for pure logic. The "Checks" table's `pnpm lint` row also names the level check. The root README's main-server row drops "itself" to keep the table's column width.

### Evidence (2026-10-22)

**Counts** (Vitest's summary lines):

| Run | Files | Tests |
|---|---|---|
| `pnpm test` before the rename (at 1fbef214) | 127 passed | 1694 passed |
| `pnpm test` after (at 1d562e1a) | 127 passed | 1694 passed |
| `pnpm test:unit` | 6 passed | 98 passed (0.9 s) |
| `pnpm test:integration` | 121 passed | 1596 passed |

98 + 1596 = 1694. `vitest list --json` for every project, for `--project unit` and for `--project 'integration*'`: the unit and integration lists together are exactly the full list, as multisets of file and test name with the UUIDs some names draw at collection time masked; the two share no test.

**Renames.** The rename commit (135e0389) has 127 renames at 100% similarity and nothing else; no import names a test file. `git log --follow -- main-server/test/quests.integration.test.ts` shows its history through 1bbe7a1f, 9ecafa21 and fa04f0d9.

**No container in `test:unit`.** The `unit` project has no global setup, and no unit test file imports `testcontainers` or calls `inject`. `docker ps -a` before and after `pnpm test:unit`: the same four containers, none added. Run with Docker stopped: the orchestrator ran it on 2026-10-23 at 00:59 KST at 7803d4e8 (`docker desktop stop`, then `docker info` failed to connect; Docker started again at 01:00:53), and `pnpm test:unit` passed: 9 files, 195 tests. The log is `docker-stopped-unit.log` in the orchestrator's helpers folder.

**Coverage.** `coverage-summary.json` holds 200 files, all under `src/`, none of `src/generated/`.

- `pnpm test:cov:unit`: 2.77% statements, 2.05% branches, 2.31% functions, 2.76% lines. `src/main.ts` and `src/global-events/named-place.ts` show 0%; `src/common/geometry.ts` 100% (through `demo-walk`).
- `pnpm test:cov`: 95.95% statements, 89.71% branches, 97.97% functions, 95.85% lines. Files at 0%: `src/main.ts`, `src/seed.ts`, `src/demo-seed.ts`, `src/demo-walk.ts`, the entry points no test starts. In both runs (the first and the one rerun) a few seed tests took over Vitest's 5-second test timeout under coverage, at load averages of 42 to 55 from other agents' runs: 4 failed, then 3 (`seed`'s "loads the campus map's Places …" and "leaves one set of records …", `shuttle-seed`'s "loads the operator's 14 stops …"). The plain `pnpm test` passed 1694 of 1694 before and after, and with `reportOnFailure: true` the report was still written. A `test:cov` run on an idle machine is left to the orchestrator.

**Level check.** `pnpm lint` on the renamed tree:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
127 test file(s), each named by its test level.
exit 0
```

With a copy of `test/quests.integration.test.ts` planted as `test/planted.e2e-spec.ts`:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
test/planted.e2e-spec.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
1 file(s) not named by test level (ADR 0007).
[ELIFECYCLE] Command failed with exit code 1.
exit 1
```

`pnpm format:check` ("All matched files use Prettier code style!") and `pnpm typecheck` pass. `.github/` is unchanged.

**Merge.** Merging `2.0/P09-11-tests` (P09-03) conflicted only in the root README's test table; the merge keeps main-server's row from here and the other three servers' rows from P09-03. It touched nothing in `main-server/` or `scripts/`.

### Agent usage (2026-10-22)

- Agent time: about 33 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 17,358 thousand in all (cache reads 17,183 thousand, cache writes 175 thousand, uncached under 1 thousand); output 9 thousand, a lower bound, since the transcript keeps only partial output counts.
