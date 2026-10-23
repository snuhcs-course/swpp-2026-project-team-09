# 05: mobile: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: mobile only (the names of its `__tests__/` files, `package.json` with its Jest config and scripts, `.gitignore`, `README.md`), plus mobile's row of the root README's test table. P20's open pull requests #118 to #122 change mobile tests too.

## What to build

This is the P09 spec's foundation change for mobile. Each `__tests__/**/*-test.ts(x)` is renamed in place with `git mv` to `.unit.test.ts(x)` or `.integration.test.ts(x)`, following ADR 0007's rule. A test is a unit test when it calls one module and that module's collaborators are stand-ins or in-process libraries that behave the same on every run, such as the React renderer or a QueryClient without retries. A screen component is a unit only when every hook and data source it uses is a stand-in. A test that runs the app's router over the fake server, such as the whole-app renders, is an integration test. Support files (`__tests__/support/`, `__tests__/fixtures/`) keep their names.

Jest gets the projects `unit` and `integration`, and each selects its files by suffix. The scripts follow the spec's "Projects and scripts" table, with `--selectProjects`. CI's four shards still run `pnpm test --shard`, and no workflow changes. Coverage follows the Jest part of the spec's "Coverage configuration": `coverageProvider: 'babel'` (Istanbul), `collectCoverageFrom` `src/**/*.{ts,tsx}` without `*.d.ts`, the same four reporters and no thresholds. `mobile/.gitignore` gains `/coverage`. `pnpm lint` calls P09-01's level check on mobile's files.

P20's pull requests #118 to #122 change mobile tests (the spec's "Open pull requests"). Each one merges before this ticket lands, or rebases after it and renames its new test files. The level check fails any file still under an old name.

## Acceptance criteria

- [ ] Every test file under `mobile/__tests__/` ends in `.unit.test.ts(x)` or `.integration.test.ts(x)` under ADR 0007, and none ends in `-test.ts(x)`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [ ] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [ ] Jest has the projects `unit` and `integration`, and `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [ ] `pnpm test --shard=1/4` to `--shard=4/4` together run every test that `pnpm test` runs, as CI's four shards do. No CI workflow file changes.
- [ ] The coverage settings are the spec's, with no thresholds. A file under `src/` that no test loads shows 0%, and `mobile/.gitignore` has `/coverage`, so git ignores the reports that `pnpm test:cov` writes.
- [ ] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [ ] When this ticket lands, every mobile test file on the branch has a level suffix, including any that P20's merged pull requests added.
- [ ] `mobile/README.md` names no test file by an old name. mobile's row of the root README's test table says that `pnpm test:unit` needs no Docker.
- [ ] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
