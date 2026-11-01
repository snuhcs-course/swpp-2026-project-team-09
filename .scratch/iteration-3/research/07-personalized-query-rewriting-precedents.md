# Industrial precedents for learning per-user and global rewrites from user feedback

Research note for the Iteration 3 design document. Question: how do production systems learn rewrites or aliases
from what users do, decide a rewrite is safe, keep personal and global layers apart, and measure it? It serves the
alias feature (학관 → 학생회관, ㅎㄱ → 학관 learned from chip taps and Place edits; personal at once, global after
several distinct accounts; decaying counts; "아니에요" as a downvote). Builds on note 05, which cites the Alexa paper
(its F1, here Q1) from the abstract only, and note 04 (Cucerzan and Brill 2004).

Every claim cites the source it came from. "Unverified" marks what I did not confirm in a source opened for this note.

## Sources opened

| Id | Source | Read | What it supports |
|---|---|---|---|
| Q1 | Ponnusamy, Roshan Ghias, Guo, Sarikaya, Feedback-Based Self-Learning in Large-Scale Conversational AI Agents (Alexa, AAAI 2020): https://arxiv.org/pdf/1911.02557 | Full text | Absorbing Markov chain rewrite mining, defect signals, blacklist Z-test, deployment, A/B results |
| Q2 | Roshan-Ghias, Mathialagan, Ponnusamy, Mathias, Guo, Personalized Query Rewriting in Conversational AI Agents (Alexa): https://arxiv.org/pdf/2011.04748 | Full text | Per-user memory of successful utterances; recall at 90 % precision with and without memory |
| Q3 | Cho, Jiang, Hao, Chen, Gupta, Fan, Guo, Personalized Search-based Query Rewrite System for Conversational AI (NLP4ConvAI 2021): https://aclanthology.org/2021.nlp4convai-1.17.pdf | Full text | Per-user index with affinity layers, defect signals, global + personal ranker, precision and trigger rate |
| Q4 | Fan, Cho, Huang, Guo, Search based Self-Learning Query Rewrite System in Conversational AI (UFS-QR, DeMaL 2021): https://cdn.amazon.science/4a/a0/067e11f941f8af93ba2544428e1f/search-based-self-learning-query-rewrite-system-in-conversational-ai.pdf | Full text | Global and personal layers, arbitration, hold-out trigger threshold, online A/B for each layer |
| Q5 | Chen, Jiang, Yang et al., Graph Meets LLM: Collaborative Filtering for Robust Conversational Understanding (Alexa, 2023): https://arxiv.org/pdf/2305.14449 | Skimmed (intro, §3.1, results) | Coverage limit of per-user history; guardrail features; online A/B |
| G1 | Nayak, The ABCs of spelling in Google Search (Google blog, 2021-03-29): https://blog.google/products/search/abcs-spelling-google-search/ | Full page | Ask ("did you mean") vs auto-correct by confidence; way back to the original |
| M1 | Google Maps Help, Give a place a private label (Android): https://support.google.com/maps/answer/6257830?hl=en&co=GENIE.Platform%3DAndroid | Full page | User-set place labels used in search suggestions; edit, remove, undo |
| S1 | Apple iPhone User Guide, Tell Siri about yourself: https://support.apple.com/guide/iphone/tell-siri-about-yourself-iphfaf30bdbd/17.0/ios/17.0 | Search result summary only | Relationship names ("… is my mom") taught by the user |
| N5 | Note 05, sources K1 (Apple, Learning with Privacy at Scale) and K2 (Gboard Help) | Via note 05 | Keyboard words learned above a count threshold; user add/remove |
| R | This repository, as summarised in note 05 ("Where the Assistant stands") | Note 05 | Resolver contract: `none` / `one` / `several`, catalog ids only |

## 1. Alexa feedback-based self-learning (Q1, full text)

### 1.1 Mining: sessions, defects, and the absorbing Markov chain

- **Data.** Three months of anonymised logs "across millions of customers". A session is one customer's utterances
  on one device, consecutive ones at most δτ = 45 seconds apart (Q1, Dataset).
- **States.** Each utterance is projected into an "interpretation space" H of NLU outputs, written like
  `Music|PlayMusicIntent|AlbumName:despicable me`, so that many phrasings share one state; |H| is about 10⁶
  (Q1, Interpretation Space; Implementation). Transition probabilities are plain co-occurrence counts of adjacent
  interpretations over all sessions, divided by the state's total count (Q1, Eq. 6–8).
- **Defects = absorbing states.** Two states, success r⁺ and failure r⁻, are appended to the end of every session.
  *Explicit* feedback is the user interrupting ("play a lever" → playback → "stop": the "stop" turn is dropped and a
  failure added). *Implicit* feedback is abandoning the session after a failure, such as "Sorry, I can't find the
  artist maj and dragons." Success is "the absence of failure" (Q1, Absorbing States). A separate pre-trained model
  on the user's utterance and Alexa's response does friction detection; its details are out of scope of the paper
  (Q1, System Overview).
- **Choosing a rewrite.** A target interpretation hₜ is a candidate for source hₛ only if it is reachable from hₛ and
  its probability of success through that path beats hₛ's own: Φ∞(hₜ) > Φ₁(hₛ); the rewrite is the arg max, mapped
  back to an utterance through P(u|h) and P(h|u) (Q1, Eq. 12, 18, 20). If the arg max is hₛ itself, the utterance is
  already successful and is not rewritten, so the model "self-partitions" H into successful and unsuccessful
  interpretations and targets only likely-defective ones (Q1, Markov Model).
- **Short chains.** About 97.3 % of source interpretations are absorbed within short paths (typically ≤ 5), so a
  breadth-first search to depth 5 in Spark suffices (Q1, Implementation).
- **Minimum support.** The worked example uses three sessions, but "in practice, we had a higher threshold for the
  minimum number of customers and interactions"; the value is not given (Q1, Fig. 2 caption).

### 1.2 Gating: how a rewrite earns deployment

- **Offline blacklist with a significance test.** Before upload, each rewrite's friction rate is compared with the
  original utterance's; it is filtered out if it does worse than no rewrite, "using a Z-test with a rather
  conservative p-value of 0.01" (Q1, System Overview).
- **Feature flag.** Rewrites in the online database are updated through "a low-maintenance feature-toggling (i.e.
  feature-flag) mechanism" (Q1, System Overview).
- **Human-annotated offline precision.** 5,679 unique utterance–rewrite pairs were annotated: accuracy 93.4 % and
  win/loss ratio 12.0, against 55.2 % for a seq2seq baseline trained on mined rephrases; one stated reason is that the
  graph can say "do not rewrite" (Q1, Offline Analysis).
- **No confirmation prompt.** Asking the user to confirm every rewrite "is on itself an added friction", so rewrites
  "seamlessly replace" the utterance (Q1, Related Work).

### 1.3 Failure modes and rollback

- Two recurring bad rewrites: collapse to a **generic utterance** ("play swaggy playlist" → "shuffle my songs"),
  because many divergent paths aggregate there; and an **intent change** ("play carter five" → "play carter four"),
  often because the original was unsuccessful for a period and users switched to a similar song (Q1, Offline
  Analysis, Table 1). The first is "easy to correct" by rules or a ranker after the graph; the second is caught by
  "an online blacklisting mechanism" in production (Q1, Offline Analysis).
- **Freshness.** Daily jobs re-mine rewrites "to remove stale and ineffective rewrites"; on a conflict "we pick the
  most recent rewrite"; online alarms watch the daily jobs, and large metric changes trigger a root-cause dive (Q1,
  Offline Rewrite Mining).
- How an online blacklist entry is triggered (thresholds, window) is not described: unverified.

### 1.4 Personal vs global

Q1 is **global only**: a key-value store, original utterance → rewrite ("play babe shark" → "play baby shark"),
"fundamentally stateless across users" (Q1, System Overview; Online Service). Personalization came later (section 2).

### 1.5 Reported metrics

| Metric | Value | Source |
|---|---|---|
| Defect-rate reduction, online A/B over two weeks vs no rewrites | > 30 %, p < 0.001 | Q1, Online Performance |
| Win/loss ratio, unique rewrites significantly better vs worse than no rewrite (Z-test, p 0.01), three months after launch | 11.8 online vs 12.0 offline | Q1, Online Performance |
| Offline accuracy on 5,679 annotated pairs | 93.4 % (seq2seq baseline 55.2 %) | Q1, Offline Analysis |
| Time in production at writing | over 9 months, "millions of users" | Q1, Online Performance |

Monitored: number of rewrites, friction rate of rewritten vs non-rewritten traffic, weekly annotation of sampled
traffic, weekly satisfaction metrics (Q1, Online Performance).

## 2. Alexa's personalized rewriting (Q2–Q5, full texts)

### 2.1 What is stored per user

| Paper | Per-user store | Window and size | Success / defect signal |
|---|---|---|---|
| Q2 (2020) | "User memories": that user's queries from successful dialogues, with their frequency fed to the encoder | 4 weeks (Q2, §2; Fig. 3) | Success = Alexa executed the request and the user did not issue a follow-up intent in that domain for a set period, e.g. did not change the air conditioner setting again (Q2, §2, footnote 1) |
| Q4 (2021) | Personalized index of that user's successful queries, same document format as the global index | 30 days, rebuilt daily, capped at the top l utterances by impression and recency; 90 days gave more correction opportunities but 30 was chosen for latency, storage, and opportunity size (Q4, §4.2) | Friction from a DNN dialogue-quality model plus rules such as a response starting with "sorry" (Q4, §4.1) |
| Q3 (2021) | Personalized index with four "affinity layers": utterance (grouped by NLU hypothesis), entity, intent, and template (the carrier phrase with slots blanked); each entry keeps a user count and a user defect count, e.g. "cocomelon" said 30 times, 3 of them defects (Q3, §3–3.4) | Last 30 days, top l = 100 utterances by count and recency (Q3, §3) | Defect model plus rules: the user barged in or stopped the response, or the agent said "sorry, I do not know that" (Q3, §3) |

The motivating examples are names only that user has: a smart-home device called "kim" that ASR hears as "cam", a
lamp called "the moon", a playlist, a routine phrase like "start my work day" (Q3, §1, Table 4; Q4, §4.2, Table 5).
Without memory a model cannot tell "bathroom" from "bedroom"; with it, a user who has only ever switched "bedroom"
gets "bedroom" (Q2, §4.2.2).

### 2.2 How the personal and global layers are combined

- **Separate layers, personal wins.** UFS-QR runs a global index (all users' interactions over about 30 days,
  documents grouped by NLU hypothesis, each query with total impressions and defect impressions, pruned by an
  impression cut-off "to remove noise") and a per-user index, each with its own retrieval and ranking. "When both
  global and personalized components return a rewrite candidate, we prioritize the results from personalization layer"
  (Q4, §1, §4.1, §7). The reason given: some frictions are global ("tooth or dare" → "truth or dare"), others differ
  by user ("play imagine" means John Lennon for some, Ariana Grande for others) (Q4, §1).
- **One ranker with both kinds of features.** Q3 ranks the top 10 personal candidates with LightGBM on about 730
  features: global (IR scores, phonetic similarity, 30-day defect averages, number of users who said the utterance)
  and personal (the user's entity/intent/template counts and defects, a user embedding) (Q3, §5–5.3). Global features
  alone: −1.17 % precision, +7.39 % trigger rate; global plus personal: +7.60 % and +19.10 %, relative to the best
  retrieval-only system (Q3, Table 3). 80 % of the defect features ranked in the top 50: "generic, non-personalized
  defect information is still required" (Q3, §6.2).
- **Bounded candidate pool.** Search-based rewriting is preferred over generation because "the rewrite candidate pool
  is defined in the index, rewrite quality can be tightly controlled" (Q3, §2). This is the same guarantee as R:
  an alias can only point at a catalog id the resolver returns.
- **Coverage limit of the personal layer.** About 50 % of a week's queries were not covered by a user's history index
  even when it was built from a year of history, and those "unseen" interactions had about 7 % more defects (Q5,
  §1). Q5 fills the gap from similar users through a user–entity graph whose edges carry impression, defect rate,
  barge-in rate, and termination rate, keeping only interactions whose defect rate is below a threshold (Q5, §3.1).

### 2.3 Gating, triggering, and training labels

- **Trigger only when unsure.** QR runs when ASR or NER confidence is low (Q3, §1). The final rewrite is the top 1
  whose ranking score exceeds an empirically chosen θ, "carefully chosen ... to avoid bad rewrites in production"
  (Q3, §5, §6.2). In UFS-QR θ is set on a hold-out set and the GBDT ranker uses a logistic loss so its score is
  calibrated; it does not trigger "when the model is not confident" (Q4, §3, §6.2).
- **Same Z-test blocklist as Q1.** UFS-QR deploys "a blocking mechanism to disable any bad rewrites", comparing the
  friction rate of the original and the rewrite with a Z-test (Q4, §3).
- **Why precision first.** Confirming with the user "by introducing an extra turn is typically considered as a
  friction", so the system must keep high precision (Q4, §2).
- **Labels from rephrases, filtered.** Training pairs are consecutive utterances where the first was a defect and the
  second succeeded, within t = 45 s and edit distance below d = 5, plus pairs where the second turn's top ASR
  hypothesis appeared in the first turn's n-best (Q4, §8.1: 40 million pairs). Q3 adds a per-user transition
  probability filter P(u₂|u₁) > p = 0.5, keeping 60 % of the rephrases and still improving precision (Q3, §4.1; the
  paper gives d = 5 and later d = 7). Q2 keeps "non-rewritable" pairs (the user changed their mind) in training "since
  we want to learn to not rewrite these cases" (Q2, §2).

### 2.4 Privacy

Only "de-identified" or "anonymized" data (Q1, Dataset; Q3, §3 footnote; Q4, §4.2 footnote), sampling that respects
"user instructions on data retention" (Q2, §2), and per-user stores bounded to 4 weeks or 30 days and l = 100 entries
(Q2, §2; Q3, §3; Q4, §4.2). How a user sees or deletes a personal rewrite: not described in any of them.

### 2.5 Reported results

| Result | Value | Source |
|---|---|---|
| PR-AUC, no memory → retrieval with memory → pointer network with memory (5-best ASR) | 0.225 → 0.848 → 0.856 | Q2, Table 1 |
| Recall at 90 % precision, same three | not reachable → 36.6 % → 42.0 % | Q2, Table 1 |
| Personalized vs global on a 6k-case personalized test set | +64.1 % relative p@1, about 12× the trigger rate | Q4, Table 4, §9.1 |
| Online A/B, global UFS-QR vs the Q1 system, US English, one week | defect rate −13 % (p < 0.001); global rewrites +13.5 % | Q4, §9.2 |
| Online, personalized layer on top of global | further defect rate −4 %, rephrases −4.33 % (p < 0.001), dissatisfaction −1.46 % (p < 0.023); global and personal rewrites about 1:1; total rewrites +46 % | Q4, §9.2 |
| New, never-triggered rewrite pairs per week vs the Q1 system | global +75 %, personalized +30 % | Q4, §9.2 |
| Guardrail features in the collaborative ranker | false trigger rate on a guardrail set 10.4 % → 2.1 %, precision 83.1 % vs 82.0 % | Q5, §4.1 |
| Online A/B, collaborative personal index | defect rate −19 % relative (p < 0.0001); "23% additional personalized defect removal" | Q5, §4.1.4 |

Not found: an Amazon paper on learning personal contact names, or a per-user evidence count before a personal rewrite
fires; Q3 and Q4 use a score threshold θ whose value is not published.

## 3. Other production precedents for learned or user-taught aliases

- **Google Search spelling (G1).** One in ten queries is misspelled and many misspellings "appear only once"; the
  model has over 680 million parameters and runs in under two milliseconds. "Pretty sure" → it asks "did you mean…";
  "very confident" → it shows the corrected results, but will "always let you know and provide a way to get back to
  your original spelling" (G1). G1 does not name query logs as training data; the query-log precedent stays Cucerzan
  and Brill 2004 (note 04), and Google's own log-mining method is unverified.
- **Google Maps private labels (M1).** A user labels an address or pin; "Labeled places show up on your map, in search
  suggestions, and in Google Photos"; labels are edited or removed under You > Labeled, with an undo (M1): a personal
  alias that feeds search. That only the user sees them is implied by "private", not stated there: unverified.
- **Siri relationships (S1).** "Ashley Kamin is my mom" teaches a relationship that "FaceTime mom" then uses (S1,
  search summary only; storage and editing details unverified).
- **Keyboards (N5).** Apple learns new words only once their privatised counts pass a threshold T; Gboard lets the user
  add a word to the dictionary or drag a suggestion to Trash (note 05, K1 and K2).
- **Music services learning song nicknames** (e.g. Spotify): no primary source found; not claimed.

## 4. Guardrails and promotion rules, collected

| Guardrail | Rule or value | Source |
|---|---|---|
| Minimum support before a global rewrite | "A higher threshold for the minimum number of customers and interactions"; value not published | Q1, Fig. 2 |
| Noise cut on the global index | Impression-based pruning with a cut-off; value not published | Q4, §4.1 |
| Distinct-user evidence | Number of users who said an utterance in 30 days is a ranking feature (Q3); a keyboard word is learned only once its privatised count passes T (N5) | Q3, §5.1; N5 (K1) |
| Rewrite must beat no rewrite | Success probability through the rewrite > the source's own; if the source already succeeds, no rewrite | Q1, Eq. 12, 18 |
| Significance-tested blocklist | Z-test on friction rate, rewrite vs original, p = 0.01; worse rewrites are not uploaded or are blocked online | Q1, System Overview; Q4, §3 |
| Calibrated confidence threshold | QR runs only when ASR or NER confidence is low (Q3); top-1 fires only above θ chosen on a hold-out set, score calibrated by a logistic loss (Q4) | Q3, §1, §6.2; Q4, §3, §6.2 |
| Two confidence tiers | "Pretty sure" → ask; "very confident" → act, say so, and offer a way back | G1 |
| Personal over global | Personal-layer rewrite wins when both fire | Q4, §7 |
| Precision-first evaluation | Recall at 90 % precision | Q2, Table 1 |
| Label hygiene | Rephrase within 45 s, edit distance < 5, P(u₂\|u₁) > 0.5; keep "non-rewritable" pairs as negatives | Q1, Dataset; Q4, §8.1; Q3, §4.1; Q2, §2 |
| Freshness and windows (their form of decay) | Daily re-mining removes stale rewrites, most recent wins on conflict (Q1); global window 3 months (Q1) or 30 days (Q4); personal 4 weeks (Q2) or 30 days rebuilt daily (Q3, Q4) | Q1, Offline Rewrite Mining; Q2, §2; Q3, §3; Q4, §4 |
| Size cap per user | Top l = 100 utterances by count and recency | Q3, §3 |
| Only low-defect history counts | Interactions enter the graph only if their defect rate is below a threshold | Q5, §3.1 |
| Kill switch | Rewrites deployed behind a feature flag; alarms on the daily jobs | Q1, System Overview; Offline Rewrite Mining |
| Launch gate | Online A/B before full launch: two weeks (Q1), one week, each layer separately (Q4) | Q1; Q4, §8.3, §9.2 |
| False-trigger test set | Dedicated guardrail set; false triggers 10.4 % → 2.1 % | Q5, §4.1 |
| Ongoing audit | Weekly human annotation of sampled traffic; watch count of rewrites and new rewrites | Q1, Online Performance; Q4, §9.2 |
| User control | Remove a label with undo (M1); remove a learned word (N5, K2) | M1; N5 |

No source opened publishes a concrete minimum number of distinct users for a global rewrite (Q1 and Q4 withhold it),
an exponential decay rate, or a per-user evidence count for a personal rewrite. Those values are ours to choose.

## 5. Judgement for SNU Now

**Transfers directly (cite these as industrial precedent):**

1. *Two layers, personal first.* UFS-QR keeps separate global and per-user indexes and lets the personal rewrite win
   (Q4, §7); adding the personal layer on top of the global one cut defects by a further 4 % online (Q4, §9.2). Our
   personal alias applying at once and before the global alias is the same ordering.
2. *Bounded candidates.* Search-based rewriting was chosen because the index bounds what a rewrite can be (Q3, §2).
   Our aliases map words to existing catalog ids only, and the resolver contract (R) already enforces it.
3. *Global evidence counted over users, not events.* Q1 sets a minimum number of customers (value unpublished), Q3
   uses the number of distinct users as a feature, and Apple learns a word only above a count threshold (N5). Our
   "k distinct accounts, share ≥ s" rule follows that line; k and s are our choice, not sourced.
4. *Ask vs act by evidence, with a way back.* G1's "pretty sure → ask, very confident → act and offer the original"
   is our `several` (chips) vs `one` (alias hit) plus the "학관 → 학생회관으로 찾았어요 · 아니에요" line. Alexa
   avoids confirmation prompts because a voice turn is friction (Q1, Related Work; Q4, §2); on a screen the one-line
   notice with undo is cheap, so we keep it.
5. *Freshness and kill switch.* Daily recompute, recent evidence winning, windows of 30 days to 3 months (Q1, Q3,
   Q4), and a feature flag (Q1). For us: decaying counts recomputed on write or nightly, and a per-alias `retired`
   status plus a global flag to switch global aliases off.
6. *User control.* Visible, removable personal labels with undo (M1; N5) back the "내가 가르친 말" list.

**Does not transfer (scale-dependent):**

- Implicit-reformulation mining with an absorbing Markov chain needs three months of sessions from millions of
  customers (Q1, Dataset). Our chip tap is an explicit label; there is no "absence of failure" to infer.
- Z-test blocklists at p = 0.01 and week-long A/B tests (Q1, Q4): at hundreds of users most aliases never get enough
  traffic for such a test (my inference). Use "아니에요" and Place edits as the defect label, plus a holdback group
  and time-split replay (note 05, §5).
- Neural retrievers and rankers trained on 40 million pairs (Q4, §8.1), a fine-tuned 7B LLM (Q5), phonetic encoders
  (Q3): no data at our size; the 초성 key is our deterministic stand-in for phonetic matching.
- Pooling one user's behaviour into similar users' suggestions (Q5): not needed for public Places, a privacy cost
  for anything personal.

**Metrics they report that we can report too** (each on a time split, with n, per note 05):

| Our metric | Their counterpart | Source |
|---|---|---|
| Defect rate of alias resolutions: share undone with "아니에요" or whose Proposal Place was edited | Defect rate, rewrite vs no rewrite (−30 %, −13 %, −4 %) | Q1; Q4, §9.2 |
| Clarification (friction) rate: share of Place mentions that needed a chip choice | Average friction rate of rewritten vs non-rewritten traffic | Q1, Online Performance |
| Trigger rate: share of mentions resolved by an alias, at fixed precision | Trigger rate; recall at 90 % precision | Q3, §6.1; Q2, Table 1 |
| Precision of active aliases on a hand-judged sample, and win/loss ratio per alias (fewer chips vs downvoted) | Annotated accuracy 93.4 %; win/loss 12.0 offline, 11.8 online | Q1, Offline Analysis; Online Performance |

Report seeded aliases separately from learned ones (note 05, §6), and global and personal layers separately, as Q4
launched and measured each layer on its own (Q4, §8.3).
