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

### Review fixes (2026-10-22)

After the two-axis review of 7b356f2; these replace the matching decisions above.

- TOOL follows the spec: cards or map buttons shown, or a lookup answered `none` and the case gives mentions that
  the text holds. A lookup that found something and showed nothing is no action.
- An ASK read from the trace alone (a resolver's `several`/`none`, proposeQuest's `refused`) is still classified ASK,
  so a wrong one shows, but it counts as right and recalled only when the case's mentions hold (`TurnScore.recalled`,
  which the action check uses too). The same holds for the ASK part of TOOL+ASK and PROPOSE+ASK.
- Failure kinds per category count every turn that ran, scored or not.
- Over-calling is counted call by call: each call outside `required ∪ allowed` or forbidden, else each repeat of an
  earlier identical call.
- The replies to review are those of cases that accept REFUSE or CHAT and of the category `ambiguous-intent` (the
  name ticket 03 is to use; `REVIEWED_CATEGORIES` in `eval/scorecard.ts`).
- Left as is, as agreed: a case that accepts only PROPOSE reads a Proposal with a question as PROPOSE; cards alone
  mean TOOL.
- Standards: the arithmetic over a scored run moved to `eval/run-score.ts` (one `averagesOf` for the scorecard and the
  comparison); `recall` is a list over `KINDS`; `Outcome` comes from one `as const` list; `proposalMismatches`;
  `RunLog.keepSeeds`. The `expect` schema is unchanged.

### Review by 함재현 (2026-10-22)

On #110, after #108 was squash-merged into `2.0/Main` (023384d); the branch is rebased onto it.

- Observed action, for diagnosis only (`eval/observed.ts`): read without the case's `expect`. ASK when nothing is
  shown and the last sentence asks back by `ASK_CUES` (`?`, 까요, 할래요, 주세요, 어떠세요, 알려 주세요, and 실래요,
  나요, which I added) or the trace calls for a question; TOOL and PROPOSE as the case-free parts of the scorer's
  rules, +ASK by the same cues; `NO_TOOL` for no tool and no question, since REFUSE and CHAT cannot be told apart
  without the label; `NONE` for tools and none of the kinds; the failure kind for a failed turn. The scorecard and
  `eval:compare` show it as a confusion table, a row per set of accepted actions. It decides no pass; `recalled` and
  the pass rules are unchanged. A courtesy question ("더 궁금한 거 있으세요?") reads as +ASK here, which only the
  case's mentions tell apart.
- A lookup that found data and was answered in words is TOOL; a missing button or card fails its own check.
- Tool calls refused by their input schema before `execute`: `StepEnd` carries the step's tool errors (the step
  result's `tool-error` parts), and the recorder gives them to calls that have neither result nor error. Production
  passes no observer and is unchanged.

### Agent usage (2026-10-22)

- Agent time: about 2 hours (estimate), the scorer subagent's session in its worktree, both reviews included.
- Tokens (estimate, this session only): about 26M input, of which about 25.2M cache reads and 0.5M cache writes, and
  about 130k output. No subagents.
