# 04: The chat's before set at X

Parent: [P11 spec](../spec.md) ("The chat: the fixed commit and the branch", "The chat: settings and sets", "Records")
Status: ready-for-agent
Blocked by: none

## What to build

The chat's working branch is cut from X, and the before set runs on it: the P4 suite's first official run, one holdout run and three P19 runs. The record gets X, each run's entry and the list of failures that the later changes may address. Nothing in the prompt, the tools or the cases changes here.

Tickets 04, 05 and 06 share this one branch. It does not merge `3.0/Main` until ticket 06's after set has run, and it goes into `3.0/Main` as one pull request at the end of ticket 06.

It starts after the spec's pull request has merged.

## Acceptance criteria

- [x] **X** is the tip of `3.0/Main` when this branch is cut. Its hash goes into `record.md`.
- [x] **Every run** uses OpenRouter, the path at X, with `anthropic/claude-haiku-5.5`, 8 steps, 30 s and the provider's default decoding.
- [x] **Before each run** the agent checks the command, the commit, the settings and the estimated cost against the spec, and the cost against what is left of the USD 10, then starts it without asking. Each run passes `--budget`. A run that would take the total over USD 10 is not started, and the PM is asked.
- [x] **The before set**, at X:
  - the P4 suite once, `pnpm eval --world p4`, at 4,000 output tokens (every case runs 3 times);
  - the holdout once, `pnpm eval:holdout`, at 4,000 output tokens;
  - P19 three times, `pnpm eval`, at 1,000 output tokens.
- [x] **`record.md`** gets the P4 suite's first official run: the model with that day's `canonical_slug`, the decoding, the limits, the commit, the date, the command, each threshold's pass or fail overall and per category, the 6 layer rates, the runs that failed on the reply's words alone, and the cost.
- [x] `record.md` gets the holdout's line, with its pass rate and layer rates beside those of the same 12 fixed-set cases in this run, and the three P19 runs with their commit, limits and cost.
- [x] **The list of failures to fix**, from the P4 suite's layer report, lowest layer first, goes into `record.md` as the input of ticket 06.
- [x] **The before set's result files** are committed, although `eval/results/` is ignored.
- [x] **P04 ticket 05's "After both scenarios: the P4 suite"** is ticked: this run. P04 tickets 03's and 05's "Person: the cost" are ticked: the PM's approval of USD 10 on 2026-11-05.

## Comments

The before set is in [`record.md`](../../../../main-server/eval/p4/record.md#the-before-set-at-x), with the list of failures that ticket 06 takes its changes from. The first start of P19's second run was stopped after about 30 s because its budget was too tight for the run's cost; the record says so.

### Agent usage (2026-11-05)

- **Agent time** (estimate): about 25 minutes of the orchestrating session, which ran the set from the main checkout. The runs themselves took 37 minutes, 03:49 to 04:26 KST. Time spent waiting for a person is not counted.
- **Tokens:** no subagent worked on this ticket. The orchestrating session's tokens are counted once, under ticket 06.
