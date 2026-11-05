# 07: The before/after table, and P04's remaining items

Parent: [P11 spec](../spec.md) ("Records", "P04's open items")
Status: ready-for-agent
Blocked by: 02, 03, 06

## What to build

One table under this spec's directory puts the before and after of the three strands side by side, so that P20 can cite it without reading three tickets. P04's open items that no other ticket closes are ticked, with what replaced them, so that P04 closes.

It starts on a new branch from `3.0/Main` after tickets 02, 03 and 06 have merged.

## Acceptance criteria

- [x] **The before/after table**, each number linked to where it is recorded:
  - the walking table: the original and the rebuilt table's MAE, the share within under both tolerances, the threshold under both, the three diagnostics, and whether the rebuilt table was adopted (P04 ticket 01);
  - the shuttle: the fallback against the derived times, the ride and wait MAEs against their baselines, the threshold, and the five rides' MAE against the logged medians and against the fallback (P04 ticket 02);
  - the chat: before and after, each threshold overall and per category, the 6 layer rates, the holdout's rates, the regression's verdict, and the cost of P11's runs (`record.md`).
- [x] **P04 ticket 03:**
  - the reply-text fix is ticked: replaced by P05's ticket 10a (#164);
  - **Person: the TA** is closed: closed by the PM on 2026-11-05. Nothing about it goes into the testing document;
  - the baseline is ticked: replaced by P05's R0 on `28c0ce1`, as P04's ticket 06 recorded.
- [x] **P04 tickets 04 and 05, landing before P05's R0**, are ticked: they landed on 11-01, after R0, and P05's R0p on `871886a` stands in, as P04's ticket 06 recorded.
- [x] Every item of the spec's "P04's open items" is ticked on its P04 ticket, by this ticket or by the ticket that did the work.

## Comments

The table is [before-after.md](../before-after.md). At first, its first box stayed open: the after set's holdout had not run, since it would take P11's runs over the USD 10 the PM approved.

Later on 2026-11-05 the PM approved the holdout, which ran at `55d882bc`. Its rates and the cost of P11's runs with it, USD 10.1710, are in the table, and the first box is ticked.

### Agent usage (2026-11-05)

- **Agent time** (estimate): about 28 minutes: about 25 of the orchestrating session, the holdout's entry included, and about 3 for the reviewer. Time spent waiting for a person is not counted.
- **Tokens** (the reviewer's, measured from its transcript; the orchestrating session's are counted once, under ticket 06):
  - Input: 38 not cached, 1,544,542 cache reads and 77,674 cache writes.
  - Output: 13,455.
