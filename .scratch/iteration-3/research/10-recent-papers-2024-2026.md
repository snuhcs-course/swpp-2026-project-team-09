# Recent papers (2024-2026) checked against the Scenario 4 design

Research note for the Iteration 3 presentation. Question: do recent papers on proactive assistance,
prompt-injection defence, agent evaluation, small models for agents, and personalization/memory change, support, or
not bear on the design in `../scenario-4-plan.md` (§1-§4, §8): one tool loop per feature on a Haiku-class model that
only proposes; server validation and execution after the user's tap; none/one/several resolvers; a rule-based Korean
abbreviation generator; two-layer aliases from explicit choices; model-free grey suggestions with 10% random
exposure and a holdback; no model-written memories; date-split replay, pass^k, and cost per request.

Not repeated here: CaMeL and AgentDojo (note 03), AWM, ExpeL, Mem0, MINJA, AgentPoison (note 05), Smart Compose,
Copilot, bandits (note 06), Alexa query rewriting (note 07), Korean abbreviation matching (note 08), τ-bench pass^k
(notes 01, 02).

Every claim cites the source it came from. "Unverified" marks what I did not confirm in a source opened for this
note. Venues and dates come from each paper's own page or the V1 search; arXiv "Comments" fields were not read.

## Sources opened

| Id | Source | Venue and date as verified | Read | What it supports |
|---|---|---|---|---|
| P1 | Lu, Yang, Qian et al. (Tsinghua, Renmin, Huawei), "Proactive Agent: Shifting LLM Agents from Reactive Responses to Active Assistance", https://arxiv.org/html/2410.12361 | ICLR 2025 poster (V1); arXiv v3, 3 Dec 2024 | Full text (first 100k of 102k characters) | ProactiveBench task, metrics, false alarms |
| P2 | Web search "2025 arXiv proactive LLM assistant benchmark when to intervene false alarms user acceptance" (result list only) | n/a | Search snippets | Pointers to later proactive work |
| P3 | Fu, Tan, Hao, Zhan, Qiu, "PRISM: Festina Lente Proactivity: Risk-Sensitive, Uncertainty-Aware Deliberation for Proactive Agents", poster slides https://iclr.cc/media/iclr-2026/Slides/10007161.pdf | ICLR 2026 (footer of the slides on iclr.cc) | Slides only; paper not opened | Cost-sensitive intervention threshold, newer ProactiveBench numbers |
| I1 | Beurer-Kellner, Buesser, Creţu, Debenedetti, Dobos, Fabian, Fischer, Froelicher, Grosse, Naeff, Ozoani, Paverd, Tramèr, Volhejn (Invariant Labs, IBM, EPFL, ETH Zurich, Google, Microsoft, Swisscom, ...), "Design Patterns for Securing LLM Agents against Prompt Injections", https://arxiv.org/html/2506.08837 | arXiv v3, 27 Jun 2025; no venue on the page (arXiv-only as far as verified) | Full text (first 100k of 109k characters; Appendix A not read) | Six patterns, case studies, limits of confirmation and detection |
| I2 | Chen, Zharmagambetov, Mahloujifar, Chaudhuri, Wagner, Guo (UC Berkeley, Meta), "SecAlign: Defending Against Prompt Injection with Preference Optimization", https://arxiv.org/html/2410.05451 | ACM CCS 2025, Taipei, 13-17 Oct 2025 (stated on the page); arXiv v3, 3 Jul 2025 | Full text (first 100k of 125k characters) | SecAlign and, through its comparisons and reference list, StruQ |
| I3 | Wallace, Xiao, Leike, Weng, Heidecke, Beutel (OpenAI), "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions", https://arxiv.org/html/2404.13208 | arXiv v1, 19 Apr 2024; no venue (arXiv-only as far as verified) | Full text; figure values not readable | Privilege levels, tool output as lowest privilege |
| E1 | Kapoor, Stroebl, Siegel, Nadgir, Narayanan (Princeton), "AI Agents That Matter", https://arxiv.org/html/2407.01502 | arXiv v1, 1 Jul 2024 (the HTML is v1); no venue on the page; a TMLR publication is unverified (V1 found none) | Full text (first 100k of 145k characters) | Cost-controlled evaluation, holdouts, reproducibility |
| S1 | Belcak, Heinrich, Diao, Fu, Dong, Muralidharan, Lin, Molchanov (NVIDIA Research, Georgia Tech), "Small Language Models are the Future of Agentic AI", https://arxiv.org/html/2506.02153 | arXiv, first version June 2025 (id); HTML is v3, whose date could not be read reliably; self-described position paper, no venue | Full text | Argument and evidence for SLMs in agents |
| M1 | Zhang, Rossi, Kveton et al. (Dartmouth, Adobe Research, Stanford, UMass, ...), "Personalization of Large Language Models: A Survey", https://arxiv.org/html/2411.00027 | arXiv v3, 13 Jul 2025; "Reviewed on OpenReview" with a forum link; the journal (TMLR?) is unverified | First 100k of 328k characters (body to §5.1; later section names from the contents) | Taxonomy of granularity and techniques; hierarchical user/persona/global idea |
| M2 | Wu, Wang, Yu, Zhang, Chang, Yu (UCLA, Tencent AI Lab), "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory", https://arxiv.org/html/2410.10813 | ICLR 2025 (listed in the ICLR 2025 schedule, V1 snippet); arXiv v2, 4 Mar 2025 | Full text (first 100k of 133k characters) | Memory abilities, accuracy drops, extracted facts lose information |
| M3 | Xu, Liang, Mei, Gao, Tan, Zhang (Rutgers, AIOS Foundation), "A-Mem: Agentic Memory for LLM Agents", https://arxiv.org/html/2502.12110 | arXiv v11, 8 Oct 2025; has a NeurIPS paper checklist but no venue line; NeurIPS 2025 acceptance is unverified | Full text (first 100k of 106k characters) | LLM-written memory notes, memory evolution, small-model numbers |
| V1 | Web search on iclr.cc, openreview.net, neurips.cc, jmlr.org for the four venues (result list and snippets) | n/a | Snippets | ICLR 2025 for P1 (poster page https://iclr.cc/virtual/2025/poster/28128) and M2; nothing for E1 or M3 |

## 1. Proactive assistance

### 1.1 ProactiveBench (P1)

- **Task.** The agent sees user activities, environment events, and environment state, and outputs "the predicted
  task or nothing". When it predicts a task it raises it and waits; the user accepts or rejects; only an accepted
  task is executed. Otherwise it "stays silent" (§3.1, §3.4). Events come from a monitor of keyboard and mouse input,
  visited web pages, and development tools (§3.3).
- **Data and judge.** 136 scenarios, 6,790 training and 233 test entries (coding, writing, daily life) generated by
  a GPT-4o "Environment Gym" (Table 1). Acceptance is judged by a fine-tuned LLaMA-3.1-8B reward model (F1 91.80 %;
  annotator agreement "over 91.67%"), not by real users; "user-centric evaluation" is future work (P1).
- **Metrics.** TP = task proposed and accepted; FP = proposed and rejected (a false alarm); FN = nothing proposed
  but the user needed help (a missed need); TN = silent and not needed. False-Alarm in Table 3 equals 100 % minus
  Precision (§4.2, App. C.5). The prose and the table disagree on some F1 values; the table is used here (P1).
- **Results (Table 3).** Recall is near the ceiling for almost every model while precision stays at 35-50 %:
  GPT-4o recall 98.11 %, false alarms 51.85 %, F1 64.60 %; GPT-4o-mini false alarms 64.73 %; Claude-3.5-Sonnet
  54.63 %; the best fine-tuned model, Qwen2-7B-Proactive, F1 66.47 % with false alarms 50.22 %. Claude-3-Sonnet is
  the opposite failure: recall 27.47 % (P1).
- **Diagnosis.** Models "tend to provide as much assistance as possible", including "early assistance" when intent
  is unclear; a "relatively high ratio of false alarms" is a stated limitation. Proposing three tasks and counting a
  hit if any is accepted raised GPT-4o's F1 to 77.72 % and cut false alarms to 36.44 % (P1).

### 1.2 Later work

- **PRISM (P3, ICLR 2026).** Frames the decision as "whether and when to intervene": false alarms "interrupt users
  and erode trust", missed help loses opportunities. It intervenes only when the calibrated acceptance probability
  clears a threshold that depends on the estimated need and on two costs:
  p_accept ≥ C_FA / (C_FA + p_need · C_FN), where C_FA is the cost of an unnecessary interruption and C_FN of
  missed help; a larger C_FA "makes the agent more conservative". On ProactiveBench, Qwen3-8B-PRISM reports false
  alarms 22.94 % and F1 86.61 % (DeepSeek-R1: 27.64 %, 83.28 %); with human expert evaluation 25.91 % and 84.85 %
  (P3, slides). Everything beyond the slide text is unverified.
- Other hits of P2 and V1 (ProAgentBench, arXiv 2602.04482; Int-Bench; voice and multimodal proactivity
  benchmarks) were not opened: unverified.

### 1.3 What it means for the grey suggestions

- **Supports user confirmation.** P1's own protocol is propose → user accepts or rejects → execute only on accept,
  which is our tap-then-Proposal-card flow (plan §3.4).
- **Supports keeping the model out of the trigger.** Even GPT-4o raises a task that the judge rejects on about half
  its proposals, and fine-tuning a 7-8B model only brings that to about 50 % (P1, Table 3). A Haiku-class model
  writing 5-8 suggestions on every chat open (the kick-off idea the plan already drops) would sit in this regime.
  Haiku itself was not tested (inference). Rule-based eligibility plus a threshold is the "stay silent" option made
  explicit; PRISM's gain also comes from a gate, though a learned, calibrated one (P3).
- **Changes what we measure (small).** Plan §4.3 reports acceptance (P1's precision) but not missed needs (P1's
  recall). Add one log-derived number: chat opens where no suggestion was shown, or a different one, and the user
  then typed a request that an eligible template would have produced and confirmed it. That is FN; acceptance alone
  rewards showing almost nothing, the mirror of P1's high-recall, low-precision models.
- **Optional change.** Write the display threshold in PRISM's form: eligibility rules as p_need, learned per-hour
  acceptance as p_accept, and C_FA/C_FN as the one knob the team sets (P3). The hand score stays.
- **Does not transfer.** P1's rates come from synthetic events and a model judge, not real users (P1). Its pred@3
  gain counts a hit if any of three is accepted, so it is not evidence for showing three suggestions.

## 2. Prompt-injection defences beyond CaMeL and AgentDojo

### 2.1 Model-level defences: StruQ, SecAlign, Instruction Hierarchy

- **StruQ** is cited by I2 as "Struq: Defending against prompt injection with structured queries", USENIX Security
  Symposium 2025 (I2, references); its own paper (arXiv 2402.06363) was not opened. I2 calls it "defensive SFT":
  reserved delimiter tokens separate instruction from data, and the model is fine-tuned on attacked inputs (I2, §4.1).
- **SecAlign** (I2, CCS 2025) adds preference optimisation (DPO): for an injected input, the preferred response
  follows the real instruction and the rejected one follows the injection (I2, §3.2-3.3). Maximum
  optimisation-based attack success on Mistral-7B-Instruct / Llama3-8B-Instruct: undefended 89 % / 97 %, StruQ
  27 % / 45 %, SecAlign 1 % / 8 % (I2, §4.2). On InjecAgent (Llama3-8B-Instruct): 75.9 % → StruQ 2.2 % → SecAlign
  0 % (I2, Table 3). MMLU 65.3 → 63.1 on Llama3-8B (I2, Table 4).
- **Who can use them.** I2's threat model requires that the defender "has complete access to the LLM and can change
  it arbitrarily", and the defence "only applies to the scenarios when the instruction part and data part are
  explicitly stated with clear separations"; "SecAlign cannot achieve 100% security" (I2, §2.1, §6). A team calling a
  hosted model through OpenRouter cannot apply either.
- **Instruction Hierarchy** (I3, OpenAI, arXiv-only): system > user > third-party content; tool text is the lowest
  level, and "we assume that any instruction that appears during browsing or tool use is Misaligned". The model
  should "ignore the lower-privileged instructions when possible" and otherwise refuse (I3, §1, §3.2). Trained into
  GPT-3.5 Turbo: robustness "by up to 63%" (system-prompt extraction), jailbreaks "by over 30%", "up to 34%" on
  held-out attacks incl. tool-use injection (I3, §1, §4; relative or absolute not stated); models are "likely still
  vulnerable to powerful adversarial attacks" (§6). Whether our Haiku-class model is trained so: unverified.

### 2.2 Design patterns (I1) mapped onto our rules

I1's principle: once an agent has read untrusted input, "it must be constrained so that it is _impossible_ for that
input to trigger any consequential actions" (§3). It classes detection and adversarial training (StruQ is cited
there) as heuristics that "do not provide guarantees" (§1, §2). It recommends application-specific agents with
"clearly define[d] trust boundaries", and says "no single pattern is likely to suffice" (§5).

| I1 pattern (definition, I1 §3.1) | Our design | Follow? |
|---|---|---|
| Action-Selector: the LLM picks an action, with no feedback from the action back into the agent | Grey suggestions: rules pick one of 3-4 stored actions and the tap runs it, with no model at all (plan §3.4) | Yes, stricter than I1 (no LLM) |
| Plan-Then-Execute: "prevent the tool outputs from influencing the choice of actions" | Chat loop: resolver and search results flow back into the model and shape its next call | No. Mitigated by the next two rows |
| (I1 §2, §4.3.3) User confirmation | Nothing is made until the user taps the Proposal card | Yes, but I1 warns it is weak alone: "tired or overloaded human verifiers approving unsafe actions" (§2) |
| Constrained outputs (§3.1 map output checks, §4.9.3 "structured object that doesn't have open-ended text") | Ids must come from this turn's resolvers (`FoundIds`); resolvers answer none/one/several from the catalog; aliases point only at catalog ids | Yes for ids. Any free text the model writes into a Proposal is the remaining open channel |
| LLM Map-Reduce: one isolated LLM call per untrusted document | Not used; no batch reading of documents in Scenario 4 | n/a (fits a later event-post parser) |
| Dual LLM: a privileged planner never sees untrusted text; a quarantined LLM reads it | Not used; one model sees event text and friend names inside labelled delimiters (note 03) | No; it would double model calls |
| Code-Then-Execute: the LLM writes a program before seeing data | Not used (CaMeL is the formal version, note 03) | No |
| Context-Minimization: "remove unnecessary content from the context", e.g. the user's prompt once turned into a query | No model-written memories, no shared exemplars, aliases kept out of the prompt (plan §3.3); the user's own text stays in context | In spirit only; I1's version targets injection in the user's own prompt |

I1's closest case studies, Email and Calendar Assistant and Booking Assistant, list user confirmation,
plan-then-execute, dual LLM, and least-privilege API access among possible designs (I1, §4.3.3, §4.5.3).

### 2.3 What it means for us

- **Supports.** Our safety rests on structure (catalog ids only, server validation, a tap before anything is made,
  no cross-user text in prompts), which is I1's recommended kind of defence; model-level training (I2, I3) is out of
  our reach and by its authors' own account incomplete.
- **Changes (small).** (1) Audit the Proposal fields the model fills as free text and, where possible, derive them
  from catalog labels or show them verbatim on the card, per I1 §4.9.3. (2) Present confirmation as the last line,
  not the defence (I1, §2). (3) Keep note 03's rule that resolver words come from the user's own messages; it is
  what bounds the risk of not using Plan-Then-Execute.

## 3. Evaluation rigour: AI Agents That Matter (E1)

- **Cost-controlled evaluation.** "AI agent evaluations must be cost-controlled" (§1). On HumanEval (five runs per
  agent), "'State-of-the-art' agent architectures for HumanEval do not outperform simple baselines": warming
  (GPT-4) 93.2 % for $2.45 and retry 92.0 % for $2.51, against LATS (GPT-4) 88.0 % for $134.50 and Reflexion (GPT-4)
  87.8 % for $3.90 (§2, Table A1); accuracy belongs on a cost-accuracy Pareto plot (§2-3). Joint optimisation on
  HotpotQA cut variable cost 53 % (GPT-3.5) at similar accuracy (§3.2).
- **Downstream reporting.** For downstream developers "cost is the actual construct of interest", and evaluations
  "should include input/output token counts in addition to dollar costs", because prices fall over time (§4).
- **Holdouts.** Four levels of claimed generality (distribution-specific, task-specific, domain-general, general)
  each need a matching held-out set; of 17 agent benchmarks surveyed, 5 had an appropriate holdout and 7 had none
  (§5, Table 1). STeP "hardcodes policies to solve the specific tasks included in WebArena" (§5).
- **Variance.** "agent evaluations are rarely accompanied by error bars"; E1 reports 95 % intervals over five runs
  and found "many reported accuracy scores were above the maximum of five runs" (§2, §6).

What it means for us:

- **Supports.** One tool loop on a cheap model, compared against simple baselines (matcher A vs B vs C; random and
  "most recent" suggestion rows in plan §4.3), with cost per request and intervals, is E1's recipe at small scale.
  Our claim is distribution-specific (SNU's own terms), so in-distribution held-out data suffices (E1, §5), and the
  date split is a stricter version of it.
- **Changes (small).** (1) Report input, output, and cache tokens next to dollars per request (E1, §4). (2) Put one
  larger model through the same harness once and show both as points on a pass^k-vs-cost plot, so "Haiku-class is
  enough" is a measured Pareto claim, not an assumption (E1, §2). (3) The plan tunes k, s, and the suggestion
  threshold "on held-out data" (plan §3.3); keep a final date slice that no tuning touches, and freeze the
  100-term test set before writing the hand-written group table, or the table becomes E1's STeP problem.

## 4. Small models for agents (S1)

- **Claim.** A self-described position: SLMs are "principally sufficiently powerful" for agentic errands, more
  "operationally suitable", and "necessarily more economical for the vast majority of LM uses in agentic systems"
  (S1, §2). An SLM "can fit onto a common consumer electronic device", roughly below 10B parameters (S1, WD1).
- **Argument.** Agent subtasks are "repetitive, scoped, and non-conversational" (§2.3); tool calls need strict
  formats, so "behavioral alignment" to one format matters more than breadth (A5); "SLMs are used by default and
  LLMs are invoked selectively and sparingly" (§2.3).
- **Numbers (all quoted from other papers by S1, not checked in the originals).** A 7B model is "10-30×" cheaper to
  serve than a 70-175B one; xLAM-2-8B reportedly surpasses GPT-4o and Claude 3.5 on tool calling; Nemotron-H
  (2-9B) matches 30B dense models at "an order-of-magnitude fraction of the inference FLOPs" (S1, §3). The share of
  calls an SLM could take over in MetaGPT, Open Operator, and Cradle (about 60 %, 40 %, 70 %) is the authors' own
  estimate, not a measurement (S1, App. B).
- **Fit.** S1's route, fine-tuning an SLM on logged agent calls (10k-100k examples, LoRA/QLoRA; §6), is not ours,
  and its first step ("log all non-human-interface agent calls") conflicts with storing no chat text. Haiku is a
  hosted model of undisclosed size, not an SLM under WD1 (inference). What transfers is the framing: narrow calls,
  strict schemas, and validation outside the model. Supports, as a position, not as evidence.

## 5. Personalization and memory

- **Where the alias lexicon sits (M1).** M1 organises personalization by granularity, user-level (§4.1),
  persona-level (§4.2), and global preference (§4.3), and by technique: RAG (§5.1), prompting including
  profile-augmented prompting (§5.2), representation learning and PEFT (§5.3), and RLHF (§5.4). Our personal layer
  is user-level and the global layer global-level; the data is interaction history plus explicit choices (§3.3.2,
  §3.3.4). M1 §4.4 proposes a "hierarchical personalization framework": user-level for frequent users, global for
  new users, with global preferences as a baseline, which matches our personal-over-global order and our
  cold start (M1 §9.2, "Cold-start Problem"). The technique axis does not fit: aliases act inside the resolver and
  never enter the prompt (plan §3.3), so none of §5.1-5.4 describes them (inference). "past interactions may not
  always accurately reflect current preferences" (§3.3.2) is the case for decay. Chen et al. 2023 was not opened.
- **LongMemEval (M2, ICLR 2025).** 500 questions over five abilities: "information extraction, multi-session
  reasoning, temporal reasoning, knowledge updates, and abstention"; histories of about 115k tokens (S) and 1.5M (M)
  (M2, abstract, §1). Commercial assistants lose accuracy: ChatGPT (GPT-4o) 0.5773 against 0.9184 for offline
  reading (37 % drop), Coze 64 % drop, on a 97-question pilot (M2, Fig. 3a). The key finding for us: "replacing
  sessions or rounds with extracted summaries or facts negatively impacts QA performance due to information loss",
  except for multi-session reasoning (M2, §5.2). The extractor was Llama 3.1 8B Instruct (§5.1), and "Llama 8B ...
  struggles to generate accurate time ranges" for query expansion (§5.4).
- **A-MEM (M3).** The LLM writes each note's keywords, tags, and context, picks links, and in "memory evolution"
  rewrites neighbouring notes; the evolved memory "replaces the original memory" (M3, §3.1-3.3). Multi-hop F1 on
  LoCoMo with GPT-4o-mini: 27.02 against 25.02 for the LoCoMo baseline and 26.65 for MemGPT; without links and
  evolution 9.65 (M3, Tables 1, 3). Small models: Qwen2.5-3B 12.57, Llama 3.2 1B 19.06 (M3, Table 1). About
  1,200-2,500 tokens per memory operation (M3, §4.3, App. A.3). Limitations: quality "may still be influenced by the
  inherent capabilities of the underlying language models"; no error bars (M3, §6, checklist). It does not analyse
  wrong or hallucinated attributes.
- **Failure modes at small scale.** No opened paper measures the error rate of LLM-extracted memories directly. The
  evidence is indirect: extraction loses information even for retrieval QA (M2, §5.2); an 8B model is weak at the
  structured extraction it was asked to do (M2, §5.4); with Qwen2.5-3B, A-MEM's multi-hop F1 is under half of
  GPT-4o-mini's (12.57 vs 27.02), though it still beats the baselines on every small model (M3, Table 1); and A-MEM
  overwrites memories in place, so a wrong rewrite leaves no trace (M3, §3.3). Shared stores: note 05's MINJA.
- **What it means for us.** Supports: explicit choices stored as (words → catalog id) rows, never LLM-written text,
  avoid the extraction loss and the overwrite problem; resolver `none` is M2's abstention ability; decay and
  downvotes are its knowledge updates. Change (small): add "knowledge update" cases to the replay, where a
  Place's correct target changes after date T (a renamed building, a nickname moving to a new building) and the
  metric is how many days until the active alias follows.

## 6. Summary

| Paper | Venue and date | Verdict | Evidence | What we would change |
|---|---|---|---|---|
| Lu et al., Proactive Agent / ProactiveBench (P1) | ICLR 2025; arXiv 2410.12361 | Supports; changes one metric | GPT-4o false alarms 51.85 %; models "tend to provide as much assistance as possible" (Table 3) | Log missed needs (recall) next to acceptance |
| Fu et al., PRISM (P3) | ICLR 2026 (slides only) | Supports | Intervene only if p_accept ≥ C_FA / (C_FA + p_need · C_FN) | Optional: state the display threshold in this cost form |
| Beurer-Kellner et al., Design Patterns (I1) | arXiv 2506.08837, Jun 2025, arXiv-only | Supports; changes one check | Untrusted input must make it "impossible ... to trigger any consequential actions" (§3) | Audit free-text Proposal fields; present confirmation as the last line |
| Chen et al., StruQ (via I2) | USENIX Security 2025 (as cited by I2); arXiv 2402.06363 | Irrelevant | Needs fine-tuning the model; max optimisation-based ASR still 27 % / 45 % (I2, §4.2) | None |
| Chen et al., SecAlign (I2) | ACM CCS 2025; arXiv 2410.05451 | Irrelevant | Defender "has complete access to the LLM"; "cannot achieve 100% security" (§2.1, §6) | None |
| Wallace et al., Instruction Hierarchy (I3) | arXiv 2404.13208, Apr 2024, arXiv-only | Supports (context) | Tool-use instructions are treated as Misaligned; models "likely still vulnerable" (§3.2, §6) | None |
| Kapoor et al., AI Agents That Matter (E1) | arXiv 2407.01502, Jul 2024; journal version unverified | Changes (reporting) | "State-of-the-art" agents "do not outperform simple baselines"; report tokens with dollars (§2, §4) | Tokens with dollars; one larger-model Pareto point; an untouched final date slice |
| Belcak et al., SLMs are the Future (S1) | arXiv 2506.02153, Jun 2025, position paper | Supports (weak) | "SLMs are used by default and LLMs are invoked selectively and sparingly" (§2.3) | None |
| Zhang et al., Personalization survey (M1) | arXiv 2411.00027 v3, Jul 2025; journal unverified | Supports (taxonomy) | User-level for frequent users, global for new users (§4.4) | None |
| Wu et al., LongMemEval (M2) | ICLR 2025; arXiv 2410.10813 | Supports; adds test cases | Extracted summaries or facts hurt QA "due to information loss" (§5.2) | Add knowledge-update cases to the replay |
| Xu et al., A-MEM (M3) | arXiv 2502.12110 v11, Oct 2025; NeurIPS 2025 unverified | Irrelevant (a contrast) | Evolved memory "replaces the original memory"; Qwen2.5-3B multi-hop F1 12.57 (§3.3, Table 1) | None |

No paper changes the architecture. Three change what the harness reports (P1, E1, M2) and one changes a check on
Proposal fields (I1).

## 7. Judgement

Cite five on the rationale slide, each for one design rule, with the venue written as verified:

1. **Design Patterns (I1), arXiv 2025.** For "the model proposes, the server validates, the user taps". Our grey
   suggestions are I1's Action-Selector without an LLM, and catalog-id outputs are its constrained outputs. Say
   "preprint" and name the institutions (ETH Zurich, Google, Microsoft, IBM, EPFL), since it has no venue.
2. **Proactive Agent / ProactiveBench (P1), ICLR 2025.** For "suggestions come from rules, never from the model,
   and need a tap": even GPT-4o's proposals were rejected about half the time (51.85 % false alarms). Add PRISM
   (P3, ICLR 2026) in one line only if the team adopts the cost-form threshold.
3. **AI Agents That Matter (E1), arXiv 2024.** For the evaluation slide: cost per request beside pass^k, simple
   baselines (A/B/C), held-out data matched to the claim, error bars.
4. **LongMemEval (M2), ICLR 2025.** For "no model-written memories": extracted facts lose information, and
   abstention and knowledge updates are named memory abilities, which our `none` and our decay implement.
5. **Small Language Models are the Future of Agentic AI (S1), arXiv 2025.** Optional, for "a small model is enough
   when the calls are narrow and the server validates". Call it a position paper.

Leave out **StruQ and SecAlign** (peer-reviewed, but they need weight access we lack; keep for the Q&A "why not a
trained defence?"), **Instruction Hierarchy** (provider-side, arXiv-only, unverifiable for our model), **A-MEM** (a
method we deliberately avoid, venue unverified), and the **personalization survey** (answers "where does this sit",
user-level plus global §4.4, but is not a rationale).

Before the slides: open the ICLR 2025 page for P1 and M2 to copy the exact citations (V1 is a snippet for M2), and
do not claim a journal for E1, M1, or M3 without checking it.
