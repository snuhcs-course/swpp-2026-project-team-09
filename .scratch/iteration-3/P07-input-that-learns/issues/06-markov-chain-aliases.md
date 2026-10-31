# 06: Everyone's aliases from the absorbing Markov chain

Parent: [P07 spec](../spec.md), "Ticket 06: everyone's aliases from the absorbing Markov chain"
Status: ready-for-agent
Blocked by: 05

## What to build

The rule that makes words every User's Place alias becomes the absorbing Markov chain of Ponnusamy, Roshan Ghias, Guo and Sarikaya, "Feedback-Based Self-Learning in Large-Scale Conversational AI Agents" (AAAI 2020, arXiv 1911.02557; [research note 07](../../research/07-personalized-query-rewriting-precedents.md) §1.1), fitted to a deterministic resolver, explicit feedback and a campus's worth of sessions. Ticket 03 took the paper's guardrails and left its core out, judging that it needed millions of sessions; this ticket puts the core in and keeps ticket 03's count rule as the replay's baseline, so that the two are measured against each other.

**Sessions** (the paper's Eq. 1–2). One account's Place resolution events, ordered by time, cut where two are more than 5 minutes apart, after a `rejected` row (the paper ends a session at an interjection), and where the User, having reached a Place, goes on to other words: a new request, not a rephrase, which the paper's 45 seconds tell apart by time alone. Only sessions of accounts onboarded 7 days or more before the session's first row teach (ticket 03's defence against new accounts), and only rows of the last 90 days (the paper's three months of logs).

**States** (the interpretation space H). The resolver's reading of the words: `place:<id>` for a `one`, and `open:<words>` for a `several` or a `none`, the words left open. A Place state is shared by every words that resolve to it, as the paper's interpretations are shared by their utterances; the open state carries the words, as the paper's failed interpretations carry the entity that failed. A question and a nothing are one state because they differ for the metric and not for the chain: neither succeeds on its own, both are left by a chip, an edit or a rephrase, and the state a chip implies must be the reading of its words. Two absorbing states, success r⁺ and failure r⁻.

**The walk of a session.** Each `answered` row visits its reading; one a personal or everyone's alias answered visits the words left open and then the Place, as the paper's rewrite stands in for the question the User would have been asked, so that an alias in use keeps the evidence that made it. A `chosen` row goes from `open:<words>` to the chosen Place, an `edited` row from the old Place to the new one, a `rejected` row from the rejected Place to r⁻; when the row before is not the state such a row leaves, that state is inserted first. At the session's end, a Place state goes to r⁺ (the paper's success, "the absence of failure") and an open state to r⁻ (the User left with no Place: the paper's implicit failure). Two `answered` rows in a row are the User rephrasing, a transition between their states.

**Transitions** (Eq. 6–9). c(h, v) counts the consecutive pairs over every walk, self-loops included; Z_h is h's outgoing count; Q_hh′ = c(h, h′) / Z_h over the transient states and r⁺_h = c(h, r⁺) / Z_h. Beside them, per words and Place, the distinct accounts whose successful session visited the Place at or after the words (the supporters), and the distinct accounts that rejected the Place for the words, whatever their age (the rejecters).

**The source of words.** The paper reads a source interpretation off its logs, because its NLU is stochastic (Eq. 5, 20). Our resolver is deterministic, so the source of words u is a point: the rules' own reading today, through the matcher without the learned aliases (exact, curated, generated, subsequence, distance): `place:<p>` or `open:<u>`. Rows the learned aliases answered therefore never feed back into the source they came from.

**Success through a target** (Eq. 11, 14–17). N = Σₙ Qⁿ = (I − Q)⁻¹, the fundamental matrix, computed as that series from the source alone over the states it reaches, stopped when the mass still in transient states is under 10⁻⁹ (the paper's production run truncates a breadth-first search at depth 5 instead). Φ∞(t) = N_st · r⁺_t for a Place state t: the expected visits to t from the source, times t's one-step success. Φ₁(s) = r⁺_s, the source's own one-step success, which is 0 for an open state. The share below is taken on the first-passage probability, the chance that a walk from the source ever visits t (the series again, with t absorbing), because the expected visits are raised by a Place other sessions visit again and again while Φ∞ is not: the revisits cancel against the lower one-step success.

**The alias** (Eq. 12, 18). The candidates for words u are the Place states t reachable from the source with Φ∞(t) > Φ₁(s) (strict, the paper's test), at least 3 supporters (the paper's "minimum number of customers", unpublished there; ticket 03's k), and at least 0.8 of the reach over every Place but the reading itself (ticket 03's s, kept because our open state has Φ₁ = 0 by construction, so the paper's test alone would turn every question into its most-tapped answer, and a question costs a tap while a wrong answer costs a 아니에요). The alias is the candidate with the greatest Φ∞; when the source is itself a Place and no candidate beats Φ∞(s) = N_ss · r⁺_s, the words succeed on their own and get none (the paper's self-partition, "h_t* = h_s"). Ties: more supporters, fewer rejecters, then the id. `rejecters`, the 30-day half-life and retirement under half a supporter stay as in ticket 03 (the paper blocklists a rewrite by a Z-test on its friction rate at p = 0.01, which has no power at our n). `place_aliases` gains `success` (Φ∞ of the alias) and `own_success` (Φ₁ of the words).

**When it runs.** After a chat run that chose a candidate, changed a Proposal's Place or resolved a Place as `one`, every words of the User's current session (rows within the last 5 minutes) is counted again, so that words answered `none` learn from the Place the User then named. A rejection counts its words again at once. The session still open is read as it stands, its last state as its end, and the next count corrects it. The chain is rebuilt from the database on every count; a cache comes later, as the plan says of reference data.

**What changes for Users.** Words the rules miss become learnable: three accounts that get `none` for 경영대 and then resolve 경영대학 in the same session make 경영대 everyone's alias, with no chip and no edit. A chip after a question and an edit after a wrong Place still teach as before. An exact name cannot be turned into another Place by three accounts choosing one for it. Ambiguous words stay questions.

**Code.** `src/assistant/aliases/alias-sessions.ts` (rows to sessions, walks, transition counts, supporters), `alias-chain.ts` (Q, the series, the first passage, Φ∞, Φ₁, the alias), `alias-rows.ts` (the window's rows), `alias-rules.ts` (the gap and the window beside the other constants), `AliasesService.recountSession`, `PlaceMatcher.byRule`, one migration. `eval/replay/counted-aliases.ts` holds ticket 03's rule and its standings query as the baseline; stage D is B with the personal aliases and the chain's; the learning curve adds the chain's series beside the rules and the count. README paragraphs for the alias rule and the stages.

## Acceptance criteria

- [ ] Sessions split at a gap over 5 minutes, after a rejection, and where a Place reached is followed by other words; an account under 7 days old at the session's start teaches nothing; rows older than 90 days teach nothing.
- [ ] The walk's states as above, the implied open words or Place inserted before a `chosen`, `edited` or `rejected` row whose state before is another, an alias answer read as the words open and then the Place; r⁺ after a Place at the end, r⁻ after words left open.
- [ ] The series gives (I − Q)⁻¹ on a hand-made chain with a self-loop, against the closed form; a state with four equal transitions gives 1/4 each (the paper's Fig. 2); Φ∞ = N_st · r⁺_t and Φ₁ = r⁺_s on hand-made chains; the share is not raised by a Place visited again and again.
- [ ] The alias: the greatest Φ∞ among the candidates; none when the source Place wins; none under 3 supporters, under 0.8 of the reach, or when Φ∞ does not beat Φ₁; ties as above.
- [ ] Through HTTP: three accounts that resolve 뷁-words as `none` and then a Place by its name in the same session make the words everyone's alias, with `success` and `own_success` stored; a fourth account gets `one` with source `global`. 학생회관 keeps its own answer though three accounts choose another Place for it. A Place named 6 minutes after the `none` is another session and teaches nothing for the earlier words.
- [ ] Ticket 03's safety tests hold: one account ten times, a 3-day-old account, a share under 0.8, rejections, decay, the switch, the holdback.
- [ ] Replay: stage D in the gold report and the chain's series in the learning curve; on the seeded test, the rephrased none-words are answered by D and not by C.
- [ ] README paragraphs; `pnpm lint`, `pnpm typecheck` and the touched tests pass.

## Comments

### Built (2026-11-01)

On branch `3.0/P07-06-markov-chain-aliases`, from `3.0/P07-05-replay-metric` at `53660de8`.

- `src/assistant/aliases/alias-sessions.ts`: `ChainRow`, the states (`placeState`, `openState`, `placeOf`), `sessionsOf` (the three cuts and the account's age), `walkOf` (the readings, an alias answer as two visits, the implied state before a label, the end), `transitionsOf` (the counts and the supporters of successful sessions). `alias-chain.ts`: `chainOf` (the walks and the rejecters), `sourceOf`, `visitsFrom` (the series), `firstPassage`, `aliasOf` (candidates, the test, the share, the argmax, the self-partition), `standingOf`. `alias-rows.ts`: `chainRows`, the window's rows with each account's onboarding. `alias-rules.ts`: `SESSION_GAP_MINUTES` 5 and `CHAIN_WINDOW_DAYS` 90 beside the other constants; `topOf` and `qualifies` left for the baseline.
- `AliasesService`: `learn` writes the personal alias only; `recountSession` reads the User's Place rows of the last 5 minutes, builds the chain once and counts each words through `recount`, which asks `PlaceMatcher.byRule` for the source, writes `supporters`, `rejecters`, `score`, `success` and `own_success` on the words' rows, retires the rows the chain no longer picks and makes the one it does (`make`). `reject` counts its words again. `AssistantService.reply` calls `recountSession` once after a run that learned, chose or reached a Place (`RunLog.reachedPlace` from `ResolutionEventsService.forRun`). `PlaceMatcher` keeps a second index without the learned sources for `byRule`. Migration `20261101120000_add_alias_success`.
- Replay: `eval/replay/counted-aliases.ts` (ticket 03's `standingsOf`, `topOf`, `qualifies`, moved from `src`), `learned-aliases.ts` rebuilding everyone's aliases by the count and by the chain (the chain's source being stage B's reading), `withAliases` in place of `stageC`, stage D in `replay.ts` (the gold report's fourth column and `learned: { personal, counted, chained }`), the chain's series in `learning-curve.ts` and `curve-metrics.ts` (`askChained`, `top1Chained`).

Decisions where the paper left room, each with its reason:

- The source is the rules' reading today, not a distribution read off the log: the resolver is deterministic, and reading it off the log would let a deployed alias feed back into its own source.
- A question and a nothing are one open state: see above; it also lets a `chosen` row sent without a `several` before it (the app's mock, the tests) imply the right state.
- An alias answer is read as the words left open and then the Place: without it, an alias in use starves its own evidence within 90 days, as every session for the words would start at the Place.
- Supporters are counted from successful sessions only, so that an account that rejected the alias's answer is not also its supporter.
- A session is cut where a Place reached is followed by other words: two chip taps of different words in one minute are two requests, not one search, and the second would otherwise read as the first Place failing.
- The share is taken on the first-passage probability, not on the expected visits: a Place other sessions visit twice in a row raises the expected visits from any source, which let a 3 : 1 split pass 0.8 in the test database.
- The session still open is counted as it stands, so that a tap counts at once as in ticket 03; the next count corrects it.
- Not changed: personal aliases (a chip or an edit teaches at once; a rephrase does not teach a personal alias), the holdback, the switch, `resolvedBy`.

Tests: `test/alias-chain.unit.test.ts` (the three cuts and the account's age; the walk's states, the implied state and the end; the counts, self-loops and supporters; the series against (I − Q)⁻¹ = [[2, 0.5], [0, 1]] and the paper's quarter; the source; the alias, the guards, the rephrase, the self-partition, the share on the first passage, the rejecters and `standingOf`). `test/eval-replay-counted.unit.test.ts` (ticket 03's `topOf` and `qualifies`, moved). `test/global-aliases.integration.test.ts` gains the chain's three tests (words answered `none` learned from the Place named next, with `success` in (0, 1] and `own_success` 0; nothing across a 6-minute gap; 학생회관 kept); ticket 03's tests pass unchanged. `test/eval-replay.integration.test.ts` checks stages C and D together and gains stage D's test (the rephrased none-words answered by D and not by C). `pnpm lint`, `pnpm typecheck`, the unit suite (362) and the touched integration files (53) pass.

Measured on the live run's database (the rows of 2026-10-29, ticket 05, Comments), `pnpm eval:replay --development` on 2026-11-01:

| | B: rules and groups | C: B and aliases by the count | D: B and aliases by the chain |
| --- | --- | --- | --- |
| Top-1 | 84.2% [69.6, 92.6] 32/38 | 92.1% [79.2, 97.3] 35/38 | 89.5% [75.9, 95.8] 34/38 |
| Everyone's aliases learned for the set | — | 3 | 2 |
| Resolution, recall@10, false none | 63.2%, 92.1%, 5.3% | the same | the same |

D learns 미대 and 호암 and not 정문. In the live run the first account probed 수의대, 미대, 경영대, 대운동장, 호암 and 정문 one after another, choosing nothing, and then named 예술관(미대)1: to the chain that is one search rephrased six times, so the reach from `open:정문` leaks to 예술관(미대)1 (first passage 0.667 to 서울대 정문, 0.333 to 예술관(미대)1), and the share guard keeps 정문 a question, where the count, reading taps alone, promoted it. The learning curve has its 10 labelled rows on 2026-10-29 and no later rows: no curve yet.

### For the team to decide

- **A probe of several words is read as one rephrased search.** Options: (a) count a rephrase only when the later words share a syllable with the earlier (경영대 → 경영대학, 학관 → 학생회관; but 미대 → 예술관, a rephrase by meaning, would be lost); (b) a shorter gap than 5 minutes; (c) leave it, as the share guard kept 정문 a question rather than a wrong alias, and real users rarely probe six words in a row.
- **Who counts as a supporter.** The chain counts every account whose successful session reached the Place after the words, an alias's answer included (the paper's "absence of failure"); ticket 03 counted taps and edits alone. A User who got the alias's answer and said nothing now supports it.
- **The chain is rebuilt from the window's rows on every count.** Fine at the live run's size (a few hundred rows); when rows reach tens of thousands, keep the counts in memory and add each row as it comes, or count once a night.
- **The 5 minutes and the 90 days** are guesses in place of the paper's 45 seconds and three months; the replay's final slice is where they are tuned.

### Agent usage (2026-11-01)

- Agent time: about 55 minutes (estimate), one Fable 5.1 session, including about 4 minutes of a web-fetch subagent that read the paper's equations.
- Tokens (estimate, from the session transcript since the go-ahead): about 10.3M input, of which about 9.96M cache reads, 287k cache writes and under 1k uncached, and about 184k output; the subagent about 114k tokens in all.
