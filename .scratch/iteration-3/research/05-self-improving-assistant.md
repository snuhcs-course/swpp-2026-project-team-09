# An Assistant that gets smarter from use: experience memory, feedback, privacy, safety, and evaluation

Research note for the Iteration 3 design document. Question: how can the SNU Now Assistant improve by itself from
ordinary use (no admin, no fine-tuning), for example by learning campus abbreviations and 초성 forms
(학관 → 학생회관, ㅎㄱ → 학관, 윗공 → 윗공대/공대) from what users pick, edit, and open, and possibly per-user defaults
and successful tool-call traces? Builds on note 04 (`04-memory-learning-serving.md`), which already covers Cucerzan
and Brill 2004, Mem0, MemGPT, DSPy, and RouteLLM; those are not repeated here.

Every claim cites the source it came from. "Unverified" marks what I did not confirm in a source opened for this note.
Paper abstracts were read through one arXiv API request
(`https://export.arxiv.org/api/query?id_list=2409.07429,2308.10144,2305.16291,2303.11366,2505.16067,2407.12784,2503.03704,1911.02557,2311.03758,1906.08042,1907.06554,2006.09462,2207.05221,1903.10635,1811.03604,2010.11060,2007.13237,2101.02644,1608.04468,2305.10250,2304.03442`);
each is cited below by its abstract page. Only ExpeL was read in full. Anything a paper says beyond its abstract is
unverified unless the paper is marked "full text".

## Sources opened

| Id | Source | Read | What it supports |
|---|---|---|---|
| A1 | Wang, Mao, Fried, Agent Workflow Memory: https://arxiv.org/abs/2409.07429 | Abstract | Workflows induced from experience, offline and online; gains |
| A2 | Zhao et al., ExpeL: https://arxiv.org/abs/2308.10144 (full text: https://arxiv.org/pdf/2308.10144v3) | Full text | Experience pool, insight voting, ablations, numbers |
| A3 | Wang et al., Voyager: https://arxiv.org/abs/2305.16291 | Abstract | Skill library of executable code; gains |
| A4 | Shinn et al., Reflexion: https://arxiv.org/abs/2303.11366 | Abstract | Verbal reflections in episodic memory; gains |
| A5 | Xiong et al., How Memory Management Impacts LLM Agents: https://arxiv.org/abs/2505.16067 | Abstract | Experience-following, error propagation, misaligned replay |
| A6 | Zhong et al., MemoryBank: https://arxiv.org/abs/2305.10250 | Abstract | Forgetting by elapsed time and significance |
| A7 | Park et al., Generative Agents: https://arxiv.org/abs/2304.03442 | Abstract | Memory stream, reflections, dynamic retrieval |
| F1 | Ponnusamy et al., Feedback-Based Self-Learning in Large-Scale Conversational AI Agents (Alexa): https://arxiv.org/abs/1911.02557 | Abstract | Rewrites mined from user reformulations, production A/B |
| F2 | Peng et al., LLM-based Long-tail Query Rewriting in Taobao Search (BEQUE): https://arxiv.org/abs/2311.03758 | Abstract | Industry query rewriting with system feedback (needs fine-tuning) |
| F3 | Joachims, Swaminathan, Schnabel, Unbiased Learning-to-Rank with Biased Feedback: https://arxiv.org/abs/1608.04468 | Abstract | Position bias in clicks |
| F4 | Kasai et al., Low-resource Deep Entity Resolution with Transfer and Active Learning: https://arxiv.org/abs/1906.08042 | Abstract | Active learning for entity resolution |
| F5 | Aliannejadi, Zamani, Crestani, Asking Clarifying Questions: https://arxiv.org/abs/1907.06554 | Abstract | Value of one good clarifying question |
| F6 | Kamath, Jia, Liang, Selective Question Answering under Domain Shift: https://arxiv.org/abs/2006.09462 | Abstract | Abstain-or-answer with a calibrator; model probabilities overconfident |
| F7 | Kadavath et al., Language Models (Mostly) Know What They Know: https://arxiv.org/abs/2207.05221 | Abstract | LLM self-evaluation and its calibration limits |
| K1 | Apple Machine Learning Research, Learning with Privacy at Scale: https://machinelearning.apple.com/research/learning-with-privacy-at-scale | Full page | Learning new keyboard words from users with local differential privacy |
| K2 | Gboard Help, Get word suggestions & fix mistakes (Android): https://support.google.com/gboard/answer/7068415?hl=en&co=GENIE.Platform%3DAndroid | Full page | User-facing dictionary controls |
| K3 | Hard et al., Federated Learning for Mobile Keyboard Prediction: https://arxiv.org/abs/1811.03604 | Abstract | Federated training for Gboard next-word prediction |
| K4 | Chen, Mathews, Ouyang et al., Federated Learning of Out-of-Vocabulary Words: https://arxiv.org/abs/1903.10635 | Abstract | Learning new keyboard words without exporting text |
| P1 | Chen et al., AgentPoison: https://arxiv.org/abs/2407.12784 | Abstract | Poisoning agent memory / RAG |
| P2 | Dong et al., Memory Injection Attacks on LLM Agents via Query-Only Interaction (MINJA): https://arxiv.org/abs/2503.03704 | Abstract | Any user can poison shared agent memory through queries |
| P3 | Huang, Mu, Gong et al., Data Poisoning Attacks to Deep Learning Based Recommender Systems: https://arxiv.org/abs/2101.02644 | Abstract | Fake-user injection into recommenders |
| P4 | Wang et al., Game of Missuggestions (NDSS 2018), listed at https://cse.buffalo.edu/faculty/xmi/publication/ndss18_search_autocomplete/ | Not opened | Autocomplete manipulation; every figure from it here is unverified |
| E1 | Ji, Sun, Zhang et al., A Critical Study on Data Leakage in Recommender System Offline Evaluation: https://arxiv.org/abs/2010.11060 | Abstract | Time-respecting splits |
| E2 | Meng, McCreadie, Macdonald et al., Exploring Data Splitting Strategies for the Evaluation of Recommendation Models: https://arxiv.org/abs/2007.13237 | Abstract | Split choice changes system rankings |
| R | This repository: `main-server/src/assistant/tools/resolved.ts`, `main-server/src/assistant/tools/resolve-place.ts` | Code | Resolver shape today |

## Where the Assistant stands (R)

- Every resolver answers through `resolved()`: `none` with a reason, `one` with the candidate, or `several` with up to
  10 candidates (`CANDIDATES_MAX = 10`) and a `more` flag. The comment states the rule: "It never guesses."
- `resolvePlace` matches Places whose name holds the words or whose building number they are, and its tool
  description tells the model to ask the User on `several`. So "학관" and "ㅎㄱ" end in `none` (see note 04).
- `found.add('place', givenIds(answer))` records which ids a resolver returned; `proposeQuest` accepts only those. A
  learned alias that feeds the resolver therefore keeps this guarantee for free: it can only point at a real catalog
  id that the resolver itself returns.

## 1. Agent experience memory without fine-tuning

### 1.1 What each method stores, how it reuses it, and what it gained

| Method | Stored | Reused how | Reported gain |
|---|---|---|---|
| AWM (A1) | "Workflows": commonly reused routines induced from past experience | "Selectively" provided to the agent to guide later generations; offline (induced from training examples) or online (from test queries on the fly) | +24.6 % and +51.1 % relative success on Mind2Web and WebArena, fewer steps on WebArena; online AWM beats baselines by 8.9 to 14.0 absolute points "as train-test task distribution gaps widen" (A1) |
| ExpeL (A2) | (a) An experience pool of trajectories, successes and failures, gathered with Reflexion-style retries during training; (b) a list of natural-language insights | Task prompt gets the full insight list plus top-k successful trajectories with the highest task similarity as few-shot examples (Faiss, kNN, all-mpnet-base-v2 embeddings) (A2, §4.2–4.3) | HotpotQA 28.0 % (ReAct) → 39.0 %; ALFWorld 40.0 % → 59.0 % (A2, Table 3); transfer of HotpotQA insights to FEVER 63 % (ReAct) → 70 % (A2, Table 1) |
| Voyager (A3) | An "ever-growing skill library of executable code" | Skills retrieved for complex behaviours; a new skill is refined by iterative prompting with environment feedback, execution errors, and self-verification | 3.3× more unique items, 2.3× longer distances, tech-tree milestones up to 15.3× faster than prior SOTA; reuses the library in a new world (A3) |
| Reflexion (A4) | The agent's own reflective text on task feedback, in an episodic memory buffer | Read on "subsequent trials" of the same task | 91 % pass@1 on HumanEval vs 80 % for GPT-4 (A4) |

ExpeL details that matter for a design (A2, full text):

- **Insight voting.** An LLM edits the insight list with ADD, EDIT, UPVOTE, and DOWNVOTE. A new insight starts with
  importance 2, UPVOTE or EDIT increments it, DOWNVOTE decrements it, and at 0 it is removed. The authors' reason:
  "even successful trajectories can be suboptimal and mislead the generated insights" (§4.2).
- **Both modes help, differently.** Insights-only vs retrieval-only: 36 % vs 31 % on HotpotQA, 50 % vs 55 % on
  ALFWorld; WebShop 37 % vs 38 % (§5.2). Rules help reasoning tasks; recalled examples help tasks with fixed action
  sets.
- **Example selection matters.** On ALFWorld, retrieving examples by task similarity gave 59.0 %, by reasoning
  similarity 48.5 %, and random successful examples 42.5 % (Table 3).
- **Learned insights beat hand-written ones, but noise hurts.** Hand-crafted insights 32.0 %, insights also built
  from reflections 29.0 % (the authors suspect reflections "sometimes outputting hallucinations"), ExpeL 39.0 % on
  HotpotQA (Table 3).
- **No experience, no gain.** An ExpeL agent that extracts insights only from the initial few-shot examples has "no
  advantage" over ReAct (§5.6, Fig. 6).
- **Context limit.** The insights fit in the context window in these tasks; the authors suggest retrieval over
  insights once the list grows (§4.3, §6).

### 1.2 What breaks

- **Experience-following.** When a new input is very similar to a stored record's input, the agent's output is very
  similar to the stored output (A5). That is what makes recalled examples work, and also what spreads mistakes.
- **Error propagation** ("inaccuracies in past experiences compound and degrade future performance") and **misaligned
  experience replay** (seemingly correct executions that give "limited or even misleading value") (A5). A5's remedy:
  regulate what enters memory, and use "future task evaluations" as free quality labels for stored records.
- **Hallucinated lessons.** ExpeL's reflection ablation above (A2, Table 3).
- **Reflexion needs repeatable tasks.** ExpeL notes that self-reflection methods "assume the tasks are repeatable, and
  environment feedback is available at test time", and are stateless across tasks (A2, Appendix A). A campus chat
  user does not retry the same task against a grader, so Reflexion's loop has no reward signal here.
- **Poisoning** of shared memory (section 4).
- **Forgetting.** MemoryBank forgets and reinforces memories "based on time elapsed and the relative significance"
  after the Ebbinghaus forgetting curve (A6). Generative Agents retrieve by recency, relevance, and importance (as
  summarised in A2, Appendix A.3; A7's abstract only says memories are synthesised into reflections and retrieved
  dynamically).
- AWM's workflow format, Voyager's verification gate before a skill is stored, and the failure modes those papers
  report themselves: unverified (only abstracts read).

### 1.3 Fit for SNU Now

Our "tasks" are short (2–4 tool calls), and the system prompt already spells out the routines (resolve, then propose;
search, then show). So:

- **AWM-style workflows** and **Voyager-style skills** add little: there are no long action sequences to compress, and
  letting runtime traffic write procedures or code is the riskiest kind of memory (A5, P2).
- **Reflexion** has no per-task grader to reflect against (A2, Appendix A).
- **ExpeL's retrieval mode** (top-k similar successful traces as few-shot examples) is the closest fit to "successful
  tool-call traces as exemplars". The label for "success" is ours to define: a Proposal confirmed without edits is a
  strong positive, an edited or abandoned one a negative (A5's "future task evaluations as free quality labels").
- **ExpeL's insights mode** (LLM-written rules shared by every user) is where hallucinated lessons enter (A2,
  Table 3); not recommended without review, and "no admin" rules review out.
- The **counting** part of ExpeL (importance that rises with agreement, falls with disagreement, and removes the item
  at zero) is worth copying into a plain alias table, without the LLM in the loop.

## 2. Learning from corrections and implicit feedback

### 2.1 Query rewriting mined from user behaviour

- **Alexa (F1).** Users "modify a previous query in hopes of fixing an error"; pooled across users and sessions,
  these reformulations reveal recurring patterns, including partial names ("partial title of a song"). An absorbing
  Markov chain over reformulations works "as a collaborative filtering mechanism"; the system detects errors,
  generates rewrites, and deploys them to the runtime system with no manual annotation. In production A/B tests:
  win/loss ratio 11.8 and over 30 % lower defect rate on utterance-level reformulations, pooling anonymised data
  "across millions of customers" (F1).
- **Cucerzan and Brill 2004** (note 04, S8): reformulation pairs as free labels for a learned correction lexicon.
- **Taobao BEQUE (F2).** Long-tail query rewriting with a fine-tuned LLM, then "offline feedback" from Taobao's
  system (a partial order over candidate rewrites) and objective alignment; online A/B gains in GMV, transactions,
  and unique visitors for long-tail queries. It needs supervised fine-tuning, which our constraints rule out; the
  transferable idea is to label a rewrite by what the downstream system does with it.

What transfers: a **rewrite applied before the resolver**, learned from many users, deployed automatically. What does
not: F1 mines implicit reformulations at the scale of millions of customers. A course app has hundreds of users at
best, so it should rely on **explicit** signals (a tap on one of the `several` candidates, an edit of a Proposal's
Place) rather than inferring intent from rephrasings.

### 2.2 Clicks and opens are biased

Position bias "strongly influences how many clicks a result receives", so using clicks directly as training labels
"yields sub-optimal results"; F3 corrects it with propensity weighting (F3). For "which results they open": record
the position each result was shown at and treat opens as weak evidence, or leave them out of alias learning.

### 2.3 The disambiguation question as active learning

Active learning in entity resolution "carefully selects a few informative examples" for labelling and reaches
comparable quality "using an order of magnitude fewer labels" (F4). The `several` answer is exactly the uncertain
case, and the User's tap is the label, gathered at the moment of need at no annotation cost. Choosing which items to
query by model uncertainty in general: unverified (no survey opened).

### 2.4 Ask or act: confidence thresholds

- Asking one good clarifying question improved P@1 by over 170 % for an oracle model on the Qulac dataset (over 10K
  question-answer pairs for 198 TREC topics) (F5). Questions are valuable; the cost is the user's patience.
- Abstention based only on softmax probabilities does badly, "since models are overconfident on out-of-domain inputs"; a
  separate calibrator answered 56 % of questions at 80 % accuracy vs 48 % at 80 % from the model's own probabilities
  (F6). The framing to copy: **coverage at a fixed accuracy**.
- Large models are well calibrated on multiple-choice formats and can estimate P(True) for their own answers, but
  "struggle with calibration of P(IK) on new tasks" (F7).

Consequence: do not let the LLM's own confidence decide to skip a disambiguation question. Let the resolver decide in
code from counted evidence (how many distinct users picked this id for these words, and what share of picks it holds),
with the threshold chosen on held-out data for a target precision, F6's coverage-at-accuracy trade-off.

## 3. Product precedent: keyboards that learn words

- **Gboard (K2).** Tapping a red-underlined word offers "Add to dictionary"; a suggested word can be removed by
  touching and holding it and dragging it to Trash; correction options live under Settings > Text correction.
  Whether learned words stay on the device and how to clear them ("Clear my dictionary" on iOS) appeared only in a
  search snippet: unverified.
- **Gboard models (K3, K4).** Next-word prediction trained with federated learning reached better recall than server
  training, "without exporting sensitive user data to servers" (K3). A character-level model trained under federated
  learning learns out-of-vocabulary words "for the purpose of expanding the vocabulary", sampling high-frequency
  words from the model (K4).
- **Apple (K1).** Opt-in learning of "new words" missing from on-device lexicons to improve auto-correction, plus
  popular emoji and Safari domains. Records are privatised on the device with local differential privacy (ε = 4 in
  the examples), sent at most once a day under a per-use-case daily cap, without device identifiers or timestamps;
  the server discards IP addresses and only items whose counts pass a threshold T appear. Words found include
  abbreviations (wyd, wbu, idc). It also found junk caused by the UI: known words missing a last letter (lov, th,
  kno), which Apple attributes to accidental taps on the leftmost prediction cell (K1).

Lessons for SNU Now:

1. **Two tiers.** A personal tier that applies at once, only to that user, and that the user can see and remove (K2);
   and a population tier that only admits what many users agree on, above a count threshold (K1).
2. **UI artifacts become "learned" words** (K1). A mis-tap on a candidate chip is a false label; the Proposal
   confirmation after it is the safer label.
3. Local differential privacy and federated learning protect personal text at the scale of millions of devices
   (K1, K3, K4). Aliases for public buildings are not personal, so plain server-side counts are fine for them; per-user
   data (Friends, usual lunch time) stays in the personal tier and is never pooled.

## 4. Safety of learning from users

- **Memory poisoning works at tiny rates.** AgentPoison reaches an average attack success above 80 % with under 1 %
  impact on benign performance and a poison rate below 0.1 % of the memory or knowledge base (P1).
- **Ordinary users can poison shared memory.** MINJA injects malicious records "by only interacting with the agent
  via queries and output observations", so that later victim queries retrieve them; "MINJA enables any user to
  influence agent memory" (P2). A shared exemplar store filled from all users' chats is exactly this attack surface.
- **Fake accounts push targets in recommenders,** and stay effective even when a statistical fake-user detector is
  deployed (P3).
- **Autocomplete manipulation** exists as a black-hat SEO business; the NDSS 2018 study reportedly measured about
  0.48 % of Google suggestions as manipulated across 114 million suggestion terms: unverified (paper not opened).

Defences, mapped to SNU Now (my design, each tied to the risk above):

| Risk | Defence |
|---|---|
| A user teaches 학관 → wrong building for everyone | A global alias activates only after at least k distinct accounts chose the same id for the same normalised words, and that id holds at least s of the picks (counting accounts, not picks, because P3's attack is many fake picks) |
| Inventing a target | An alias maps words to an existing catalog id only; the resolver still returns only catalog rows, and `proposeQuest` still accepts only resolver ids (R) |
| Offensive or spam aliases | Aliases are never shown as text to other users; they only change which existing Place is returned. Store the normalised words with length and character limits |
| Burst from one account or a few new accounts | Cap how many alias votes one account contributes per day; count only accounts older than a few days (thresholds are knobs) |
| Stale aliases (a building renamed, an event over) | Decay counts over time (A6's elapsed-time forgetting); ExpeL-style downvotes when a user rejects an alias resolution, removed at zero (A2, §4.2) |
| Shared exemplar memory (P1, P2) | Exemplars only from the same user, or from team-written cases; never other users' free text in the prompt |
| No admin to review | Safety comes from structure (catalog ids only, distinct-user thresholds, decay, downvotes) plus a developer-only "retire alias" command for incidents, not a review queue |

## 5. Evaluating "gets smarter"

- **Split by time.** A random split leaks the future: recommenders evaluated without the "global timeline"
  recommend items that did not yet exist at test time, and their relative order "become[s] unpredictable" with the
  amount of leaked data; E1 proposes a timeline scheme (E1). The splitting strategy alone "can markedly alter the
  ranking" of systems (E2). For us: learn from events before date T, test on events after T, and never let a test
  event's own pick count towards the alias it is tested on.
- **Learning curve.** Repeat the split for several T (weekly) and plot the metric against the number of logged
  interactions, as ExpeL plots success against the amount of experience (A2, Fig. 6) and AWM reports online gains as
  the train-test gap widens (A1).
- **Report spread and n.** ExpeL reports four-fold mean and standard error (A2, §5.1). Report the number of distinct
  users, resolution events, and active aliases, plus a confidence interval for each rate (Wilson intervals: standard
  statistics, no source opened).
- **Online.** F1 and F2 confirm in production A/B tests. Our traffic is too small for a powered A/B test; a holdback
  (a fixed share of accounts that never gets global aliases) gives a live comparison of clarification rate, reported
  with its n. Interleaving two rankings inside one result list is known to need fewer queries than A/B tests for
  rankers (Chapelle et al., ACM TOIS 2012): unverified, not opened; optional for ordering `several` candidates.
- **Metrics** (extending note 04's table): top-1 resolution accuracy on held-out (words → finally chosen id) pairs;
  share of Place mentions that needed a clarifying question; Proposal edit rate on the Place field; precision of
  active aliases on a sample the team judges by hand; coverage (share of mentions resolved to `one`).

## 6. Judgement: a minimal design for SNU Now

**Logged** (one `resolution_events` row per resolver call, no message text): user id, resolver (Place, Global Event,
Friend), normalised words and their 초성 key, the candidate ids in shown order, the outcome (chosen id, `none`, or
abandoned), the outcome source (`chip tap`, `proposal confirmed`, `proposal edited from X to Y`, `opened at position
p`), and the time. Deleted with the account.

**Learned** (plain SQL aggregates in a nightly or on-write job, no model):

1. *Personal aliases*: after one confirmed pick, my words → my id. Applies at once, to me only. Friends live only
   here.
2. *Global aliases* for public catalog entities (Places first): counts of distinct accounts per (words, id), share,
   last seen; status `candidate` → `active` → `retired` by thresholds k and s, decay, and downvotes.
3. *Per-user defaults*: the most frequent Place and hour among my last N confirmed Proposals; a statistic, not an
   LLM-extracted fact.
4. Later, optional: *my own* successful traces as retrieved few-shot examples (ExpeL retrieval mode, A2), after the
   prompt-cache layout in note 04 is settled.

**Applied** in the resolver, in code, before the substring match: exact name or number → personal alias → active
global alias → 초성 key → substring. A strong alias hit returns `one`; weaker evidence returns `several` ordered by the
learned counts. The model never decides from its own confidence (F6, F7), and the "never guesses" contract in
`resolved.ts` holds, now with evidence.

**What the user sees**: candidates as tappable chips (exact labels, fewer mis-taps); after an alias resolution, one
line such as "학관 → 학생회관으로 찾았어요" with an "아니에요" undo that records a downvote; a "내가 가르친 말" list
in settings with delete (K2's add/remove model); defaults only prefill a Proposal, never act.

**Measured**: time-split replay with learning curves and n (section 5); holdback accounts for the live clarification
rate.

### Ranking by value and effort

| Rank | Mechanism | Value | Effort | Note |
|---|---|---|---|---|
| 1 | Chip choices + `resolution_events` log | High (all learning and evaluation depend on it) | Low | Exact labels instead of free-text replies |
| 2 | 초성 key (deterministic, not learned) | High for ㅎㄱ-style input | Low | Prerequisite for learning 초성 aliases |
| 3 | Personal aliases | High, visible on the next message | Low | The demoable "it remembered" moment |
| 4 | Global aliases with distinct-user threshold, decay, downvotes | High once there are users | Medium | The "smarter for everyone" story; F1 is the industrial precedent |
| 5 | Ordering `several` by learned counts | Medium | Low | Safe even below the activation threshold |
| 6 | Per-user defaults from confirmed Proposals | Medium | Low | Prefill only |
| 7 | Retrieved own-trace exemplars | Low–medium | Medium | Prompt-cache and privacy cost; per-user only |
| 8 | LLM-written shared insights, workflow induction, skill library, Reflexion | Low here | High | Hallucinated lessons, poisoning, no grader (A2, A5, P2) |

### What to avoid

- Learning aliases from opens without position handling (F3).
- Letting the model's self-reported confidence skip a question (F6, F7).
- Pooling anything about people (Friend names, personal defaults) across users.
- A shared memory of other users' chats or traces in the prompt (P1, P2).
- Auto-acting on learned defaults; prefill only.
- Claiming "it gets smarter" from a random split, a demo with team accounts only, or without n (E1, E2). Seeded
  aliases, if any, must be counted separately from learned ones in every metric.
