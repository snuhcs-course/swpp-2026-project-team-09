# 09: Collection evaluation run

**What to build:** Judgements and the same-event step scored over the C0 sets with the real model, so that the collection work shows how well it does against its committed thresholds. Metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** 01, 05 (and 08, unless it was cut)

**Status:** ready-for-agent

- [ ] Evaluation A (C1–C4) is run over the held-out set on a clean commit and recorded: commit, date and time, model slug, cost, scores and each threshold's pass or fail.
- [ ] Evaluation B (D1–D5) is run the same way, unless the same-event ticket was cut, in which case the record says so.
- [ ] A failure analysis table is written for the failed posts and pairs.
- [ ] The scores go into the improvement log table.
