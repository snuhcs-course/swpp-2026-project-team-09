# 09: Collection evaluation runs

**What to build:** Judgements and the same-event step scored over the C0 sets with the real model, against the R0 of each evaluation, so that the collection work shows how well it does against its committed thresholds. Metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** 01, 05 (and 08a, 08b, unless they were cut)

**Status:** ready-for-agent

- [ ] R0 of each evaluation (the rules alone for A; equal starts and title similarity for B) is run over the held-out sets and recorded.
- [ ] Then each change is run on its own, one change per run: the Judgement (A), the rules of 08a (B), the AI's choice of 08b (B).
- [ ] Before the Judgement's run, how many extra.snu places name a Place only by name is measured without a model, and the number is written in this ticket: `matchedPlace` over the place fields of saved extra.snu pages outside `set-a.yaml`, such as those of ticket 04 in `worker-server/test/pages`. No held-out post or label is read for it.
- [ ] Unless that shows almost none, a Source setting takes a place named only by a Place's name as Gwanak, on for extra.snu, beside `buildingNumberIsGwanak` in `post-sources.ts`, and the spec's place check says so. It is one more change with its own run of evaluation A, and it stays only if C2 and C3 stay within their floors; otherwise it is removed and this ticket says why.
- [ ] Each run is on a clean commit and records the exact command, the commit, the date and time, the model slug, the checks turned on, the campus setting, the cost, the scores and each threshold's pass or fail.
- [ ] A missed floor of C2, C3 or D1 turns automatic publication off in Production, and the record says so.
- [ ] `AUTOMATIC_JUDGEMENT` is turned on in Production only after evaluation A's floors are met and the posts may be sent to the model provider, and the record says so.
- [ ] A failure analysis table is written for the failed posts and pairs, and the scores go into the improvement log table.

## Comments

Why the setting (2026-11-01, ticket 05's review): a place such as `중앙도서관 관정관 3층 양두석홀` has neither 서울대 nor a building number, so `namedPlace` refuses it and the session stays a Draft, however well the model reads it. A model cannot add the campus, since the place must be in its quoted line. extra.snu is the university's own site, so a name there is less likely to mean elsewhere. The risk is a general name such as `체육관`, or an event off campus, linked to a wrong Place, and C3's floor is 0. Places another campus or address names stay refused by `namedPlace`. The rules' reading stays as it is: the setting is for the Judgement's `matchedPlace` only, and R0 does not change.
