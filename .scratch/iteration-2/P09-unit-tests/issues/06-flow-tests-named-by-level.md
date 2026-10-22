# 06: flow-tests: flows named by level

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-01 (The shared pieces of the test levels), P10-01 (The event flow waits for the Shared Quest)
Touches: flow-tests (the names of its `test/` files, `vitest.config.ts`, `package.json`, `README.md`), the two lines of `infra/deploy/README.md` that name `deploy-stack.flow.ts`, and flow-tests' row of the root README's test table.

## What to build

This is the P09 spec's foundation change for flow-tests. Each `test/*.flow.ts` becomes `test/*.e2e.test.ts`, renamed in place with `git mv`. The Dev Server's stack check (`deploy-stack`) is one of them and counts among flow-tests' end-to-end tests. It is not one of P11's journeys. The harness's self-test (`stack`) becomes `.integration.test.ts`, and as a test of test tooling the Results count it apart. Support files, such as the harness modules and `sources/`, keep their names. P10-01 changes the event flow, so it merges first and the renamed file keeps its change. P11-01 and P11-02 add their journeys next to the renamed flows.

The `include` of the Vitest config follows the new names. The default configuration excludes `test/admin-ui/`, where P11-02 puts the admin site's browser tests. flow-tests runs the servers' built images, so it has no coverage block, and it keeps `test` as its only test script. `pnpm lint` calls P09-01's level check on flow-tests' files. README lines that name a flow by its old name use the new name: flow-tests' table of flows and its folder layout, and the two lines of `infra/deploy/README.md`.

## Acceptance criteria

- [x] No file in `flow-tests/test/` is named `*.flow.ts`. The flows, `deploy-stack` among them, end in `.e2e.test.ts`, and the harness self-test ends in `.integration.test.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [x] `pnpm test` passes the same number of tests before and after the rename, and both counts are recorded in `## Comments`.
- [x] `pnpm test` runs both suffixes in `test/`, and a test file placed under `test/admin-ui/` is not run.
- [x] `test` stays the only test script in `flow-tests/package.json`, and flow-tests has no coverage block.
- [x] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [x] `flow-tests/README.md` and `infra/deploy/README.md` name no flow-tests test file by an old name, and flow-tests' row of the root README's test table still says what `pnpm test` runs.
- [x] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [x] No CI workflow file changes.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Names.** `event`, `friend`, `campus-services` and `deploy-stack` became `.e2e.test.ts`, and `stack` became `.integration.test.ts`. The five renames are one commit with no content change (`697f4d83`), so they carry no new box row. Support files keep their names.
- **Config.** `include: ['test/**/*.e2e.test.ts', 'test/**/*.integration.test.ts']`, `exclude: ['test/admin-ui/**']`. Setting `exclude` replaces Vitest's default (`**/node_modules/**`, `**/.git/**`). That is safe here because `include` only reaches `test/`.
- **Lint.** `"lint": "oxlint --type-aware && node ../scripts/check-test-levels.ts"`, as P09-01 gave it.
- **Root README.** flow-tests' row is unchanged. `pnpm test` still runs the same flows across the four built servers, under the same Compose project, so the row still says what it runs.
- **Outside Touches.** The comment at the top of `flow-tests/compose.deploy.test.yaml` named `test/deploy-stack.flow.ts`. It now names the new file, and the file got a box row. In `flow-tests/README.md` the folder layout was realigned for the longer names.

### Evidence (2026-10-22)

Each run is `pnpm test` in `flow-tests` through `heavy.sh`.

- **Before** the rename, at `4ac779a7`: `Test Files  5 passed (5)`, `Tests  11 passed (11)`, 36.2 s.
- **After**, with a test that throws planted at `test/admin-ui/planted.e2e.test.ts`: `Test Files  5 passed (5)`, `Tests  11 passed (11)`, 36.3 s. The verbose reporter (`pnpm test --reporter=verbose`) listed 6 tests in `deploy-stack.e2e.test.ts`, 1 each in `event`, `friend` and `campus-services.e2e.test.ts`, and 2 in `stack.integration.test.ts`. The planted file was not run. `pnpm exec vitest list --filesOnly` with the same plant lists the five files and not the planted one:

  ```
  test/campus-services.e2e.test.ts
  test/deploy-stack.e2e.test.ts
  test/event.e2e.test.ts
  test/friend.e2e.test.ts
  test/stack.integration.test.ts
  ```

- **Lint on the renamed tree:**

  ```
  $ oxlint --type-aware && node ../scripts/check-test-levels.ts
  5 test file(s), each named by its test level.
  exit 0
  ```

- **Lint with `test/planted.flow.ts`** (a copy of the event flow under the old name):

  ```
  $ oxlint --type-aware && node ../scripts/check-test-levels.ts
  test/planted.flow.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
  1 file(s) not named by test level (ADR 0007).
  exit 1
  ```

- `pnpm format:check` and `pnpm typecheck` pass. Both plants were removed before the commit.
- `git log --follow flow-tests/test/event.e2e.test.ts` shows the rename, then P10-01's `f6fe439a`, `1bbe7a1f` and `fa04f0d9`.
- `git grep '\.flow\.ts'` outside `.scratch/` finds nothing. `.github/` is unchanged.

### Agent usage (2026-10-22)

- Agent time: about 10 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 6,163 thousand in all (cache reads 6,019 thousand, cache writes 143 thousand, uncached under 1 thousand); output 7 thousand, a lower bound, since the transcript keeps only partial output counts.
