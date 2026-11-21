# 02: `main` carries the nightly schedule

Parent: [A01 spec](../spec.md)
Status: in-progress
Blocked by: None

## What to build

GitHub fires a `schedule` only from the default branch's copy of a workflow, and the default branch is `main`, which holds the previous iteration. A pull request against `main` adds `.github/workflows/nightly.yml`, byte for byte the copy in ticket 01, and nothing else.

## Acceptance criteria

- [x] The pull request against `main` changes only `.github/workflows/nightly.yml`.
- [x] The workflow has `actions: write` and `contents: read` and no other permission.
- [ ] While the newest `<line>/Main`'s `ci.yml` has no `workflow_dispatch`, a nightly run ends green with a notice and starts nothing; once it has one, the nightly run starts `ci.yml` there.
- [ ] Merged into `main` only on the repository administrator's word.

## Comments

- 2026-11-21: opened as #413 against `main`. The scheduled run itself is checked only after the merge, by the first nightly at 03:00 KST. Agent usage is recorded in ticket 01.
