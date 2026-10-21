# 02: The scorer and the scorecard

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the trace and the case format)

## What to build

The runner's raw JSON is scored with fixed rules, and a developer reads the result as a Markdown scorecard and compares two runs side by side. Scoring needs no model, so a saved run can be scored again for free. The rules are those of the spec's "Scoring (rules only)" and "The scorecard", written so that the improvements in the spec's "Staying valid when the Assistant changes" table need only small edits.

## Acceptance criteria

- [ ] Each scored turn gets its action from its trace and reply: TOOL, ASK, PROPOSE, REFUSE, CHAT, or a combination (TOOL+ASK, PROPOSE+ASK), as the spec defines them. ASK rests on the case's `text.mentions` backed by the trace (a resolver's `several`/`none`, `proposeQuest`'s `refused`), never on a trailing question mark alone.
- [ ] The case format's `expect` is defined and validated: accepted `actions` (one or more), `tools.required`, `tools.allowed`, `tools.forbidden` (`"*"` for none), `args`, `proposal` fields, `cards` (kind, seed names, count limits), `mapButtons`, `text.mentions` (each a word or an any-of list of words), and `knownFailure` (a reason).
- [ ] A turn passes when its action is accepted and every check passes; a case passes when all its scored turns pass; a live case's later turns count as not run after a failed turn.
- [ ] Arguments and tool results are compared through one normaliser per tool, in one place: dates to `YYYY-MM-DD` in Korea, times to `HH:MM`, resolver words trimmed, Boards by name.
- [ ] Over-calling (tools outside `required ∪ allowed`, forbidden tools, the same call repeated with the same arguments) and under-calling (a required tool not called) are counted.
- [ ] Failure kinds (STEP_LIMIT, TIMEOUT, ERROR) are counted per category; cases run three times report pass^3.
- [ ] The Markdown scorecard holds: action recall per kind (the headline), tool selection and argument accuracy, over- and under-calling, pass rate per category with known failures apart (never counted as regressions) and the known failures that now pass listed, failure kinds, pass^3, average steps and latency, tokens in (cache read, cache write) and out with the estimated cost, the settings used, each failed case with its trace, and the full text and length of every reply in REFUSE, CHAT and ambiguous-intent cases.
- [ ] `pnpm eval` writes the scorecard beside the raw JSON; a saved raw run can be scored again on its own.
- [ ] `pnpm eval:compare <a> <b>` prints two scorecards side by side with the differences.
- [ ] Unit tests with hand-made traces cover every action kind and combination (an ASK without a question mark passes, a lookup ending in a courtesy question is not ASK), each check, known failures, the normalisers, the failure kinds and pass^3, and run in CI.

## Comments
