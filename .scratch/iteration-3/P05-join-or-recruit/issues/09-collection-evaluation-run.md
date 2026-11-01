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

The run of the AI's choice of 08b is with `SAME_EVENT_AI_CHOICE=on`, and the runs before it with it `off`, so that each run changes one thing (2026-11-01, ticket 08b).

### Decisions (2026-11-01)

Decided by Jaehyun0320 before the work, where the documents have no value.

- **The worker's parser is imported where it stands, only in a real run,** and its output goes through the collection message's schema. CI's tests give the parsed posts: main-server's CI has no worker dependencies.
- **Evaluation B reads one saved reading:** the rules' times, and for what they left, the sessions of a Judgement that pass its checks, as the step does. The Judgement run asks about the posts of both evaluations, so B's three runs change one thing and call no model for it. **So R0 of B runs after the Judgement**: R0 of A, the Judgement, the Place setting, R0 of B, 08a's rules, 08b's AI.
- **Candidates** are the sessions within a day of the posts the set pairs with the post, since any other pair has no answer. One call per post, as in production, so a trap and its true pair are in one call. Each post starts from the world the set gives: nothing attached earlier carries over.
- **Which post of a pair came first:** extra.snu before SNU Now, then the smaller key. Every saved body link goes that way. A pair whose SNU Now post came first is not measured.
- **D1** counts false pairs with any session attached automatically. **D2** counts a pair attached when one of its sessions is; with the queue, also when a held session has the other post among its candidates. **D3** counts true pairs a link rule took or whose other post is among the candidates; one a refusing rule then took out is a failure of that rule, not of D3. **D4** is held sessions by `heldFor` over the new posts' sessions that reached the step, links not one to one included. **D5** counts posts of many pairs where every true pair attached and no false one did. **D6** counts true pairs attached with no person.
- **R0 of B's similarity** is the Dice coefficient of letter pairs of `normalisedTitle`, at least 0.5, with equal starts. It is fixed before any run and not tuned.
- **C3's floor is judged on published sessions.** Those a check stopped never reach a User; they are reported beside it as a diagnosis.
- **Aligning a session with the answer:** the same minute, then the same day, then what is left in order. A published session with none is wrong.
- **C2's end:** wrong when it differs from the answer's, or when the answer has none and an end was given. Left out, it lowers only C4's recall. A label of a day alone is compared by day for a period; a time of day given away from a period is wrong.
- **C4** reads every value the model gave before the checks. Schema validity is over the answers received, and failed calls are reported apart. **C6** is over every session of the answer, one with no output being wrong, so R0 scores low: the rules do not judge a period.
- **C7** has no label: a wrongly published session whose day stands on a line about applying counts, and a person checks it in the failure analysis.
- **A run's conditions:** today is each post's `fetchedAt`. One call per post, with no retry. Only the held-out part is scored. A failed call is recorded, and asked about before any run again. The budget stops a run past USD 1.
- **The Place setting's run reads the Judgement's saved answers again** with the setting on: it does not change the prompt, and another call would add the model's own variation to the one change. Evaluation B's three runs all hold the setting as evaluation A decided.

### Places named only by a Place's name (measured 2026-11-01, no model)

`matchedPlace` over the place fields of the 24 extra.snu pages outside `set-a.yaml` that are not held out (5 of ticket 04 in `worker-server/test/pages`, and the development posts of `set-b.yaml`, 2 pages shared), with `labels/places.tsv`. 48 sessions:

| Result | Sessions |
|---|---|
| Matched already | 5 |
| Matched only with the setting | 28 (of 9 programmes) |
| Matched neither way (online, off campus) | 12 |
| No place given | 3 |

That is not almost none, so the setting is built: `placeNameIsGwanak`, on for extra.snu, for the Judgement's `matchedPlace` only. The 28 hold a risk the run must show: `금나래문화체육센터 2층 체육관`, off campus, links to `71 체육관`, for 2 sessions. They also hold a building number with more words after it, such as `906동 4층 세미나실` and `920동 다인홀`.
