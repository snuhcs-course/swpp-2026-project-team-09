# Repository instructions

## Agent skills

### Issue tracker

Issues and specs are tracked locally as Markdown files under `.scratch/iteration-<N>/P<NN>-<slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles as `Status:` values in local issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Collaboration

Keep `AGENTS.md` and `CLAUDE.md` synchronized. Whenever repository instructions change, update both files together with the same content.

## Usage reporting

When you finish a ticket, record the agent work it took under the ticket's `## Comments`, in a dated `### Agent usage (YYYY-MM-DD)` section:

- Agent time: how long agents worked on it, summed over every session, including sessions in other worktrees. Time spent waiting for a person does not count. It is an estimate; say so.
- Tokens: input and output, with the input's cache reads and cache writes shown separately. Include subagents.

People record their own time themselves.
