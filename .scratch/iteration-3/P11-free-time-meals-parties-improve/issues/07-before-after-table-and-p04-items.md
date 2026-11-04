# 07: The before/after table, and P04's remaining items

Parent: [P11 spec](../spec.md) ("Records", "P04's open items")
Status: ready-for-agent
Blocked by: 02, 03, 06

## What to build

One table under this spec's directory puts the before and after of the three strands side by side, so that P20 can cite it without reading three tickets. P04's open items that no other ticket closes are ticked, with what replaced them, so that P04 closes.

It starts on a new branch from `3.0/Main` after tickets 02, 03 and 06 have merged.

## Acceptance criteria

- [ ] **The before/after table**, each number linked to where it is recorded:
  - the walking table: the original and the rebuilt table's MAE, the share within under both tolerances, the threshold under both, the three diagnostics, and whether the rebuilt table was adopted (P04 ticket 01);
  - the shuttle: the fallback against the derived times, the ride and wait MAEs against their baselines, the threshold, and the five rides' MAE against the logged medians and against the fallback (P04 ticket 02);
  - the chat: before and after, each threshold overall and per category, the 6 layer rates, the holdout's rates, the regression's verdict, and the cost of P11's runs (`record.md`).
- [ ] **P04 ticket 03:**
  - the reply-text fix is ticked: replaced by P05's ticket 10a (#164);
  - **Person: the TA** is closed: closed by the PM on 2026-11-05. Nothing about it goes into the testing document;
  - the baseline is ticked: replaced by P05's R0 on `28c0ce1`, as P04's ticket 06 recorded.
- [ ] **P04 tickets 04 and 05, landing before P05's R0**, are ticked: they landed on 11-01, after R0, and P05's R0p on `871886a` stands in, as P04's ticket 06 recorded.
- [ ] Every item of the spec's "P04's open items" is ticked on its P04 ticket, by this ticket or by the ticket that did the work.

## Comments
