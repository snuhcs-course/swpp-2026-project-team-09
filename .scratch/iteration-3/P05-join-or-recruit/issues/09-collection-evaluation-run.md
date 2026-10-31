# 09: Collection evaluation runs

**What to build:** Judgements and the same-event step scored over the C0 sets with the real model, against the R0 of each evaluation, so that the collection work shows how well it does against its committed thresholds. Metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** 01, 05 (and 08a, 08b, unless they were cut)

**Status:** ready-for-agent

- [ ] R0 of each evaluation (the rules alone for A; equal starts and title similarity for B) is run over the held-out sets and recorded.
- [ ] Then each change is run on its own, one change per run: the Judgement (A), the rules of 08a (B), the AI's choice of 08b (B).
- [ ] Each run is on a clean commit and records the exact command, the commit, the date and time, the model slug, the checks turned on, the campus setting, the cost, the scores and each threshold's pass or fail.
- [ ] A missed floor of C2, C3 or D1 turns automatic publication off in Production, and the record says so.
- [ ] `AUTOMATIC_JUDGEMENT` is turned on in Production only after evaluation A's floors are met and the posts may be sent to the model provider, and the record says so.
- [ ] A failure analysis table is written for the failed posts and pairs, and the scores go into the improvement log table.
