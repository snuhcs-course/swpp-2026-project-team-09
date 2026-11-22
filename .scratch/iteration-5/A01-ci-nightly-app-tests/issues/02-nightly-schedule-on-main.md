# 02: `main` carries the nightly schedule

Parent: [A01 spec](../spec.md)
Status: wontfix
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

### Withdrawn (2026-11-22)

- #413 was merged into `main` and then taken back out: `main` is again at `981722cb`, so no schedule fires.
- Why: `main` only ever fast-forwards to an iteration Main. No pull request or commit goes to `main` itself, whatever the technical reason.
- `nightly.yml` stays on `5.0/Main` and reaches `main` with a later fast-forward, when the schedule turns on by itself. Until then a scheduler outside GitHub starts the same run every night at about 03:00 KST, on the newest `<line>/Main`, with the command in the root README's § The nightly level, which anyone may also run by hand. The README, `nightly.yml`'s header and the spec were reworded to say so.

### Agent usage (2026-11-22)

One Claude Code session (Opus 5.5), no subagents, from the merge of #413 through this withdrawal.

- Agent time: about 0.2 hours of active work, an estimate from the session's message times (gaps over 5 minutes left out).
- Tokens: output 25,000; input 7,500,000, of which 7,400,000 cache reads, 100,000 cache writes and about 100 uncached. Figures are rounded and taken just before the last commit of this record.
