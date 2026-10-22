# 04: admin: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: admin only (the names of its `__tests__/` files, `vitest.config.mts`, `package.json` and its lockfile, `README.md`), plus admin's row of the root README's test table.

## What to build

This is the P09 spec's foundation change for admin. None of admin's tests is a unit test today. Its page tests render whole pages against a fake main server, and its site tests run against a build of the site. So each `__tests__/*.test.tsx` becomes `.integration.test.tsx`, and each `__tests__/site/*.test.ts` becomes `.integration.test.ts`. Each is renamed in place with `git mv`. Support files, such as `__tests__/support/` and the site tests' build and helpers, keep their names.

The `pages` and `site` projects become `integration-pages` and `integration-site` and change in nothing else. A new `unit` project runs in Node, and P09-09 adds its first tests. admin gains `@vitest/coverage-v8` 4.1.x to match its Vitest `~4.1.11`, the coverage block from the spec's "Coverage configuration", and the scripts from its "Projects and scripts" table. `pnpm lint` calls P09-01's level check on admin's files. Where the README and the root README's admin row describe the two old projects, they now describe the new ones.

## Acceptance criteria

- [ ] Every test file under `admin/__tests__/` ends in `.integration.test.tsx` or `.integration.test.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [ ] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [ ] The projects are `unit`, in Node, plus `integration-pages` and `integration-site`. The two integration projects keep their environment, setup files and global setup as before.
- [ ] `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says. `pnpm test:unit` and `pnpm test:cov:unit` succeed while the `unit` project has no test file yet.
- [ ] `@vitest/coverage-v8` 4.1.x is a dev dependency. The coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [ ] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [ ] `admin/README.md` describes `unit`, `integration-pages` and `integration-site` instead of `pages` and `site`, and names no test file by an old name.
- [ ] admin's row of the root README's test table names the new projects and says that `pnpm test:unit` needs no Docker.
- [ ] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [ ] No CI workflow file changes.
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
