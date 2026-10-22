# 03: match-server, socket-server and worker-server: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: match-server, socket-server and worker-server (the names of their `test/` files, `vitest.config.ts`, `package.json`, `README.md`), plus their three rows of the root README's test table.

## What to build

This is the P09 spec's foundation change for the three smaller servers, done the way P09-02 does it for main-server. Each `test/*.e2e-spec.ts` (11 in match-server, 6 in socket-server, 12 in worker-server) is renamed in place with `git mv` to the level it has today under ADR 0007, `.unit.test.ts` or `.integration.test.ts`. Support files keep their names. Settings tests that start the server stay integration tests until P09-07 rewrites them.

In each server, the Vitest config gets a `unit` project with no global setup. It also gets an `integration` project, and the global setup moves there from the root config. match-server's global setup starts PostgreSQL and socket-server's starts Redis. worker-server's only provides settings and starts no container. The scripts follow the spec's "Projects and scripts" table, and the coverage block follows its "Coverage configuration". Each server's `pnpm lint` calls P09-01's level check on its own files.

P10-02 and P09-08 build on the renamed socket-server and match-server files. In the READMEs, the "add a module" steps keep `--no-spec`. match-server's "because this project tests through HTTP" and socket-server's "through the running server" give way to the spec's new reason ("Documentation"). Every README line that names a test file by its old name uses the new name.

## Acceptance criteria

- [ ] In each of the three servers, every test file in `test/` has a level suffix under ADR 0007, and none is named `*.e2e-spec.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [ ] In each server, `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [ ] `pnpm test:unit` passes in each server with Docker stopped, also in a server whose `unit` project has no test file yet.
- [ ] Each server has the projects `unit` and `integration`, and only `integration` runs the global setup.
- [ ] In each server, `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [ ] Each coverage block is the spec's, with no thresholds, and a file under `src/` that no test loads shows 0%.
- [ ] Each server's `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and the runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [ ] match-server's and socket-server's READMEs give the new reason for `--no-spec` instead of the old one. None of the three READMEs names a test file by an old name.
- [ ] The three servers' rows of the root README's test table say that `pnpm test:unit` needs no Docker.
- [ ] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [ ] No CI workflow file changes.
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
