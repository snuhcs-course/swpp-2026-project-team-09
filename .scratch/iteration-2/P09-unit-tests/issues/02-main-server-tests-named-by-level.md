# 02: main-server: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: main-server only (the names of its `test/` files, the store-contract test, `vitest.config.ts`, `package.json`, `README.md`), plus main-server's row of the root README's test table.

## What to build

This is the P09 spec's foundation change for main-server. Each of its 127 `test/*.e2e-spec.ts` files is renamed in place with `git mv` to the level it has today under ADR 0007, `.unit.test.ts` or `.integration.test.ts`. No import changes, and support files keep their names. A test that starts the application only to check the settings schema stays an integration test until P09-07 rewrites it. The benchmark's tests (`test/eval-*`) get level suffixes too and still run in `pnpm test`. They test test tooling, so the Results count them apart.

The Vitest config gets a `unit` project with no global setup, so `pnpm test:unit` runs with Docker stopped. It also gets an `integration` project, and the global setup that starts PostgreSQL and Redis moves there from the root config. The `store-contract` project becomes `integration-store-contract`. It keeps its later sequence group, and its test starts its own Redis container, because a project's global setup provides values only to that project. The scripts follow the spec's "Projects and scripts" table, and the coverage block follows its "Coverage configuration". `pnpm lint` calls P09-01's level check on main-server's files.

The README keeps `--no-spec` in its "add a module" steps, but "because this project tests through HTTP" gives way to the spec's new reason ("Documentation"). Every line that names a test file by its old name uses the new name.

## Acceptance criteria

- [ ] Every test file in `main-server/test/` has a level suffix under ADR 0007, and none is named `*.e2e-spec.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [ ] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [ ] `pnpm test:unit` passes with Docker stopped.
- [ ] The projects are `unit`, `integration` and `integration-store-contract`. Only the integration projects start containers, and `integration-store-contract` still runs after the others, against a Redis container it starts itself.
- [ ] `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [ ] The coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [ ] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [ ] `main-server/README.md` gives the new reason for `--no-spec` and names no test file by an old name. main-server's row of the root README's test table says that `pnpm test:unit` needs no Docker.
- [ ] A file that is only renamed gets no new box row. Every other changed source file gets one (`CLAUDE.md`), the store-contract test among them.
- [ ] No CI workflow file changes.
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
