# 02: The scorer and the scorecard

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the trace and the case format)

## What to build

The runner's raw JSON is scored with fixed rules, and a developer reads the result as a Markdown scorecard and compares two runs side by side. Scoring needs no model, so a saved run can be scored again for free. The rules are those of the spec's "Scoring (rules only)" and "The scorecard", written so that the improvements in the spec's "Staying valid when the Assistant changes" table need only small edits.

## Acceptance criteria

- [ ] Each scored turn gets its action from its trace and reply: TOOL, ASK, PROPOSE, REFUSE, CHAT, or a combination such as TOOL+ASK, as the spec defines them.
- [ ] The case format's `expect` is defined and validated: accepted `actions` (one or more), `tools.required`, `tools.forbidden` (`"*"` for none), `args`, `proposal` fields, `cards` (kind, seed names, count limits), `mapButtons`, `text.mentions`.
- [ ] A turn passes when its action is accepted and every check passes; a case passes when all its scored turns pass; a live case's later turns count as not run after a failed turn.
- [ ] Arguments and tool results are compared through one normaliser per tool, in one place: dates to `YYYY-MM-DD` in Korea, times to `HH:MM`, resolver words trimmed, Boards by name.
- [ ] Over-calling (unneeded or forbidden tools) and under-calling (a required tool not called) are counted.
- [ ] Failure kinds (STEP_LIMIT, TIMEOUT, ERROR) are counted per category; cases run three times report pass^3.
- [ ] The Markdown scorecard holds: action recall per kind (the headline), tool selection and argument accuracy, over- and under-calling, pass rate per category with ambiguous intent apart, failure kinds, pass^3, average steps and latency, tokens in (cache read, cache write) and out with the estimated cost, the settings used, and each failed case with its trace.
- [ ] `pnpm eval` writes the scorecard beside the raw JSON; a saved raw run can be scored again on its own.
- [ ] `pnpm eval:compare <a> <b>` prints two scorecards side by side with the differences.
- [ ] Unit tests with hand-made traces cover every action kind and combination, each check, the normalisers, the failure kinds and pass^3, and run in CI.

## Comments
