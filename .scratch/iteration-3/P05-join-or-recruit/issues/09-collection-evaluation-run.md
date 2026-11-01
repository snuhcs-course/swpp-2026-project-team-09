# 09: Collection evaluation runs

**What to build:** Judgements and the same-event step scored over the C0 sets with the real model, against the R0 of each evaluation, so that the collection work shows how well it does against its committed thresholds. Metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** 01, 05 (and 08a, 08b, unless they were cut)

**Status:** ready-for-agent

- [x] R0 of each evaluation (the rules alone for A; equal starts and title similarity for B) is run over the held-out sets and recorded.
- [x] Then each change is run on its own, one change per run: the Judgement (A), the rules of 08a (B), the AI's choice of 08b (B).
- [x] Before the Judgement's run, how many extra.snu places name a Place only by name is measured without a model, and the number is written in this ticket: `matchedPlace` over the place fields of saved extra.snu pages outside `set-a.yaml`, such as those of ticket 04 in `worker-server/test/pages`. No held-out post or label is read for it.
- [x] Unless that shows almost none, a Source setting takes a place named only by a Place's name as Gwanak, on for extra.snu, beside `buildingNumberIsGwanak` in `post-sources.ts`, and the spec's place check says so. It is one more change with its own run of evaluation A, and it stays only if C2 and C3 stay within their floors; otherwise it is removed and this ticket says why.
- [x] Each run is on a clean commit and records the exact command, the commit, the date and time, the model slug, the checks turned on, the campus setting, the cost, the scores and each threshold's pass or fail.
- [x] A missed floor of C2, C3 or D1 turns automatic publication off in Production, and the record says so.
- [ ] `AUTOMATIC_JUDGEMENT` is turned on in Production only after evaluation A's floors are met and the posts may be sent to the model provider, and the record says so.
- [x] A failure analysis table is written for the failed posts and pairs, and the scores go into the improvement log table.

## Comments

Why the setting (2026-11-01, ticket 05's review): a place such as `중앙도서관 관정관 3층 양두석홀` has neither 서울대 nor a building number, so `namedPlace` refuses it and the session stays a Draft, however well the model reads it. A model cannot add the campus, since the place must be in its quoted line. extra.snu is the university's own site, so a name there is less likely to mean elsewhere. The risk is a general name such as `체육관`, or an event off campus, linked to a wrong Place, and C3's floor is 0. Places another campus or address names stay refused by `namedPlace`. The rules' reading stays as it is: the setting is for the Judgement's `matchedPlace` only, and R0 does not change.

The run of the AI's choice of 08b is with `SAME_EVENT_AI_CHOICE=on`, and the runs before it with it `off`, so that each run changes one thing (2026-11-01, ticket 08b).

### Decisions (2026-11-01)

Decided by Jaehyun0320 before the work, where the documents have no value.

- **The worker's parser is imported where it stands, only in a real run,** and its output goes through the collection message's schema. CI's tests give the parsed posts: main-server's CI has no worker dependencies.
- **Evaluation B reads one saved reading:** the rules' times, and for what they left, the sessions of a Judgement that pass its checks, as the step does. The Judgement run asks about the posts of both evaluations, so B's three runs change one thing and call no model for it. **So R0 of B runs after the Judgement**: R0 of A, the Judgement, the Place setting, R0 of B, 08a's rules, 08b's AI.
- **Candidates** are the sessions within a day of the posts the set pairs with the post, since any other pair has no answer. One call per post, as in production, so a trap and its true pair are in one call. Each post starts from the world the set gives: nothing attached earlier carries over. The exception, decided 2026-11-02 after the review: the link rule counts every post the body names as stored, since it reads the whole store.
- **Which post of a pair came first:** extra.snu before SNU Now, then the smaller key. Every saved body link goes that way. A pair whose SNU Now post came first is not measured.
- **D1** counts false pairs with any session attached automatically, and, since 2026-11-02, a session attached to another session of a true pair of posts. **D2** counts a pair attached when one of its sessions is; with the queue, also when a held session has the other post among its candidates. **D3** counts true pairs a link rule took or whose other post is among the candidates; one a refusing rule then took out is a failure of that rule, not of D3. **D4** is held sessions by `heldFor` over the new posts' sessions that reached the step, links not one to one included. **D5** counts posts of many pairs where every true pair attached and no false one did. **D6** counts true pairs attached with no person.
- **R0 of B's similarity** is the Dice coefficient of letter pairs of `normalisedTitle`, at least 0.5, with equal starts. It is fixed before any run and not tuned.
- **C3's floor is judged on published sessions.** Those a check stopped never reach a User; they are reported beside it as a diagnosis.
- **Aligning a session with the answer:** the same minute, then the same day, then what is left in order. A published session with none is wrong.
- **C2's end:** wrong when it differs from the answer's, or when the answer has none and an end was given. Left out, it lowers only C4's recall. A label of a day alone is compared by day for a period; a time of day given away from a period is wrong. Whether it is a period is the answer's, not the model's (2026-11-02, also for the start).
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

### The Place setting is removed (2026-11-02)

Its run replayed the Judgement's saved answers with `placeNameIsGwanak` on, at `fed4a2e0`, with no model. C1 went from 27/64 to 32/64, and C2 from 0/27 to 2/34, past its floor of 1/30. C3 stayed 0. So by this ticket's rule the setting is removed, with the spec's sentence, the run and its flag. That run can be repeated only at `fed4a2e0`.

Neither wrong session has a wrong place: places were 42/42 right. The setting let through two sessions whose times differ from the answers, which `placeMatches` had been stopping:

| Session | Model, quoting the post's session line | Answer |
|---|---|---|
| a-015 (2) | ends 2026-12-08 22:00 | ends 2026-12-08 21:00 |
| a-053 (1) | starts 2026-11-03 17:00 | starts 2026-11-03 19:00 |

The set and its answers are not changed. Whether an answer is wrong here is for a person to check.

With the setting off, a Judgement's reading is the same as at `fed4a2e0`, so R0 of A and the Judgement's run stand, and evaluation B's three runs read with it off.

### Runs (2026-11-02, KST)

All on the held-out sets of tag `eval-freeze-iter3-collection`, set hash `af9f5ed5…`, thresholds blob `ee1b5bc9`, with the model asked as `anthropic/claude-haiku-5.5` (canonical `anthropic/claude-haiku-5.5-20261007`, which answered under the name asked), 60 s and 4,000 output tokens, one call per post, no retry. The agent ran them from `main-server`, each approved by Jaehyun0320. Each run's full record, with its checks and campus setting, is `main-server/eval/results/collection-held-out-<run>-<commit>.md`, beside its JSON.

| Run | Time | Commit | Command after `pnpm eval:collection` | Campus setting | Calls | Tokens in / out | USD |
|---|---|---|---|---|---|---|---|
| R0 of A | 00:20:03 | `fed4a2e0` | `--run r0a --part held-out` | building number | 0 | 0 / 0 | 0 |
| Judgement | 00:21:25–00:31:59 | `fed4a2e0` | `--run judgement --part held-out --budget 1` | building number | 141 | 279,979 / 114,474 | 0.0852 |
| Place setting | 00:37:46 | `fed4a2e0` | `--run place-name --part held-out --from eval/results/collection-held-out-judgement-fed4a2e0.json` | building number, name on extra.snu | 0 | 0 / 0 | 0 |
| R0 of B | 00:40:24 | `e588e702` | `--run r0b --part held-out --from <the Judgement> --budget 1` | building number | 0 | 0 / 0 | 0 |
| 08a's rules | 00:40:26 | `e588e702` | `--run title-rule --part held-out --from <the Judgement> --budget 1` | building number | 0 | 0 / 0 | 0 |
| 08b's AI | 00:40:28–00:40:58 | `e588e702` | `--run ai-choice --part held-out --from <the Judgement> --budget 1` | building number | 8 | 31,414 / 2,523 | 0.0044 |

Prompt caching read and wrote nothing. The commit changed between the runs because the Place setting was removed (see above); `e588e702` leaves a Judgement's reading as it was with the setting off. The code review then changed how a day-alone end is scored (see Decisions, C2's end), so R0 of A and the Judgement were scored again with no model at `d699d204`: every score and verdict is the same, and those files are not kept. Evaluation B's scores do not use it, and the Place setting's run cannot be repeated there. **A later review then changed the scoring again, and D1 moved: see "Scored again" below, whose values the tables here use.** Before them, a smoke run over the development part: 42 calls, USD 0.0255, not committed.

### Scored again (2026-11-02, `464ea9c5`, no model)

TaeHyun79's review of the PR found that the runner's link rule looked only at the set's pairs. `attachLinked` finds every stored post the body names, and holds a post that names more than one. b-119's new post names 15 posts, among them saved pages outside the pair, so production would have held it, and the D1 of 1 first recorded was the runner's error. Decided by Jaehyun0320 and changed at `464ea9c5`, merged with `3.0/Main`:

- The link rule counts every post the body names as stored, and a stored post's sessions include those a Judgement added.
- D1 also counts a session attached to another session of a true pair of posts. No run has one.
- A period in C2 and C4 is the answer's, not the model's.

All five runs at that commit were scored again from the saved answers, with `--no-model`, 0 calls: `collection-held-out-<run>-464ea9c5.{json,md}`, with the first files kept beside them. Evaluation A changes only in C4's end: precision 51/55 → 50/55, recall 51/76 → 50/76, from a-034, with no threshold on it. Evaluation B changes as its table shows. The Place setting's run cannot be repeated there; the change can only add wrong sessions, so its C2 stays past the floor and its removal stands.

What remains different from production:

- Counting every named post as stored assumes the Source's posts are all collected. One new post, `extra-PGM012002146`, names one post outside the set; it is left to the rest of the step, where production would decide it by that link.
- A link-back filter is not modelled, since nothing attached earlier carries over.
- For a judged session, production asks the AI under the post's first session's title (`same-event-choices.service.ts`), and the run under that session's own. Decided to record this, not change it: `SAME_EVENT_AI_CHOICE` is off, and it touches only that run's D4 and D6. Changing it would need the model again.
- C4 leaves out sessions failing `newSession`, which repeat one already read, and a start it cannot read counts as none given.
- A session's number comes from the Draft it settles, so in `extra-PGM012001958` session 7 reads as 9. No pair names that session.
- There is no integration test of the step against these functions; it is a follow-up.

### Evaluation A

| Metric | Floor / target | R0 | Judgement | Place setting (removed) | Judgement's verdict |
|---|---|---|---|---|---|
| C1 published with no person | ≥ 0.25 / ≥ 0.60 | 0/64 | 27/64 (42.2%) | 32/64 | floor PASS, target FAIL |
| C2 wrongly published | ≤ 1/30 / = 0 | 0/0 | 0/27 | 2/34 | PASS, PASS |
| C3 wrong Place, published | = 0 / = 0 | 0 | 0 | 0 | PASS, PASS |
| C4 schema | = 1 / — | n/a | 59/60 | 59/60 | floor **FAIL** |
| C4 start precision | ≥ 0.90 / ≥ 0.95 | 0/0 | 59/63 (93.7%) | 59/63 | floor PASS, target FAIL |
| C4 start recall | — / ≥ 0.80 | 0/84 | 59/84 (70.2%) | 59/84 | target FAIL |
| C5 not an event, published | = 0 / = 0 | 0 | 0 | 0 | PASS, PASS |
| C6 over a period | ≥ 0.80 / ≥ 0.95 | 0/85 | 63/85 (74.1%) | 63/85 | floor **FAIL**, target FAIL |
| C7 application period published | = 0 / = 0 | 0 | 0 | 0 | PASS, PASS |

C4's other fields in the Judgement, precision and recall: end 50/55, 50/76; place 35/35, 35/64; announces an event 44/44, 44/49. Made-up values: start 2/63, end 1/55, place 0/35. C3 with sessions a check stopped is also 0. **C4's place is narrower than the decision:** it counts a value only once `matchedPlace` gave it a Place, since an answer is a Place. So it reads no place the campus check refused, and its precision and made-up rate say nothing of those, as C3's diagnosis does not either. Scoring them would take a new way to match a written place, which was not decided. Of C6's 22 misses, 20 have no output, and 2 were read as running over a period where the answer says not: a-034 (1), from 11-06 to 11-08, and a-039 (1), whose answer has no start. Zero of 27 wrong has a one-sided 95% upper bound of about 10.5%. The floors of C4's schema and C6 are missed, so no improvement of them is claimed.

Failure analysis of the Judgement, 37 of the 64 sessions, with the report's automatic cause checked against the saved answers:

| Sessions | Failed | Cause | Next run |
|---|---|---|---|
| a-001, a-015 (1, 2), a-017, a-049, a-053, a-070, a-073, a-074 (9) | `placeMatches` alone | campus assumption: a place with no 서울대 or lone building number | none: the setting that would have let 7 of them through is removed |
| a-056 (4), a-063 (6) (10) | the model said no event | extraction: both recruit for a counselling programme, which the answers count as an event | none decided |
| a-044, a-062 (2), a-065 (2) (5) | start, end and place all null, so every check fails; the report's "campus assumption" for three of them is wrong | extraction | none decided |
| a-005 (4) | `AI_NoObjectGeneratedError`, the one answer of 60 off the schema; the run keeps only the error's name | extraction | none decided |
| a-058 (6), a-064 (1) (7) | `dateAgrees` and `timeAgrees` for a-058, `timeAgrees` for a-064: the values equal the answers', and the checks stopped them | check rule, the quoted lines not read by the check. A person should look | none decided |
| a-004 (1) | `dateAgrees`, `length`, `placeMatches` on a period and on an extra session | check rule and campus assumption | none decided |
| a-029 (2) | `linesInPost` | evidence line | none decided |

Two answers of the 141 calls were off the schema, both `AI_NoObjectGeneratedError`: `snu-177524` (a-005, above) and `extra-PGM012002205` (b-082, a false pair, which then had no reading for that post and was not attached). Neither was asked again. The Judgement's run asked no post of evaluation B twice either.

No prompt, rule, set or answer was changed for these results.

### Evaluation B

| Metric | Target | R0 | 08a's rules | 08b's AI | Last verdict |
|---|---|---|---|---|---|
| D1 wrong automatic merges | floor = 0, target = 0 | 0 | 0 | 0 | PASS, PASS |
| D2 TP / FP / FN | — | 2 / 0 / 30 | 0 / 0 / 32 | 2 / 0 / 30 | — |
| D2 precision / recall / F1 | — | 1.000 / 0.063 / 0.118 | n/a / 0.000 / 0.000 | 1.000 / 0.063 / 0.118 | — |
| D2 recall with the queue | ≥ 0.80 | 2/32 | 3/32 | 8/32 | FAIL |
| D3 candidates reached | ≥ 0.95 | 7/32 | 8/32 | 8/32 | FAIL |
| D4 queue share | ≤ 0.30 | 0/26 | 8/32 | 11/32 (34.4%) | **FAIL** |
| D5 many-to-one groups | diagnostic | 0/5 | 0/5 | 0/5 | — |
| D6 attached with no person | ≥ 0.50 | 2/32 | 0/32 | 2/32 | FAIL |

D4 by reason in the AI's run: `link_not_one_to_one` 8, `ai_unsure` 3. R0 has no link rule, as the metrics document defines it, so 08a's run changes two things. These three runs change only the same-event step, but evaluation B reads a Judgement's passed sessions, so C1's misses limit it: see the first row below.

Failure analysis of 08b's AI, 30 of the 96 held-out pairs, as scored again:

| Pairs | Failed | Cause | Next run |
|---|---|---|---|
| b-002, 003, 004, 013, 017, 029, 035, 040, 048, 067, 075, 081, 089, 090, 093, 094, 096, 098, 100, 105, 108, 109, 110, 113 (24) | no candidate: 21 with no passed session on either side, 3 with none on the stored side. No side had a passed session too far away | candidates missed, because of the Judgement's checks and mostly `placeMatches`, not the one-day window. In 18, the values given before the checks fall within a day | none decided |
| b-038, 047, 092 (3) | held, `ai_unsure` | many to one | none decided |
| b-008, 057, 117 (3) | held, `link_not_one_to_one`; the report's automatic causes for these are wrong | many to one: a linked post with another number of sessions (b-008, 057), or a post naming a whole series (b-117) | none decided |

No pair was merged wrongly. b-119 is held for a person, along with the false pairs of the two series posts that name several others. No answer was examined again, so whether any of these is an answer's error is not known.

### Improvement log

| run | date | commit | what changed | metric | before | now (k/n) | threshold | PASS/FAIL | note |
|---|---|---|---|---|---|---|---|---|---|
| R0 A | 11-02 | `fed4a2e0` | — (rules) | C1 | — | 0/64 | ≥ 0.25 / ≥ 0.60 | floor FAIL, target FAIL | as the set is made |
| R0 A | 11-02 | `fed4a2e0` | — (rules) | C2 | — | 0/0 | ≤ 1/30 / = 0 | n/a | nothing published |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C1 | 0/64 | 27/64 | ≥ 0.25 / ≥ 0.60 | floor PASS, target FAIL | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C2 | 0/0 | 0/27 | ≤ 1/30 / = 0 | PASS | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C4 schema | n/a | 59/60 | = 1 | floor FAIL | a-005 |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C6 | 0/85 | 63/85 | ≥ 0.80 / ≥ 0.95 | floor FAIL | 20 with no output, 2 wrong |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C3 | 0 | 0 | = 0 | PASS | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C4 start precision | 0/0 | 59/63 | ≥ 0.90 / ≥ 0.95 | floor PASS, target FAIL | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C4 start recall | 0/84 | 59/84 | ≥ 0.80 | FAIL | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C5 | 0 | 0 | = 0 | PASS | |
| Judgement | 11-02 | `fed4a2e0` | Judgement | C7 | 0 | 0 | = 0 | PASS | |
| Place setting | 11-02 | `fed4a2e0` | name taken as Gwanak on extra.snu | C1 | 27/64 | 32/64 | ≥ 0.25 / ≥ 0.60 | floor PASS, target FAIL | removed |
| Place setting | 11-02 | `fed4a2e0` | name taken as Gwanak on extra.snu | C2 | 0/27 | 2/34 | ≤ 1/30 / = 0 | floor FAIL | removed |
| R0 B | 11-02 | `e588e702` | — (equal start, Dice ≥ 0.5) | D1 | — | 0 | = 0 | PASS | no link rule |
| R0 B | 11-02 | `e588e702` | — (equal start, Dice ≥ 0.5) | D3 | — | 7/32 | ≥ 0.95 | FAIL | |
| R0 B | 11-02 | `e588e702` | — (equal start, Dice ≥ 0.5) | D6 | — | 2/32 | ≥ 0.50 | FAIL | |
| R0 B | 11-02 | `e588e702` | — (equal start, Dice ≥ 0.5) | D2 with queue | — | 2/32 | ≥ 0.80 | FAIL | |
| R0 B | 11-02 | `e588e702` | — (equal start, Dice ≥ 0.5) | D4 | — | 0/26 | ≤ 0.30 | PASS | |
| 08a | 11-02 | `464ea9c5` | link and title rules | D1 | 0 | 0 | = 0 | PASS | first recorded as 1, a runner error |
| 08a | 11-02 | `464ea9c5` | link and title rules | D2 with queue | 2/32 | 3/32 | ≥ 0.80 | FAIL | |
| 08a | 11-02 | `464ea9c5` | link and title rules | D3 | 7/32 | 8/32 | ≥ 0.95 | FAIL | |
| 08a | 11-02 | `464ea9c5` | link and title rules | D4 | 0/26 | 8/32 | ≤ 0.30 | PASS | |
| 08a | 11-02 | `464ea9c5` | link and title rules | D6 | 2/32 | 0/32 | ≥ 0.50 | FAIL | |
| 08b | 11-02 | `464ea9c5` | the AI's choice | D1 | 0 | 0 | = 0 | PASS | |
| 08b | 11-02 | `464ea9c5` | the AI's choice | D2 with queue | 3/32 | 8/32 | ≥ 0.80 | FAIL | direction only |
| 08b | 11-02 | `464ea9c5` | the AI's choice | D3 | 8/32 | 8/32 | ≥ 0.95 | FAIL | |
| 08b | 11-02 | `464ea9c5` | the AI's choice | D4 | 8/32 | 11/32 | ≤ 0.30 | FAIL | |
| 08b | 11-02 | `464ea9c5` | the AI's choice | D6 | 0/32 | 2/32 | ≥ 0.50 | FAIL | direction only |

### Production settings: for a person to decide

No value was changed or committed.

- **`AUTOMATIC_PUBLICATION`:** no floor of C2, C3 or D1 is missed by the Judgement and the rules as scored again, so nothing here turns it off. Neither it nor `SAME_EVENT_TITLE_RULE` stops the link rule, which `overLinks` runs with no switch. Should a link merge need stopping, that needs another way. In the saved pages, none of the 103 SNU Now posts links another SNU Now post, and 3 link extra.snu, whose Collections are off.
- **`AUTOMATIC_JUDGEMENT`:** stays off. Evaluation A's floors of C4's schema and C6 are not met.
- **`SAME_EVENT_AI_CHOICE`:** D1 is at 0 on `464ea9c5`, which is one of its two conditions, on the commit being released. The other is that the posts may be sent to the model provider. Its D4 misses the target. Left to a person.
- **`SAME_EVENT_TITLE_RULE`, `EXTRA_SNU_COLLECTION`:** evaluation B has measured the title rule, which attached no pair in these runs. Whether to turn them on is left to a person.

### Agent usage (2026-11-02)

Up to the second review's fixes, from this ticket's session and its 2 review subagents.

- Agent time: about 1 hour 35 minutes (estimate, including waiting on the runs and tests).
- Tokens: input 21,265,974 (cache reads 20,446,695, cache writes 818,993, uncached 286), output 273,832.
