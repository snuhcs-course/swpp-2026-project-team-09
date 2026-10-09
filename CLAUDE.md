# Repository instructions

## Agent skills

### Issue tracker

Issues and specs are tracked locally as Markdown files under `.scratch/iteration-<N>/P<NN>-<slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles as `Status:` values in local issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Collaboration

Keep `AGENTS.md` and `CLAUDE.md` synchronized. Whenever repository instructions change, update both files together with the same content.

## AI-generated code markers

Every source file starts with a box comment that records when an agent changed it, with which Claude model and for whom, below a shebang if it has one. Markdown, JSON, lockfiles, Prisma migrations, test fixtures and third-party files get none.

```
/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-08  Fable 5.1  prompted by fyoon46
 ******************************************************************************/
```

Files whose comments start with `#` (shell, YAML, Dockerfile) draw the same box with `#`, and Prisma schemas with `//`.

- When an agent changes a file, it adds a row at the bottom of the box: today's date, its model and the GitHub ID of the person who prompted it (`gh api user --jq .login`). Skip the row if one with the same date, model and person is already there. A new file gets the box with its first row. Never change or remove a row.
- A change made only by hand adds no row. A file written wholly by hand gets no box.
- When two branches add rows to the same file, the merge keeps both, in date order.
- For a single line, `git blame` gives the commit that last changed it; its `Co-Authored-By: Claude …` trailer names the model.
- `git grep -l "AI-generated with Claude"` lists the marked files; the AI Collaboration Report points to it.
- Rows for Iteration 1 were filled in from the commit history: each row is a day on which a person's commit carrying a `Co-Authored-By: Claude` trailer changed the file.

## Usage reporting

When you finish a ticket, record the agent work it took under the ticket's `## Comments`, in a dated `### Agent usage (YYYY-MM-DD)` section:

- Agent time: how long agents worked on it, summed over every session, including sessions in other worktrees. Time spent waiting for a person does not count. It is an estimate; say so.
- Tokens: input and output, with the input's cache reads and cache writes shown separately. Include subagents.

People record their own time themselves.
