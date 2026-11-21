# 02: `main` carries the nightly schedule

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: None

## What to build

GitHub fires a `schedule` only from the default branch's copy of a workflow, and the default branch is `main`, which holds the previous iteration. A pull request against `main` adds `.github/workflows/nightly.yml`, byte for byte the copy in ticket 01, and nothing else.

## Acceptance criteria

- [ ] The pull request against `main` changes only `.github/workflows/nightly.yml`.
- [ ] The workflow has `actions: write` and `contents: read` and no other permission.
- [ ] While the newest `<line>/Main`'s `ci.yml` has no `workflow_dispatch`, a nightly run ends green with a notice and starts nothing; once it has one, the nightly run starts `ci.yml` there.
- [ ] Merged into `main` only on the repository administrator's word.

## Comments
