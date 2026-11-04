# 06: Changes 2 to 4, the chat's after set, the regression, and the chat's pull request

Parent: [P11 spec](../spec.md) ("The chat: changes", "The chat: reading the after set", "Records")
Status: ready-for-agent
Blocked by: 05

## What to build

The remaining changes address the failures that ticket 04 listed from the before set's layer report, one per run, lowest layer first, until the list is done or four changes have been made in all. The after set then runs on the branch's final code, and its reading gives the chat's "after": the P4 suite and the holdout beside the before set, and the P19 regression against R0. The branch then merges `3.0/Main` and goes into it as one pull request for tickets 04 to 06.

It works on ticket 04's branch.

## Acceptance criteria

### The changes

- [x] Each change addresses a failure on ticket 04's list, lowest layer first: the action, the tools, the arguments, the cards with the map buttons, the Proposal, the reply's words. The smoke run's finding, a reply that leaves out the gap and the count, is a candidate only if it is on the list.
- [x] Each change is one change, followed by one P4 suite run with the same set, world and settings, under ticket 04's run checks and budget rule. It is compared with the last kept run by `pnpm eval:compare`. A change that makes things worse is reverted, and the revert stays in the record.
- [x] Each change gets one line in `record.md`: hypothesis → what changed → the cases that changed → kept or reverted, with the run's commit, date and cost. Its result files stay local.
- [x] **The changes stop** when the list has no failure left to fix, or after the fourth change counting change 1. There is no fifth, and no date cutoff.
- [x] `compound-menus-and-shuttle` and `follow-up-seven-oclock` are not targeted.
- [x] The existing unit and integration tests of the Assistant, including the labels test, stay green after every kept change.

### The after set

- [ ] At the branch's final code, with the before set's settings and ticket 04's run checks and budget rule: the P4 suite once, the holdout once, and P19 three times at 1,000 output tokens.
- [x] **The P4 suite:** each threshold's pass or fail, overall and per category, and the 6 layer rates, before and after, in `record.md`.
- [ ] **The holdout:** only its pass rate and layer rates are read, beside those of the same 12 fixed-set cases in the same run. No holdout failure is opened until P11 is over.
- [x] **The regression:** the after set's P19 runs against R0's (`28c0ce1`, 1,000 output tokens) by the frozen rule.
  - A case that newly fails is charged to another task when it also fails in at least 2 of X's 3 runs.
  - A case that newly fails because of P11's code is recorded as a fail, with its cause, for P20.
  - `compound-menus-and-shuttle` and `follow-up-seven-oclock` are read again, and if they still newly fail they are recorded as fails with their cause.
- [x] If ADR 0009's condition holds, regressions or worse tool choice left after the prompt is fixed, `record.md` gets one line saying a router is reconsidered in iteration 4. Otherwise nothing is written.
- [ ] The after set's result files are committed, and `record.md` gets their entries as for the before set.
- [x] **P04 ticket 05's "After the change: regression"** is ticked: recorded from R0 and R0p by ticket 06 of P04, and read again here.

### The pull request

- [ ] After the after set, the branch merges `3.0/Main`, and `record.md` says what came in.
- [ ] One pull request for tickets 04 to 06 goes into `3.0/Main`.

## Comments
