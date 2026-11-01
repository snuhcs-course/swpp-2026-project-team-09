# Self-improving agents, 2025–26: candidate papers for the algorithm behind Scenario 4

Research note, 2026-11-01. Question: which paper from 2025 or 2026 can Scenario 4 ("쓸수록 똑똑해지는 입력") apply
faithfully, so that the feature's learning rule comes from a current paper on agentic LLMs rather than from
Ponnusamy et al. 2020 (ticket 06), and what would the design look like? Notes 05, 07 and 10 are not repeated (AWM,
ExpeL, Reflexion, Voyager, the Alexa self-learning line, A-MEM, LongMemEval, the personalization survey).

Constraints the candidates were judged against: targets are catalog ids the server validates, and the model may only
name ids this turn's resolvers returned; no fine-tuning; hundreds to a few thousand `resolution_events`; a fixed
prompt prefix for caching; the model-free replay (stages A–D, dated gold set, learning curves, 10 % holdback) is the
proof; and the plan's rule against model-written memories (note 10 §5: extracted facts lose information, an
overwrite leaves no trace), which a paper may relax only if the learned object stays validated and measurable.

Three research agents ran on 2026-11-01 with 22 web searches and 14 papers read in depth in all (arXiv HTML pages).
Every claim cites its source; "unverified" marks what no opened page confirmed. Venues come from the paper's own page,
the ACL Anthology, or iclr.cc listings found by search, as stated per row.

## Sources opened

| Id | Paper | Venue and date as verified | Read |
|---|---|---|---|
| A1 | Zhang et al. (SambaNova, UC Berkeley, Stanford), "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models", arXiv 2510.04618 | v1 Oct 2025, v3 29 Mar 2026; ICLR 2026 per the PDF footnote and iclr.cc listings found by search, not shown on the HTML page | Full text |
| A2 | Ouyang et al. (Google Cloud AI Research, Yale, UIUC), "ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory", arXiv 2509.25140 | v1 29 Sep 2025; ICLR 2026 (proceedings page found by search) | Full text |
| A3 | Zhou, Chen et al. (UCL, Huawei Noah's Ark Lab), "Memento: Fine-tuning LLM Agents without Fine-tuning LLMs", arXiv 2508.16153 | v1 25 Aug 2025; no venue found | Full text |
| A4 | Suzgun et al. (Stanford, Together AI), "Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory", arXiv 2504.07952 | 10 Apr 2025; venue unverified ("ICML" only as a page keyword) | Full text |
| A5 | Cai et al. (Tencent Youtu Lab), "Training-Free Group Relative Policy Optimization", arXiv 2510.08191 | 9 Oct 2025; preprint | Full text |
| A6 | "MemRL: Self-Evolving Agents via Runtime Reinforcement Learning on Episodic Memory", arXiv 2601.03192 | v1 6 Jan 2026; venue unverified | Search snippets only |
| F1 | Chen, Gul, Chen, Geng, Wu, Artzi (Cornell), "Retrospective Learning from Interactions", arXiv 2410.13852 | ACL 2025 Long, pp. 24580–24606, DOI 10.18653/v1/2025.acl-long.1200 (Anthology page opened) | Full text |
| F2 | Zhou et al. (Notre Dame, IBM Research, Tencent AI Lab), "TellOnce: Correcting Coding Agents Once, Improving Their Future Actions", arXiv 2606.13174 | v2 25 Oct 2026 (v1 Jun 2026 under another title); no venue | Full text |
| F3 | Liu, Zhang, Choi (NYU), "User Feedback in Human-LLM Dialogues: A Lens to Understand Users But Noisy as a Learning Signal", arXiv 2507.23158 | EMNLP 2025 per the Anthology id 2025.emnlp-main.133 found by search; not on the arXiv page | Full text |
| F4 | Chhikara et al. (Mem0), "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory", arXiv 2504.19413 | 28 Apr 2025; no venue | Full text |
| R1 | Agrawal et al. (UC Berkeley, Stanford, Notre Dame, Databricks, MIT), "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning", arXiv 2507.19457 | v1 Jul 2025, v2 14 Feb 2026; ICLR 2026 Oral (iclr.cc/virtual/2026/oral/10009494 found by search) | Full text |
| R2 | Kovacs, Verdha, Recski (KR Labs, TU Wien), "RuleChef: Grounding LLM Task Knowledge in Human-Editable Rules", arXiv 2607.01293 | v1 1 Jul 2026; no venue | Full text |
| R3 | Zhou, Zhou et al. (UTS, U. Maryland, Tencent), "WALL-E 2.0: World Alignment by NeuroSymbolic Learning improves World Model-based LLM Agents", arXiv 2504.15785 | v1 22 Apr 2025, "preliminary work"; NeurIPS 2025 suggested by a slides PDF, unverified | Full text |
| R4 | Wang, Gandhi, Neubig, Fried (CMU), "Inducing Programmatic Skills for Agentic Tasks" (ASI), arXiv 2504.06821 | COLM 2025, stated on the page | Abstract and snippets |

Named but not read: SkillWeaver 2504.07079; "A Comprehensive Survey on Agent Skills" 2605.07358; ContractSkill
2603.20340; "Lifting Traces to Logic" 2605.01293; Live-Evo 2602.02369; Experiential Reflective Learning 2603.24639;
Memory-R1 2508.19828 and Mem-α (both RL fine-tuning, excluded by the no-fine-tuning rule); Peeters, Steiner, Bizer,
EDBT 2025 (LLM-generated entity-matching rules); 2609.00228 (LLM-written aliases filtered against an ontology).

## 1. Agents that evolve a memory or a context

### 1.1 ACE (A1)

- Mechanism: the context is a list of itemized bullets {id, helpful, harmful, content}. A Generator answers and tags
  the bullets that helped or misled; a Reflector extracts lessons (up to 5 rounds); a Curator emits delta bullets;
  plain code merges them (append new ids, bump counters), never an LLM rewrite; near-duplicates are removed by
  embedding similarity. Offline (up to 5 epochs over training data) or online (update after each sample). With
  labels the Reflector sees the correct answer; without, it uses execution feedback.
- Numbers: AppWorld average 42.4 → 59.4 offline with labels (GEPA 46.4, Dynamic Cheatsheet online 51.9); finance
  69.1 → 81.9; 75 % fewer rollouts and 82 % lower latency than GEPA. "Context collapse" is named and measured: one
  monolithic rewrite shrank the context from 18,282 to 122 tokens and accuracy fell below no adaptation. Without
  reliable feedback it gets worse than no learning (FiNER 67.3 vs 70.7). Tasks that need one short rule gain little.
- For Scenario 4: a playbook after the fixed prefix, read by the model when it picks among candidates or decides which
  words to send to the resolver. The user's choice is the label. Bullets carry Place ids checked at merge; the model
  still names only ids this turn's resolvers returned, so a bullet can re-rank or ask, never add a target. Measuring
  it needs the model inside the replay: paid, nondeterministic, several seeds. ACE's own caveats (a weak Reflector
  pollutes the context; single-rule tasks gain little) weigh against a Haiku-class Reflector on a lookup task.
- Keep whatever the design: counters, delta merge by code, append-only units, dedup. They are the fix to the overwrite
  objection of note 10 §5.

### 1.2 ReasoningBank (A2)

A memory item is {title, description, content}, at most 3 per trajectory; successes and failures ("pitfalls") are
both extracted; an LLM judge decides success (72.7 % accurate against ground truth); retrieval by embedding, top-1;
append only, no pruning. WebArena 40.5 → 48.8 with Gemini 2.5 flash. Fit: failures as pitfalls is the useful idea;
we have the user's own label, which is better than the judge; with no counters a wrong item never loses weight.

### 1.3 Memento (A3) and MemRL (A6)

- Mechanism: a memory-augmented MDP. The LLM is frozen and only the case-retrieval policy learns,
  μ(c | s) ∝ exp(Q(s, c) / α). Write appends the raw tuple (state, action, reward), failures too. Read takes the top K
  cases by similarity (K = 4 best) or by Q, a 2-layer MLP trained online with binary cross-entropy; with one-step
  decisions Q is p(success given state and case). Case memory adds +6.7 F1 on DeepResearcher and +4.7 to +9.6 on
  unseen sets; GAIA test 79.4.
- For Scenario 4: `resolution_events` already is the case bank (words, candidates, chosen id, outcome), written by
  the server, nothing model-written. Two uses: about 4 similar past cases as worked examples after the prefix, and
  p(accept given words and place), trained from chip taps and rejections, to order the candidates the matcher
  returned, never to add one. The model-free part is a new replay stage. State plainly: an online classifier, not
  reinforcement learning; venue unverified. MemRL (2026) has the same shape (intent, experience, utility;
  Q ← Q + α(R − Q)), from snippets only.

### 1.4 Dynamic Cheatsheet (A4) and Training-Free GRPO (A5)

Dynamic Cheatsheet rewrites the whole memory after each answer, self-judged: AIME 2024 23.3 → 50.0 with Claude 3.5
Sonnet, GPT-4o-mini below its baseline. The full rewrite is the collapse ACE measures; cite it as the baseline ACE
fixes. Training-Free GRPO keeps an experience library (entries of at most 32 words) as a token prior: G rollouts per
query, only groups with both right and wrong answers are used, the LLM writes the "semantic advantage" and edits the
library (Add, Delete, Modify, Keep); AIME25 67.9 → 73.3 for about $18 on 100 samples; small models gain little or
lose. Here it would be an offline job over the replay harness; the name is a metaphor, there are no gradients.

## 2. Learning from user feedback during use

### 2.1 ReSpect (F1)

- Setting: reference resolution. A human describes a target and the model picks it among candidates over turns, the
  closest published analogue of words → one of N Places with chips. A frozen copy of the model decodes feedback from
  the last two action–utterance turns only (more history distracted it) into positive, neutral or negative; precision
  above 90 % with positives and neutrals merged, about 15 % false negatives. Learning from positives only was best;
  negatives "seem to confuse the learner". Success 31.4 → 81.9 over six rounds; the initial policy, redeployed as a
  control, went 31.4 → 33.0.
- For Scenario 4: drop the fine-tuning, keep the decoder and the positive-only rule. An offline pass labels turns in
  which one Place was named and the user carried on, and writes an implicit-confirm event; positives feed the count
  and the chain; negatives only retract. Decode once and store the label, so the replay stays model-free. Our 10 %
  holdback is their control. Risk: a false positive makes a wrong alias; keep the several-accounts or chain threshold
  for everyone's aliases.

### 2.2 TellOnce (F2)

Corrections are compiled into scoped rules: a programmatic check, an LLM semantic check, guidance only, or inactive
(ambiguous); each executable check needs 3–9 validation cases labelled blind; the library version is frozen per turn;
removal only on explicit retraction. "Access–compliance gap": compliance 31.6 % with no rules, 55.0 % with rules as
text, 42.5 % with Mem0, 70.1 % with compiled rules; Mem0 agents violated 57.5 % of applicable preferences. Supports
the plan's stance that a correction becomes an enforced object (an alias the resolver executes), not text the model
may ignore. Copy: the inactive state for a bare 아니에요 with no chip chosen, and a rule-table version stamped on each
event.

### 2.3 Liu, Zhang, Choi (F3) and Mem0 (F4)

F3: detecting implicit feedback in open chat reached 41.61 % accuracy with dense labels, and training on it did not
beat random data. Explicit events stay primary; any decoded signal is narrow and positive-only (ReSpect's setting).
F4: extraction plus ADD / UPDATE / DELETE / NOOP chosen by an LLM; on LOCOMO full context 72.90 > Mem0g 68.44 > Mem0
66.88; the operations are never evaluated on their own. Borrow the vocabulary and Mem0g's "mark invalid, do not
delete"; not the LLM choosing the operation.

### 2.4 Gaps

Two searches found no LLM-era successor to the Alexa reformulation line after Ponnusamy 2020 (nearest: PA-CQR, EMNLP
2023 Industry; AdaRewriter, EMNLP 2025, which is not about feedback). No 2025–26 paper learns user aliases for a closed
catalog (PENTATRON 2022 is the nearest). The niche is open.

## 3. LLMs that induce verified rules from feedback

### 3.1 GEPA (R1)

- Mechanism: a candidate is the system's textual parameters, weights frozen. Loop: Pareto sampling of a candidate →
  a minibatch from D_feedback → the feedback function μ_f returns a score and text (what failed) → a reflection LM
  rewrites one module → accept only if the minibatch average improves over the parent → score on D_pareto. Pareto
  selection keeps candidates best on at least one instance, prunes dominated ones, and samples by the number of
  instances led (+12.44 vs greedy +6.05). Qwen3-8B aggregate 54.85 vs GRPO 48.91 with up to 35× fewer rollouts; Merge
  sometimes hurts.
- For Scenario 4: the candidate is the matcher's rule table, and μ_f is the replay (score = top-1 on dated gold and
  events; text = the events a rule set fixed and broke). Keep: minibatch acceptance then full scoring, the
  D_feedback / D_pareto split, Pareto over instances; skip Merge at first. The rollout-efficiency claim does not
  transfer, since replay is free; count reflector calls instead.

### 3.2 RuleChef (R2)

- Mechanism: an LLM writes deterministic regex rules from labelled examples and corrections; failures are clustered
  (missed, spurious, wrong type) and the LLM proposes patches; a patch is kept only if held-out F1 does not drop or
  precision rises; any change that lowers measured quality is reverted; each rule stores its dev precision, discounted
  by a Wilson lower bound, and its match count; leave-one-out drops rules that do not help the set; rules that match
  generic text are rejected; "observation mode" learns from an existing LLM's inputs and outputs and routes
  high-precision matches to the rules. Inference is rules only (0.6 ms against about 1,500 ms). TAB format F1 78.7 vs
  prompting 74.8; Banking77 precision 97.6 / recall 61.0, pitched as a high-precision first tier before the LLM;
  one-shot rules 7.4 → 47.8 semantic F1 with the validated loop. Limits: ±3 F1 between runs, English only, low recall.
- For Scenario 4: nearly the same loop, and our matcher is already the rules-first tier. Swap F1 for top-1 and the
  several rate, and regex for a rule language over normalised Korean (jamo and 초성 aware).

### 3.3 WALL-E 2.0 (R3) and ASI (R4)

WALL-E 2.0 splits mispredicted from correct transitions, has the LLM turn mistakes into executable code rules the
system runs, and prunes by greedy maximum set coverage under a rule budget, dropping rules that cover only correct
cases or are subsumed by broader ones; without pruning the Mars reward fell from 6.7 to 1.5. ASI keeps an induced
program skill only if, on replay, the task is solved, the skill is called, and the call changes state; +11.3 % over
text skills (AWM), whose correctness cannot be verified. Here: a misprediction is an event where the matcher's
answer differs from the chosen id; a rule must fix at least one such event, actually fire, and change the answer.

## 4. Three designs

| | 1. A reflector induces verified matching rules | 2. An ACE playbook in the prompt | 3. Memento case memory and candidate ranking |
|---|---|---|---|
| Learned object | Rules in a constrained DSL over normalised words and catalog names (a suffix pattern, a lexical substitution such as 윗 → 상부, a generator rule), each with precision, support, helpful/harmful counters and a version | Append-only bullets with Place ids and counters, placed after the fixed prefix | `resolution_events` as the case bank; p(accept given words and place) over the candidates returned |
| Who generalises | The LLM, offline, from corrected sessions | The LLM, offline or online | Nobody beyond similarity; a classifier ranks |
| Serving | A model-free tier of the matcher; the cache is untouched | The model reads the playbook each turn; the cache breaks when the playbook changes | Cases after the prefix (uncached suffix); the ranking is model-free |
| Verification | Replay over dated events and gold: promote only if top-1 rises with no regression (R2), the rule fired and changed the answer (R4), coverage pruning under a budget (R3), Pareto selection (R1) | Counters and dedup (A1); accuracy only end to end | Held-out accuracy of the ranker |
| Measurement | Stage E = B + induced rules, model-free, beside C and D; learning curve by date; holdback | A stage with the model: paid, nondeterministic, several seeds | A model-free stage for the ranker; a model stage for the cases |
| Papers | R1 (ICLR 2026 Oral), R2 (2026 preprint), R3, R4 (COLM 2025); A1 for the bookkeeping; F2 for the inactive state and versioning | A1 (ICLR 2026), A2; A4 as the baseline | A3 (preprint), A6 (2026 preprint) |
| Main risk | Rules over-tailored to one Place (R3's own limitation); the closest precedent is unreviewed | Breaks the rule against model-written memories; ACE says single-rule tasks gain little; a Haiku-class Reflector | The depth is an online classifier; venue unverified |

What design 1 learns that aliases cannot: one rule induced from two corrections covers words nobody has typed yet
(윗공, 아랫공 → 상부, 하부 공대; X대 → the college whose name starts with X and ends with 대학). The count rule and the
chain learn one word at a time.

## 5. Judgement

Design 1. The LLM does the part rules cannot (generalise from a handful of corrections), the server does what the LLM
cannot be trusted with (verify on dated logs, execute deterministically), and the proof is the harness already
built: stage E against C and D, with the holdback. Every architectural rule of the plan holds: ids only, model-free
serving, fixed prefix, no fine-tuning. The honest citation: GEPA's optimizer (reflection over execution feedback,
minibatch acceptance, Pareto selection) applied to the matcher's rule table instead of a prompt, with RuleChef as the
nearest precedent (unreviewed), WALL-E 2.0 for coverage pruning, ASI for the acceptance criteria, ACE for counters and
delta merge, and TellOnce for the inactive state and versioning.

Say plainly: no paper validates induced rules against dated user logs with a holdback control, so the harness is
stricter than the literature; RuleChef reports ±3 F1 between runs, so report several reflector seeds; Korean is
untested in every paper; a rule that fixes one word is an alias and belongs to tickets 03 and 06, so a rule must
cover two distinct words or Places.

Design 2 is the alternative if the team wants the model itself to read lessons. Design 3 is a cheap addition
(ordering the candidates), not a headline. ReSpect's positive-only decoding is a separate, later ticket that
strengthens the signal of ticket 06.
