# 01: The shared pieces of the test levels

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: the repository root only: a new `scripts/check-test-levels.ts`, `.nvmrc`, `CLAUDE.md` and `AGENTS.md`. No package's files or scripts.

## What to build

The three pieces every rename ticket (P09-02 to P09-06) relies on. They land once, so that those tickets can run side by side.

**The level check** (the P09 spec's "The level check"). A small script at the repository root that has no dependencies and runs on Node's own TypeScript support. It checks the files of the package it is called for. In a test folder (`test/`, `__tests__/`), every file that declares a test (`describe`, `it` or `test`) must carry exactly one of ADR 0007's level suffixes: `.unit.test.ts(x)`, `.integration.test.ts(x)` or `.e2e.test.ts`. A file with a level suffix outside a test folder fails too. Support files that declare no test need no suffix, and `main-server/eval/` is not a test folder. The check names each file that fails. Every test file still has its old name today, so this ticket adds the check to no package's `pnpm lint`. Each rename ticket adds it for its own package.

**The Node pin** (the P09 spec's "The Node pin"). `.nvmrc` changes from `24` to the exact `24.x.y` that runs on the measurement Mac. CI reads `.nvmrc` through `node-version-file`, so CI runs the same version and no workflow changes.

**Renamed files and box comments.** `CLAUDE.md` and `AGENTS.md` each gain the same line under "AI-generated code markers": "A file that is only renamed, its content unchanged, gets no new row." The rename tickets follow this rule.

## Acceptance criteria

- [ ] The script runs with `node` alone on Node's own TypeScript support, imports only Node's built-in modules, and can be called on one package's files.
- [ ] In `test/` or `__tests__/`, a file that declares a test passes with exactly one level suffix and fails with none or with two. A file with a level suffix outside a test folder fails. A support file in a test folder that declares no test passes without a suffix.
- [ ] Files under `main-server/eval/`, such as the benchmark's `*.eval.ts`, are not checked as test files.
- [ ] The check names every file that fails and exits non-zero when any file fails.
- [ ] `## Comments` shows the check passing on a sample of renamed paths that covers all three levels and failing on a planted test file with no level suffix, with the output of each run.
- [ ] No package's `lint` script calls the check yet.
- [ ] `.nvmrc` holds the one exact `24.x.y` that `node --version` prints on the measurement Mac, and no CI workflow file changes.
- [ ] `CLAUDE.md` and `AGENTS.md` each have the new line word for word under "AI-generated code markers", and the two files are still identical.
- [ ] The new script starts with the AI-generated box and its first row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
