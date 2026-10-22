# 04: admin: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: admin only (the names of its `__tests__/` files, `vitest.config.mts`, `package.json` and its lockfile, `README.md`), plus admin's row of the root README's test table.

## What to build

This is the P09 spec's foundation change for admin. None of admin's tests is a unit test today. Its page tests render whole pages against a fake main server, and its site tests run against a build of the site. So each `__tests__/*.test.tsx` becomes `.integration.test.tsx`, and each `__tests__/site/*.test.ts` becomes `.integration.test.ts`. Each is renamed in place with `git mv`. Support files, such as `__tests__/support/` and the site tests' build and helpers, keep their names.

The `pages` and `site` projects become `integration-pages` and `integration-site` and change in nothing else. A new `unit` project runs in Node, and P09-09 adds its first tests. admin gains `@vitest/coverage-v8` 4.1.x to match its Vitest `~4.1.11`, the coverage block from the spec's "Coverage configuration", and the scripts from its "Projects and scripts" table. `pnpm lint` calls P09-01's level check on admin's files. Where the README and the root README's admin row describe the two old projects, they now describe the new ones.

## Acceptance criteria

- [x] Every test file under `admin/__tests__/` ends in `.integration.test.tsx` or `.integration.test.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [x] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [x] The projects are `unit`, in Node, plus `integration-pages` and `integration-site`. The two integration projects keep their environment, setup files and global setup as before.
- [x] `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says. `pnpm test:unit` and `pnpm test:cov:unit` succeed while the `unit` project has no test file yet.
- [x] `@vitest/coverage-v8` 4.1.x is a dev dependency. The coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [x] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [x] `admin/README.md` describes `unit`, `integration-pages` and `integration-site` instead of `pages` and `site`, and names no test file by an old name.
- [x] admin's row of the root README's test table names the new projects and says that `pnpm test:unit` needs no Docker.
- [x] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [x] No CI workflow file changes.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **Names.** All 15 test files are integration tests (ADR 0007): the 13 page tests render whole pages over the fake
  main server and stand-ins for Next.js's request parts, and the 2 site tests run against a build of the site. They were
  renamed in place, in a commit of renames only (`41b68e38`: 15 files, 0 insertions, 0 deletions), so no import
  changed. `git log --follow -- admin/__tests__/site/session.integration.test.ts` reaches back through `41b68e38` and
  `1bbe7a1f` to `205fd685` (P12). Support files (`__tests__/support/*`, `__tests__/site/build.ts`,
  `__tests__/site/site.ts`, `vitest.setup.ts`) kept their names.
- **`unit` project.** `environment: 'node'`, `include: ['__tests__/**/*.unit.test.{ts,tsx}']`, no setup file, no global
  setup and no `env`. `vitest.setup.ts` (the stand-ins for `next/headers`, `next/navigation`, `next/cache`, the fake
  main server and the two maps) and the `TZ`/Kakao `env` stay with `integration-pages`, so a unit test gets the real
  modules. `resolve.tsconfigPaths` and the `server-only` alias stay at the root, so a unit test can import
  `src/main-server.ts` and `src/app/health/health-answer.ts`, which import `server-only`.
- **`passWithNoTests: true`** at the root, the only place Vitest 4.1 takes it, so that `pnpm test:unit` and
  `pnpm test:cov:unit` pass before P09-09 adds the first unit test (as in socket-server, P09-03). P09-09 may drop it.
- **`@vitest/coverage-v8`** is `~4.1.11`, the specifier the four servers use; the lockfile resolves it to 4.1.11, the
  version of the installed Vitest.
- **Root README.** admin's row keeps the table's width: "Vitest: `unit`, `integration-pages`, `integration-site`;
  neither it nor `pnpm test:unit` needs Docker", in the wording of worker-server's and mobile's rows, since no admin
  test starts a container.
- **admin README.** The Checks table's `pnpm lint` row says it checks that each test file names its level (as
  main-server's and mobile's do). The Tests section names the three projects and the scripts, and the folder layout
  names `*.integration.test.tsx`.

### Evidence (2026-10-23)

**Counts.** Before the rename: CI run 39798578922 (commit `c931c016`, the last green run of `2.0/P09-11-tests` before
the rename), admin job: `Test Files 15 passed (15)`, `Tests 85 passed (85)`. After: one full run
(`pnpm test --reporter=default --reporter=json`), 15 files and 85 tests passed. Added up by file suffix from its JSON
report: `.unit.test.*` 0 files, 0 tests; `.integration.test.*` 15 files, 85 tests (`integration-pages` 13 files and 79
tests, `integration-site` 2 files and 6 tests). 0 + 85 = 85, so `test:unit` and `test:integration` together run
exactly what `test` runs. `pnpm test:integration` on its own: 15 files, 85 tests passed.

**`pnpm test:unit` and `pnpm test:cov:unit`**, with no unit test file yet:

```
$ vitest run --project unit --maxWorkers=4
No test files found, exiting with code 0
projects: unit
include: __tests__/**/*.unit.test.{ts,tsx}
exit 0

$ vitest run --project unit --coverage --maxWorkers=4
      Coverage enabled with v8
No test files found, exiting with code 0
Statements   : 0% ( 0/623 )
Branches     : 0% ( 0/424 )
Functions    : 0% ( 0/226 )
Lines        : 0% ( 0/595 )
exit 0
```

**`pnpm test:cov`**: 15 files, 85 tests passed. Statements 67.41 % (420/623), branches 70.04 % (297/424), functions
74.33 % (168/226), lines 66.55 % (396/595), over 39 files of `src/`. Files that no test loads show 0 %:
`src/app/layout.tsx`, `src/app/(signed-in)/events/position-map.tsx` and `src/app/(signed-in)/places/places-map.tsx`
(the page tests replace both maps), and `src/app/health/health-answer.ts` with `src/app/health/{live,ready}/route.ts`,
which the site tests reach only in the `next start` process, which V8 coverage does not measure.

**Level check, passing** on the renamed tree:

```
$ next typegen && oxlint --type-aware && node ../scripts/check-test-levels.ts
Generating route types...
✓ Types generated successfully
15 test file(s), each named by its test level.
exit 0
```

**Level check, failing** with `__tests__/planted.test.tsx` (a copy of `collection.integration.test.tsx`) and
`__tests__/site/planted.test.ts` (a copy of `site/health.integration.test.ts`) planted under old names, removed
afterwards:

```
$ next typegen && oxlint --type-aware && node ../scripts/check-test-levels.ts
Generating route types...
✓ Types generated successfully
__tests__/planted.test.tsx: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
__tests__/site/planted.test.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
2 file(s) not named by test level (ADR 0007).
[ELIFECYCLE] Command failed with exit code 1.
exit 1
```

`pnpm format:check` and `pnpm typecheck` pass. The full `pnpm test` above ran on the final configuration.

**Box rows.** The 15 renamed files have no new row. `vitest.config.mts` has the row
`2026-10-22  Opus 5.5   prompted by TaeHyun79`, the day its change was made by the first attempt at this ticket.
`package.json`, the lockfile and the READMEs take no box. `.github/` is unchanged.

### Agent usage (2026-10-23)

- Agent time: about 21 minutes, an estimate: three implementer subagents (two stopped attempts on 2026-10-22, 5 and 1
  minutes, and the one that finished, about 15 minutes), measured from their transcripts just before the last commit.
- Tokens: input 14,306 thousand in all (cache reads 13,975 thousand, cache writes 331 thousand, uncached under 1
  thousand); output 7 thousand, a lower bound, since the transcript keeps only partial output counts.

### Review round (2026-10-23)

The code review of P09–P11 (2026-10-23); each line names its finding.

- **S3-1.** `vitest.config.mts` drops `passWithNoTests` and its comment, stale since the `unit` project has test files:
  `pnpm test:unit` passes (3 files, 61 tests), and with the unit glob planted to match nothing it now fails.
