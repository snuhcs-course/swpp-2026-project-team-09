# 01: The shared pieces of the test levels

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)
Touches: the repository root only: a new `scripts/check-test-levels.ts`, `.nvmrc`, `CLAUDE.md` and `AGENTS.md`. No package's files or scripts.

## What to build

The three pieces every rename ticket (P09-02 to P09-06) relies on. They land once, so that those tickets can run side by side.

**The level check** (the P09 spec's "The level check"). A small script at the repository root that has no dependencies and runs on Node's own TypeScript support. It checks the files of the package it is called for. In a test folder (`test/`, `__tests__/`), every file that declares a test (`describe`, `it` or `test`) must carry exactly one of ADR 0007's level suffixes: `.unit.test.ts(x)`, `.integration.test.ts(x)` or `.e2e.test.ts`. A file with a level suffix outside a test folder fails too. Support files that declare no test need no suffix, and `main-server/eval/` is not a test folder. The check names each file that fails. Every test file still has its old name today, so this ticket adds the check to no package's `pnpm lint`. Each rename ticket adds it for its own package.

**The Node pin** (the P09 spec's "The Node pin"). `.nvmrc` changes from `24` to the exact `24.x.y` that runs on the measurement Mac. CI reads `.nvmrc` through `node-version-file`, so CI runs the same version and no workflow changes.

**Renamed files and box comments.** `CLAUDE.md` and `AGENTS.md` each gain the same line under "AI-generated code markers": "A file that is only renamed, its content unchanged, gets no new row." The rename tickets follow this rule.

## Acceptance criteria

- [x] The script runs with `node` alone on Node's own TypeScript support, imports only Node's built-in modules, and can be called on one package's files.
- [x] In `test/` or `__tests__/`, a file that declares a test passes with exactly one level suffix, in a name the package's runners run (the globs its `lint` passes the check), and fails with none, with two, or with a level its runners do not run there. A file with a level suffix, or a `.test` or `.spec` name, outside a test folder fails. A support file in a test folder that declares no test passes without a suffix.
- [x] Files under `main-server/eval/`, such as the benchmark's `*.eval.ts`, are not checked as test files.
- [x] The check names every file that fails and exits non-zero when any file fails.
- [x] `## Comments` shows the check passing on a sample of renamed paths that covers all three levels and failing on a planted test file with no level suffix, with the output of each run.
- [x] No package's `lint` script calls the check yet.
- [x] `.nvmrc` holds the one exact `24.x.y` that `node --version` prints on the measurement Mac, and no CI workflow file changes.
- [x] `CLAUDE.md` and `AGENTS.md` each have the new line word for word under "AI-generated code markers", and the two files are still identical.
- [x] The new script starts with the AI-generated box and its first row (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Calling form.** From a package folder, with the globs its runners include and `!` before each glob they exclude, as its runner config writes them: `node ../scripts/check-test-levels.ts 'test/**/*.unit.test.ts' 'test/**/*.integration.test.ts'` in each server. It checks the current folder; with no glob it exits 2 with its usage. A rename ticket's `lint` becomes `oxlint --type-aware && node ../scripts/check-test-levels.ts <globs>` (admin: `next typegen && oxlint --type-aware && node ../scripts/check-test-levels.ts <globs>`). Node 24.14.0 strips the types with no warning; no `package.json` is needed at the root.
- **Test folder.** The package's top-level `test/` or `__tests__/` and everything below it (`test/admin-ui/`, `test/sources/`, `__tests__/support/`, `__tests__/site/`). These are the folders the runners include, so a level suffix anywhere else fails. `eval/` is not one.
- **Declares a test.** A code file (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`) with a line that starts, after spaces, with `describe`, `it` or `test`, optionally `.word` parts (`.each`, `.skipIf`, `.todo`, Playwright's `test.describe`), then `(`, a backtick or `<`. Comments and calls such as `pattern.test(x)` do not count. Saved pages, recorded answers, images and READMEs are never read. On today's tree every one of the 323 old-named test files matches and none of the 94 support code files in the test folders does.
- **Two suffixes.** In a test folder, a name with two or more of `unit`, `integration`, `e2e` as dot-separated parts after the first fails (`a.unit.integration.test.ts`).
- **Files walked.** Every file under the package except `node_modules` folders and names starting with `.` (`.next`, `.expo`, `.stack`). Run read-only on the main checkout, with `node_modules`, `dist`, `.next`, `android` and `ios` present, mobile's check takes 0.45 s and fails only on its 147 old-named test files.
- **The script's own test** is `scripts/test/check-test-levels.integration.test.ts` (26 tests; run with `node --test scripts/test/check-test-levels.integration.test.ts`). It writes sample packages to a temporary folder and runs the script, so it is an integration test by ADR 0007. Each rule broken on purpose in a copy of the script made at least one of its tests fail. This file is outside the ticket's Touches; no CI job runs it (CI is out of scope).

### Evidence (2026-10-22)

On today's tree the check fails in each package on exactly its old-named test files (main-server 127, match-server 11, socket-server 6, worker-server 12, admin 15, mobile 147, flow-tests 5), and on no support file.

**Passing on renamed paths.** A copy of the tracked tree (`git archive HEAD`), every test file renamed: servers' `eval-*`, `grouping` and `*-parser` and mobile's `design-system/` to `.unit.test.ts(x)`, flow-tests' `stack` to `.integration.test.ts` and its other flows to `.e2e.test.ts`, the rest to `.integration.test.ts(x)`. That is 40 unit, 279 integration and 4 end-to-end files, beside every real support file, saved page and recorded answer:

```
admin: 15 test file(s), each named by its test level.
  exit 0
flow-tests: 5 test file(s), each named by its test level.
  exit 0
main-server: 127 test file(s), each named by its test level.
  exit 0
match-server: 11 test file(s), each named by its test level.
  exit 0
mobile: 147 test file(s), each named by its test level.
  exit 0
socket-server: 6 test file(s), each named by its test level.
  exit 0
worker-server: 12 test file(s), each named by its test level.
  exit 0
```

Through pnpm in the copy's main-server, with `"lint": "oxlint --type-aware && node ../scripts/check-test-levels.ts"`:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
127 test file(s), each named by its test level.
exit 0
```

**Failing on planted files.** In the same copy's main-server: `test/planted.e2e-spec.ts` (a copy of `test/quests.integration.test.ts` under the old name), `test/planted.unit.integration.test.ts` and `src/planted.unit.test.ts`:

```
src/planted.unit.test.ts: has a level suffix but is outside test/ and __tests__/
test/planted.e2e-spec.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
test/planted.unit.integration.test.ts: has more than one level suffix
3 file(s) not named by test level (ADR 0007).
exit 1
```

**Node pin.** `node --version` on the measurement Mac prints `v24.14.0`; `.nvmrc` holds `24.14.0`. `.github/workflows/` and every package's `package.json` are unchanged.

### Agent usage (2026-10-22)

- Agent time: about 11 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 7,260 thousand in all (cache reads 7,110 thousand, cache writes 149 thousand, uncached under 1 thousand); output 5 thousand, a lower bound, since the transcript keeps only partial output counts.
- The orchestrating session, the merges, the code review and its fix round are recorded once, under [P09-10](10-mobile-renewal-answers-and-adapters-as-units.md).

### Review round (2026-10-23)

The code review of P09–P11 (2026-10-23); each line starts with what it found.

- **The README's Node.js version was not `.nvmrc`'s.** The root README's environment table gives Node.js 24.14.0, the
  version in `.nvmrc`.
- **The README did not mention `scripts/` or how to run its test.** The root README's layout lists `scripts/`, the level
  check every project's `pnpm lint` runs, and "Running the tests" gives its own test's command, `node --test
  scripts/test/check-test-levels.integration.test.ts` (16 passed).

### Review of PR #124 (2026-10-23)

The review found that the check took the three level suffixes in any test folder, while each package's runners run only some of them, so a name such as main-server's `test/parties.e2e.test.ts` or admin's `__tests__/csv.integration.test.ts` passed lint and never ran.

- **The globs.** Each package's `lint` now passes the check the globs its runners include, as its runner config writes them, and `!` before a glob they exclude: flow-tests adds `'!test/admin-ui/**/*.integration.test.ts'`, since its main config excludes `test/admin-ui/` and the admin site's config runs only its e2e tests. A file in a test folder whose level suffix no glob takes fails, and the check with no glob exits 2 with its usage. Level names alone were not enough: admin runs integration `.tsx` files only directly in `__tests__/` and `.ts` files only in `__tests__/site/`. The globs now live both in the runner configs and in the `lint` scripts, so a change to what a runner runs takes both.
- **Outside the test folders** a `.test` or `.spec` code file fails too, since no runner looks there; mobile's Jest has looked only in `__tests__/` since P09-05.
- **Touches**, beyond this ticket's: every package's `package.json` (`lint`) and the root README's "Running the tests".
- **Red first.** The 9 new rows of the check's test that expect a refusal each failed on the check before its change, which exited 0. After it: `node --test scripts/test/check-test-levels.integration.test.ts`, 26 passed.
- **Planted in the tree**, each removed after its run; each package's `lint` failed (exit 1) on its file:

  ```
  main-server    test/parties.e2e.test.ts
  worker-server  test/source.unit.test.tsx
  admin          __tests__/csv.integration.test.ts
  mobile         src/x.test.ts
  flow-tests     test/stack.unit.test.ts
  flow-tests     test/admin-ui/planted.integration.test.ts
  ```

  admin's message: `__tests__/csv.integration.test.ts: is named by level but not run: this package's runners include __tests__/**/*.unit.test.{ts,tsx}, __tests__/*.integration.test.tsx, __tests__/site/*.integration.test.ts`. The word "include" became "run" once the globs could exclude.
- **The tree as it is** passes in every package with the counts the old check gave: main-server 130, match-server 14, socket-server 8, worker-server 13, admin 18, mobile 161 and flow-tests 8 test files, `each named by its test level and run.`
- **The review's follow-up comment** (after #123 merged), for P09-11 and the spec:
  - `scripts/coverage-by-file-set.ts` sums a coverage report over the P09 spec's file sets, run from a package folder after each coverage run. It fails when the files under `src/` do not add up to the report's total. Its test, `scripts/test/coverage-by-file-set.integration.test.ts`, has 8 rows, all red before the script and green after. On the reports of the earlier, unofficial measurement at d4f07461, 60 of its 62 figures equal those of a sum made apart over the same reports; the other 2 are match-server's logic, which now holds the round and placement services.
  - `node --test 'scripts/test/*.test.ts'` runs both scripts' tests: 34 passed.
  - The spec's "The level check" and this ticket's first criterion say that only names the package's runners run pass.
