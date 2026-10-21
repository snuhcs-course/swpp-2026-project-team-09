# 02: The scorer and the scorecard

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the trace and the case format)

## What to build

The runner's raw JSON is scored with fixed rules, and a developer reads the result as a Markdown scorecard and compares two runs side by side. Scoring needs no model, so a saved run can be scored again for free. The rules are those of the spec's "Scoring (rules only)" and "The scorecard", written so that the improvements in the spec's "Staying valid when the Assistant changes" table need only small edits.

## Acceptance criteria

- [x] Each scored turn gets its action from its trace and reply: TOOL, ASK, PROPOSE, REFUSE, CHAT, or a combination (TOOL+ASK, PROPOSE+ASK), as the spec defines them. ASK rests on the case's `text.mentions` backed by the trace (a resolver's `several`/`none`, `proposeQuest`'s `refused`), never on a trailing question mark alone.
- [x] The case format's `expect` is defined and validated: accepted `actions` (one or more), `tools.required`, `tools.allowed`, `tools.forbidden` (`"*"` for none), `args`, `proposal` fields, `cards` (kind, seed names, count limits), `mapButtons`, `text.mentions` (each a word or an any-of list of words), and `knownFailure` (a reason).
- [x] A turn passes when its action is accepted and every check passes; a case passes when all its scored turns pass; a live case's later turns count as not run after a failed turn.
- [x] Arguments and tool results are compared through one normaliser per tool, in one place: dates to `YYYY-MM-DD` in Korea, times to `HH:MM`, resolver words trimmed, Boards by name.
- [x] Over-calling (tools outside `required ∪ allowed`, forbidden tools, the same call repeated with the same arguments) and under-calling (a required tool not called) are counted.
- [x] Failure kinds (STEP_LIMIT, TIMEOUT, ERROR) are counted per category; cases run three times report pass^3.
- [x] The Markdown scorecard holds: action recall per kind (the headline), tool selection and argument accuracy, over- and under-calling, pass rate per category with known failures apart (never counted as regressions) and the known failures that now pass listed, failure kinds, pass^3, average steps and latency, tokens in (cache read, cache write) and out with the estimated cost, the settings used, each failed case with its trace, and the full text and length of every reply in REFUSE, CHAT and ambiguous-intent cases.
- [x] `pnpm eval` writes the scorecard beside the raw JSON; a saved raw run can be scored again on its own.
- [x] `pnpm eval:compare <a> <b>` prints two scorecards side by side with the differences.
- [x] Unit tests with hand-made traces cover every action kind and combination (an ASK without a question mark passes, a lookup ending in a courtesy question is not ASK), each check, known failures, the normalisers, the failure kinds and pass^3, and run in CI.

## Comments

### Scorer built (2026-10-22)

Built on `2.0/P19-02-scorer`, from `2.0/P19-01-runner` (PR #108, not merged yet). Not pushed; no PR yet.

- `eval/expect.ts`: the `expect` schema, now validated by the case loader for the case and for each live turn. A case
  that accepts an ASK must give `text.mentions`; `args` are only of `required` tools; a tool cannot be both forbidden
  and required or allowed; `"*"` in `forbidden` allows no other list. `knownFailure` may sit on the case (ticket 01)
  or in `expect`, not both. `cards` is a list of `{ kind, seeds, min, max }`; `mapButtons` must be the very set shown.
- `eval/normalise.ts`: one table entry per tool (its role and how each field is read), the reply's cards and
  Proposal, and each call's outcome. Ids are read as seed names through the world's seeds, which the run file now
  keeps (`RunLog.seeds`), so a saved run is scored again with no database.
- `eval/score.ts` (turns and cases), `eval/run-score.ts` (a run's numbers), `eval/scorecard.ts`, `eval/compare.ts`,
  and the commands `pnpm eval:score` and `pnpm eval:compare`. `run.eval.ts` passes the scorer as the runner's
  `passed` hook and writes the scorecard beside the raw JSON.
- Decided where the spec left room:
  - The mentions mean what the case accepts: in a case that accepts an ASK they are the question; otherwise they are
    what the text must say (the "says so" of a lookup that found nothing). A lookup that answered without showing
    anything counts as TOOL when, in a case that accepts no ASK, the text holds the mentions, so a menu answer
    without its button is TOOL that fails the `mapButtons` check rather than another action.
  - Plain ASK is also read when the trace calls for one (a resolver's `several`/`none`, proposeQuest's `refused`)
    even if the case expects something else, so that a wrong ASK shows in the recall. A Proposal in the reply
    overrides an earlier `refused`.
  - Tools called but none of the rules met (for example a resolver answered `one` and the reply proposed nothing)
    is "none", never accepted.
  - Action recall: a turn counts toward the kinds of its action when accepted, else of the first accepted action;
    a combination counts toward both kinds and is recalled only whole. Known failures are included.
  - Only a forbidden tool fails a turn; other over-calling is counted only. Repeated calls compare normalised
    arguments.
  - Pass rate per category counts every run of a repeated case; pass^k is over the cases run more than once, k
    their run count.
  - In a live case, a turn with its own `expect` is scored; the last turn falls back to the case's `expect`.
- The real-model run of ticket 01 is still open; no run of the scorer against real traces yet.

### Agent usage (2026-10-22)

- Agent time: about 1 hour (estimate), the scorer subagent's session in its worktree.
- Tokens (estimate, this session only): about 10M input, of which about 9.6M cache reads and 0.3M cache writes, and
  about 70k output. No subagents.
