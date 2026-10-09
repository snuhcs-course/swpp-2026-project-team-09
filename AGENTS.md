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

Every source file starts with one marker line, below a shebang if it has one. Markdown, JSON, lockfiles, Prisma migrations, test fixtures and third-party files get none. Names are GitHub IDs.

```
// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #2 #4 #31
```

- The line accumulates. When an agent changes a file in a PR, update its line in that PR: add the model and the person who prompted the agent if they are new, and move the end date. Never remove an earlier entry.
- Every PR needs an approval from someone other than its author. When you open the PR, add its number and its reviewer after `reviewed by … in` on every file it changes; the approval confirms that line. If the reviewer changes, change the line before merging.
- A file written wholly by hand gets no marker. A hand edit to a marked file leaves the marker as it is.
- The marker summarises the file. For a single line, `git blame` gives the squash commit, whose `(#N)` names the PR and whose `Co-Authored-By: Claude …` trailer names the model.
- `git grep -l "AI-generated with Claude"` lists the marked files; the AI Collaboration Report points to it.
- Markers added in Iteration 1 list only PRs that had an approval; files whose PRs had none show `prompted by` alone.

## Usage reporting

When you finish a ticket, record the agent work it took under the ticket's `## Comments`, in a dated `### Agent usage (YYYY-MM-DD)` section:

- Agent time: how long agents worked on it, summed over every session, including sessions in other worktrees. Time spent waiting for a person does not count. It is an estimate; say so.
- Tokens: input and output, with the input's cache reads and cache writes shown separately. Include subagents.

People record their own time themselves.
