# 06: Everyone's aliases from the absorbing Markov chain

Parent: [P07 spec](../spec.md), "Ticket 06: everyone's aliases from the absorbing Markov chain"
Status: ready-for-agent
Blocked by: 05

## What to build

The rule that makes words every User's Place alias becomes the absorbing Markov chain of Ponnusamy, Roshan Ghias, Guo and Sarikaya, "Feedback-Based Self-Learning in Large-Scale Conversational AI Agents" (AAAI 2020, arXiv 1911.02557; [research note 07](../../research/07-personalized-query-rewriting-precedents.md) §1.1), fitted to a deterministic resolver, explicit feedback and a campus's worth of sessions. Ticket 03 took the paper's guardrails and left its core out, judging that it needed millions of sessions; this ticket puts the core in and keeps ticket 03's count rule as the replay's baseline, so that the two are measured against each other.

**Sessions** (the paper's Eq. 1–2). One account's Place resolution events, ordered by time, cut where two are more than 5 minutes apart and after a `rejected` row (the paper ends a session at an interjection). Only sessions of accounts onboarded 7 days or more before the session's first event teach (ticket 03's defence against new accounts), and only rows of the last 90 days (the paper's three months of logs).

**States** (the interpretation space H). The resolver's reading of the words: `place:<id>` for a `one`, `ask:<words>` for a `several`, `none:<words>` for a `none`. A Place state is shared by every words that resolve to it, as the paper's interpretations are shared by their utterances; the question and nothing states carry the words, as the paper's failed interpretations carry the entity that failed. Two absorbing states, success r⁺ and failure r⁻.

**The walk of a session.** Each `answered` row visits its state. A `chosen` row goes from `ask:<words>` to the chosen Place, an `edited` row from the old Place to the new one, a `rejected` row from the rejected Place to r⁻; when the row before is not the state such a row leaves, that state is inserted first (a chip or an edit implies the question or the Place it answers). At the session's end, a Place state goes to r⁺ (the paper's success, "the absence of failure") and a question or nothing state to r⁻ (the User left with no Place: the paper's implicit failure). Two `answered` rows in a row are the User rephrasing, a transition between their states.

**Transitions** (Eq. 6–9). c(h, v) counts the consecutive pairs over every walk, self-loops included; Z_h is h's outgoing count; Q_hh′ = c(h, h′) / Z_h over the transient states and r⁺_h = c(h, r⁺) / Z_h.

**The source of words.** The paper reads a source interpretation off its logs, because its NLU is stochastic (Eq. 5, 20). Our resolver is deterministic, so the source of words u is a point: the rules' own answer today, through the matcher without the learned aliases (exact, curated, generated, subsequence, distance): `place:<p>`, `ask:<u>` or `none:<u>`. Rows the learned aliases answered therefore never feed back into the source they came from.

**Success through a target** (Eq. 11, 14–17). N = Σₙ Qⁿ = (I − Q)⁻¹, the fundamental matrix, computed as that series from the source alone over the states it reaches, stopped when the mass still in transient states is under 10⁻⁹ (the paper's production run truncates a breadth-first search at depth 5 instead). Φ∞(t) = N_st · r⁺_t for a Place state t: the expected visits to t from the source, times t's one-step success. Φ₁(s) = r⁺_s, the source's own one-step success, which is 0 for a question or nothing state.

**The alias** (Eq. 12, 18). The candidates for words u are the Place states t reachable from the source with Φ∞(t) > Φ₁(s) (strict, the paper's test), at least 3 distinct teaching accounts whose session with u reached t after u (the paper's "minimum number of customers", unpublished there; ticket 03's k), and at least 0.8 of the reach from the source, N_st over the sum of N_st′ over the Place states (ticket 03's s, kept because our question state has Φ₁ = 0 by construction, so the paper's test alone would turn every question into its most-tapped answer, and a question costs a tap while a wrong answer costs a 아니에요). The alias is the candidate with the greatest Φ∞; when the source is itself a Place and no candidate beats Φ∞(s) = N_ss · r⁺_s, the words succeed on their own and get none (the paper's self-partition, "h_t* = h_s"). Ties: more supporters, fewer rejecters, then the id. `rejecters`, the 30-day half-life and retirement under half a supporter stay as in ticket 03 (the paper blocklists a rewrite by a Z-test on its friction rate at p = 0.01, which has no power at our n). `place_aliases` gains `success` (Φ∞ of the alias) and `own_success` (Φ₁ of the words).

**When it runs.** After a chat run that chose a candidate, changed a Proposal's Place or resolved a Place as `one`, every words of the User's current session (rows within the last 5 minutes) is counted again, so that words answered `none` learn from the Place the User then named. A rejection counts its words again at once. The chain is rebuilt from the database on every count; a cache comes later, as the plan says of reference data.

**What changes for Users.** Words the rules miss become learnable: three accounts that get `none` for 경영대 and then resolve 경영대학 in the same session make 경영대 everyone's alias, with no chip and no edit. A chip after a question and an edit after a wrong Place still teach as before. An exact name cannot be turned into another Place by three accounts choosing one for it. Ambiguous words stay questions.

**Code.** `src/assistant/aliases/alias-sessions.ts` (rows to sessions, walks, transition counts, supporters and rejecters per words), `alias-chain.ts` (Q, the series, Φ∞, Φ₁, the alias), `alias-rules.ts` (the window and gap beside the other constants; `topOf`, `qualifies` move to the baseline), `AliasesService.recountSession`, `PlaceMatcher.byRule`, one migration. `eval/replay/counted-aliases.ts` holds ticket 03's rule and its standings query as the baseline; stage D is B with the personal aliases and the chain's; the learning curve adds the chain's series beside the rules and the count. README paragraphs for the alias rule and the stages.

## Acceptance criteria

- [ ] Sessions split at a gap over 5 minutes and after a rejection; an account under 7 days old at the session's start teaches nothing; rows older than 90 days teach nothing.
- [ ] The walk's states as above, the implied question or Place inserted before a `chosen`, `edited` or `rejected` row whose state before is another; r⁺ after a Place at the end, r⁻ after a question or nothing.
- [ ] The series gives (I − Q)⁻¹ on a hand-made chain with a self-loop, against the closed form; a state with four equal transitions gives 1/4 each (the paper's Fig. 2); Φ∞ = N_st · r⁺_t and Φ₁ = r⁺_s on hand-made chains.
- [ ] The alias: the greatest Φ∞ among the candidates; none when the source Place wins; none under 3 teaching accounts, under 0.8 of the reach, or when Φ∞ does not beat Φ₁; ties as above.
- [ ] Through HTTP: three accounts that resolve 뷁-words as `none` and then a Place by its name in the same session make the words everyone's alias, with `success` and `own_success` stored; a fourth account gets `one` with source `global`. 학생회관 keeps its own answer though three accounts choose another Place for it. A choice 6 minutes after the `none` is another session and teaches nothing for the earlier words.
- [ ] Ticket 03's safety tests hold: one account ten times, a 3-day-old account, a share under 0.8, rejections, decay, the switch, the holdback.
- [ ] Replay: stage D in the gold report and the chain's series in the learning curve; on the seeded test, the rephrased none-words are answered by D and not by C.
- [ ] README paragraphs; `pnpm lint`, `pnpm typecheck` and the touched tests pass.

## Comments
