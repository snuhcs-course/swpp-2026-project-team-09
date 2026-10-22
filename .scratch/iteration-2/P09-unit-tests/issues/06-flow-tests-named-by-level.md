# 06: flow-tests: flows named by level

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-01 (The shared pieces of the test levels), P10-01 (The event flow waits for the Shared Quest)
Touches: flow-tests (the names of its `test/` files, `vitest.config.ts`, `package.json`, `README.md`), the two lines of `infra/deploy/README.md` that name `deploy-stack.flow.ts`, and flow-tests' row of the root README's test table.

## What to build

This is the P09 spec's foundation change for flow-tests. Each `test/*.flow.ts` becomes `test/*.e2e.test.ts`, renamed in place with `git mv`. The Dev Server's stack check (`deploy-stack`) is one of them and counts among flow-tests' end-to-end tests. It is not one of P11's journeys. The harness's self-test (`stack`) becomes `.integration.test.ts`, and as a test of test tooling the Results count it apart. Support files, such as the harness modules and `sources/`, keep their names. P10-01 changes the event flow, so it merges first and the renamed file keeps its change. P11-01 and P11-02 add their journeys next to the renamed flows.

The `include` of the Vitest config follows the new names. The default configuration excludes `test/admin-ui/`, where P11-02 puts the admin site's browser tests. flow-tests runs the servers' built images, so it has no coverage block, and it keeps `test` as its only test script. `pnpm lint` calls P09-01's level check on flow-tests' files. README lines that name a flow by its old name use the new name: flow-tests' table of flows and its folder layout, and the two lines of `infra/deploy/README.md`.

## Acceptance criteria

- [ ] No file in `flow-tests/test/` is named `*.flow.ts`. The flows, `deploy-stack` among them, end in `.e2e.test.ts`, and the harness self-test ends in `.integration.test.ts`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [ ] `pnpm test` passes the same number of tests before and after the rename, and both counts are recorded in `## Comments`.
- [ ] `pnpm test` runs both suffixes in `test/`, and a test file placed under `test/admin-ui/` is not run.
- [ ] `test` stays the only test script in `flow-tests/package.json`, and flow-tests has no coverage block.
- [ ] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [ ] `flow-tests/README.md` and `infra/deploy/README.md` name no flow-tests test file by an old name, and flow-tests' row of the root README's test table still says what `pnpm test` runs.
- [ ] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [ ] No CI workflow file changes.
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
