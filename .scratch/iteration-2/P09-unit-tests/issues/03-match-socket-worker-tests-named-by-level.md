# 03: match-server, socket-server and worker-server: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: match-server, socket-server and worker-server (the names of their `test/` files, `vitest.config.ts`, `package.json`, `README.md`), plus their three rows of the root README's test table.

## What to build

This is the P09 spec's foundation change for the three smaller servers, done the way P09-02 does it for main-server. Each `test/*.e2e-spec.ts` (11 in match-server, 6 in socket-server, 12 in worker-server) is renamed in place with `git mv` to the level it has today under ADR 0007, `.unit.test.ts` or `.integration.test.ts`. Support files keep their names. Settings tests that start the server stay integration tests until P09-07 rewrites them.

In each server, the Vitest config gets a `unit` project with no global setup. It also gets an `integration` project, and the global setup moves there from the root config. match-server's global setup starts PostgreSQL and socket-server's starts Redis. worker-server's only provides settings and starts no container. The scripts follow the spec's "Projects and scripts" table, and the coverage block follows its "Coverage configuration". Each server's `pnpm lint` calls P09-01's level check on its own files.

P10-02 and P09-08 build on the renamed socket-server and match-server files. In the READMEs, the "add a module" steps keep `--no-spec`. match-server's "because this project tests through HTTP" and socket-server's "through the running server" give way to the spec's new reason ("Documentation"). Every README line that names a test file by its old name uses the new name.

## Acceptance criteria

- [x] In each of the three servers, every test file in `test/` has a level suffix under ADR 0007, and none is named `*.e2e-spec.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [x] In each server, `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [x] `pnpm test:unit` passes in each server with Docker stopped, also in a server whose `unit` project has no test file yet.
- [x] Each server has the projects `unit` and `integration`, and only `integration` runs the global setup.
- [x] In each server, `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [x] Each coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [x] Each server's `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and the runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [x] match-server's and socket-server's READMEs give the new reason for `--no-spec` instead of the old one. None of the three READMEs names a test file by an old name.
- [x] The three servers' rows of the root README's test table say that `pnpm test:unit` needs no Docker.
- [x] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [x] No CI workflow file changes.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Levels.** match-server's `grouping` (calls `HashtagGrouping` directly) and worker-server's six parser tests and `demo-menus` (call the parsers and `savedMenuMessages` on saved pages) are unit tests. Every other file starts the server (`startApp`) or opens a database connection, so it is an integration test, the three `settings` tests among them until P09-07. socket-server has no unit test yet.
- **Config.** In each `vitest.config.ts` the root keeps `globals`, `root`, `unstubEnvs`, `hookTimeout` and the coverage block, with no `globalSetup`; the projects `unit` and `integration` use `extends: true` and select their files by suffix, and only `integration` has `globalSetup: ['test/global-setup.ts']`.
- **An empty unit project.** Vitest exits 1 when no file matches (`No test files found`). socket-server's root config sets `passWithNoTests: true`, a root-only option in Vitest 4.1, so its `test:unit` passes before its first unit test. The scripts stay as the spec's table gives them. match-server and worker-server have unit tests, so they keep Vitest's default.
- **READMEs.** Besides the old names and the `--no-spec` reason, each server's "Checks" section gains one paragraph on the levels and the new scripts, the folder-layout line for `test/` says the tests are named by level, and the "add a module" step adds a `<feature>.unit.test.ts` for pure logic. The root README's three rows keep the table's column widths.

### Evidence (2026-10-22)

**Counts.** `pnpm test` (Vitest's summary line), before the rename (at 4ac779a7) and after:

| Server | Before | After `test` | `test:unit` | `test:integration` |
|---|---|---|---|---|
| match-server | 11 files, 73 tests | 11 files, 73 tests | 1 file, 6 tests | 10 files, 67 tests |
| socket-server | 6 files, 31 tests | 6 files, 31 tests | `No test files found, exiting with code 0` | 6 files, 31 tests |
| worker-server | 12 files, 141 tests | 12 files, 141 tests | 7 files, 88 tests | 5 files, 53 tests |

`vitest list --json` for every project, for `--project unit` and for `--project 'integration*'` gives, in each server, the unit and integration tests together as exactly the set of all tests (file and test name): 73 = 6 + 67, 31 = 0 + 31, 141 = 88 + 53.

**Renames.** The rename commit (1e085e07) changes 29 files with 0 insertions and 0 deletions; no import names a test file. `git log --follow -- socket-server/test/users.integration.test.ts` shows its history back to P04-11.

**No container in `test:unit`.** The `unit` project has no global setup and no unit test file imports `testcontainers`. `docker ps -a` before and after each server's `pnpm test:unit`: no container started (in worker-server's run, a Ryuk container left by socket-server's integration run ended; none was added). Run with Docker stopped: the orchestrator ran it on 2026-10-23 at 00:59 KST at 7803d4e8 (`docker desktop stop`, then `docker info` failed to connect; Docker started again at 01:00:53), and `pnpm test:unit` passed: match-server 4 files, 39 tests; socket-server 2 files, 32 tests; worker-server 8 files, 100 tests. The log is `docker-stopped-unit.log` in the orchestrator's helpers folder. By then each server's `unit` project had test files.

**Coverage.** `pnpm test:cov:unit` and `pnpm test:cov` (lines of `src/`; no file of `src/generated/`, no `.d.ts` and nothing outside `src/` in `coverage-summary.json`):

| Server | `test:cov:unit` | `test:cov` | Files at 0% in `test:cov` |
|---|---|---|---|
| match-server | 6.86% lines, 17 of 19 files at 0% | 95.7% lines | `src/main.ts` |
| socket-server | 0% lines (no unit test), 16 of 19 files at 0% | 89.65% lines | `src/main.ts` |
| worker-server | 51.42% lines, 17 of 35 files at 0% | 93.84% lines, written though tests timed out (below) | `src/collect.ts`, `src/demo-menus.ts`, `src/main.ts` |

worker-server's `pnpm test:cov` ran all 141 tests, but on a machine busy with other agents' runs some took over Vitest's 5-second test timeout: 2 failed at a load average of 48, and 13 at 63 in the one rerun (the slowest took 17.5 s). The plain `pnpm test` passed 141 of 141 before and after the rename, and `test:cov:unit` passed 88 of 88. With `reportOnFailure: true` the report was still written. A run on an idle machine is left to the orchestrator.

**Level check.** `pnpm lint` on the renamed tree:

```
match-server:  11 test file(s), each named by its test level.   exit 0
socket-server: 6 test file(s), each named by its test level.    exit 0
worker-server: 12 test file(s), each named by its test level.   exit 0
```

With a copy of a test planted as `test/planted.e2e-spec.ts` in each server, each `pnpm lint` exits 1:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
test/planted.e2e-spec.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
1 file(s) not named by test level (ADR 0007).
[ELIFECYCLE] Command failed with exit code 1.
```

`pnpm format:check` and `pnpm typecheck` pass in each server. No file under `.github/` changes. The three `vitest.config.ts` get the row `2026-10-22  Opus 5.5   prompted by TaeHyun79`; the renamed test files get none.

### Agent usage (2026-10-22)

- Agent time: about 14 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 13,635 thousand in all (cache reads 13,449 thousand, cache writes 186 thousand, uncached under 1 thousand); output 13 thousand, a lower bound, since the transcript keeps only partial output counts.

### Review round (2026-10-23)

The code review of P09–P11 (2026-10-23); each line names its finding.

- **S1-2, P1-3.** socket-server's `vitest.config.ts` drops `passWithNoTests` and its comment, stale since its `unit`
  project has test files: `pnpm test:unit` passes (2 files, 32 tests), and with the unit glob planted to match nothing
  it now fails instead of passing on no test.
- **S1-9.** match-, socket- and worker-server's "Checks" rows say that `pnpm lint` also checks that each test file names
  a level, as main-server's does, and worker-server's `test/` line says its tests are named by level.
- **P1-4.** worker-server's `pnpm test:cov` (in a slot, `--maxWorkers=4`, load average 35): 13 files, 148 passed, none
  timed out; 93.84% statements, 87.4% branches, 96.8% functions, 93.84% lines.
