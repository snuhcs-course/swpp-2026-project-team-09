# One-tap suggestions and learned shortcuts: triggering, ranking, logging, fatigue, and evaluation

Research note for the Iteration 3 design document. Question: how should the SNU Now Assistant pick ONE grey
suggestion (ghost text or a chip such as "민수랑 점심 어때요?") when the chat opens, from deterministic context (class
status, open cards, recent confirmed requests, time of day), run it on a tap without a new model call, and turn
repeated requests into one-tap shortcuts, under "the model proposes, the server decides" with a cheap, explainable
ranker? Note 05 (`05-self-improving-assistant.md`) already covers the learned alias lexicon, poisoning defences,
position bias in clicks (its F3), and time-split evaluation (its §5); they are linked, not repeated.

Every claim cites its source id. "Unverified" marks what no source opened for this note confirms; "my design" and
"my arithmetic" mark statements with no source. Abstracts came from one arXiv API request
(`https://export.arxiv.org/api/query?id_list=1906.00080,2205.06537,1003.0146,1003.5956,2306.04930,1606.04870,2305.12050,2402.04141,1103.4601,1802.04064,2210.14306,1707.02038,2302.06590`)
and F1–F5 from one arXiv API search (`abs:"notification fatigue" OR abs:"notification volume" OR ti:"fatigue-aware"
OR ...`). For papers not marked "Full text", anything beyond the abstract is unverified.

## Sources opened

| Id | Source | Read | What it supports |
|---|---|---|---|
| G1 | Chen et al., Gmail Smart Compose: Real-Time Assisted Writing: https://arxiv.org/abs/1906.00080 | Full text | Inline ghost-text suggestions in Gmail; latency, triggering, metrics |
| G2 | Kannan et al., Smart Reply: Automated Response Suggestion for Email: https://arxiv.org/abs/1606.04870 | Full text | One-tap whole replies; diversity; triggering |
| C1 | Ziegler et al., Productivity Assessment of Neural Code Completion (GitHub Copilot): https://arxiv.org/abs/2205.06537 | Full text | Acceptance rate vs persistence as a productivity proxy |
| C2 | Mozannar, Bansal, Fourney, Horvitz, When to Show a Suggestion? (CDHF): https://arxiv.org/abs/2306.04930 | Full text | Hiding suggestions likely to be rejected; acceptance as reward pitfall |
| C3 | Mozannar et al., Reading Between the Lines (CUPS): https://arxiv.org/abs/2210.14306 | Abstract | Time costs of verifying suggestions |
| C4 | Murali et al., AI-assisted Code Authoring at Scale (Meta CodeCompose): https://arxiv.org/abs/2305.12050 | Abstract | Deployment numbers for a single-suggestion inline tool |
| C5 | Dunay et al., Multi-line AI-assisted Code Authoring (Meta): https://arxiv.org/abs/2402.04141 | Abstract | "Jarring" suggestions, perceived latency, shown vs accepted share |
| C6 | Peng et al., The Impact of AI on Developer Productivity (Copilot RCT): https://arxiv.org/abs/2302.06590 | Abstract | Controlled-experiment effect size |
| B1 | Li, Chu, Langford, Schapire, A Contextual-Bandit Approach to Personalized News Article Recommendation (LinUCB): https://arxiv.org/abs/1003.0146 | Abstract | LinUCB; offline evaluation from random traffic; lift grows when data is scarce |
| B2 | Li, Chu, Langford, Wang, Unbiased Offline Evaluation of Contextual-bandit-based News Article Recommendation: https://arxiv.org/abs/1003.5956 | Abstract | Replay method |
| B3 | Dudík, Langford, Li, Doubly Robust Policy Evaluation and Learning: https://arxiv.org/abs/1103.4601 | Abstract | IPS variance vs reward-model bias; doubly robust estimator |
| B4 | Bietti, Agarwal, Langford, A Contextual Bandit Bake-off: https://arxiv.org/abs/1802.04064 | Abstract | Greedy baseline nearly as good as the best method |
| B5 | Russo et al., A Tutorial on Thompson Sampling: https://arxiv.org/abs/1707.02038 | Abstract | Thompson sampling, Bernoulli bandits, when it is or is not effective |
| S1 | Apple Developer Documentation, Donating Shortcuts (SiriKit): https://developer.apple.com/documentation/sirikit/donating-shortcuts (read as its JSON) | Full page | When an app tells Siri about an action; what Siri predicts from it |
| S2 | Apple, Search & Privacy and Siri, Dictation & Privacy notices; Apple Support, About Siri Suggestions on iPhone (https://www.apple.com/legal/privacy/data/en/siri-suggestions-search/, https://support.apple.com/guide/iphone/about-siri-suggestions-iph6f94af287/14.0/ios/14.0) | Search snippets only | On-device learning claims; all unverified |
| S3 | Eberhardt, The science behind Hunches: Deep device embeddings, Amazon Science, 2022-03-16: https://www.amazon.science/blog/the-science-behind-hunches-deep-device-embeddings | Full page | Alexa Hunches models |
| S4 | Amazon Customer Service, What Are Alexa Hunches?: https://us.amazon.com/gp/help/customer/display.html?nodeId=G7F5F7K93GKSLC4F | Search snippet only | Defaults and controls; all unverified |
| F1 | Cao, Sun, Shen, Ettl, Fatigue-aware Bandits for Dependent Click Models: https://arxiv.org/abs/2008.09733 | Abstract | Fatigue from irrelevant and repetitive content; exits |
| F2 | Moriwaki et al., Fatigue-Aware Ad Creative Selection: https://arxiv.org/abs/1908.08936 | Abstract | Effect changes with repeated exposure |
| F3 | Wang, Tulabandhula, Thompson Sampling for a Fatigue-aware Online Recommendation System: https://arxiv.org/abs/1901.07734 | Abstract | Users abandon after less useful items |
| F4 | He et al., Automating Dependency Updates in Practice (Dependabot): https://arxiv.org/abs/2206.07230 | Abstract | Notification fatigue from a bot; users turn it down or off |
| F5 | Wang, Baiocchi, Evaluating Algorithm-Assisted Human Decision-Making Over Repeated Algorithm Exposure: https://arxiv.org/abs/2607.27701 | Abstract | Behaviour adapts with repeated exposure; evaluation design |

## 1. Ghost text and one-tap suggestions: when to show, what to measure

### 1.1 What the deployed systems do

| System | Shown | Trigger policy | Latency | Reported numbers |
|---|---|---|---|---|
| Gmail Smart Compose (G1) | Only the top suggestion, inline as the user types | Shown "only when the model is 'confident' enough"; confidence is a length-normalised log conditional probability; the threshold is set "based on a target triggering frequency/coverage" (§3.3); thresholds per language tuned to similar coverage (§6) | 90th percentile under 60 ms, because 0.1 s is "about the limit" for feeling instantaneous (§1.1); inference on almost every keystroke | Saves "over one billion characters of typing" a week (§1) |
| Gmail Smart Reply (G2) | Three whole replies, one tap each | A separate cheap triggering network decides whether to suggest at all; it fires on about 11 % of messages, AUC 0.854 on a time-ordered 80/20 split (§6, §7.2.1) | "Within milliseconds" per message for the trigger (§6) | 10 % of mobile replies in Inbox (abstract) |
| GitHub Copilot (C1) | One inline completion | An "opportunity" is a heuristic decision that a completion might fit (e.g. the cursor is not mid-word); rules decide when to request, abandon requests "if the developer has moved on", and how much of the response to surface (§3, Table 1) | Not stated | Acceptance rate 27 %, mean of over 31 accepted completions per user per day; IntelliCode Compose reported a 10 % CTR (§2) |
| Copilot + CDHF (C2) | One inline completion, or none | At each pause in typing a cascade decides: m1 (no suggestion features, AUC 0.631) whether to generate, m2 (XGBoost, AUC 0.780; 0.795 with the programmer id as a feature) whether to show; thresholds set so a hidden suggestion would have been rejected with probability at least p (§1, §6.2) | Features and inference under 1 ms on a CPU without embeddings (§6.2) | Retrospectively: hide 25 % of shown suggestions with 95 % of them would-be rejections, skip generating 13 %, acceptance rate +7.2 %; data 535 programmers, 168,807 shown, 33,523 accepted (21.4 %) (§1, §6.1). A minimal version shipped in Copilot (§1) |
| Meta CodeCompose (C4, C5) | One inline suggestion, single-line then multi-line | Not in the abstracts | Multi-line latency cut 2.5× by hosting work (C5) | 8 % of code from CodeCompose for 16K developers (C4); multi-line: 16 % of shown suggestions but 42 % of accepted characters, keystrokes saved 9 % → 17 %, under 1 % opted out (C5) |

### 1.2 What they learned

- **Show nothing unless a score clears a threshold set for a target.** Smart Compose sets it from a target coverage,
  compares models at equal coverage, and scores only triggered suggestions (G1 §3.3–3.4); perplexity gains where the
  model would not trigger never reach the product metric (G1 §4.2). CDHF sets it on a validation split for a target
  probability that a hidden suggestion would have been rejected (C2 §6.3), and frames the gate as utility: acceptance
  probability against the user's verification time and the latency (C2 §4). Smart Reply's trigger, firing on about
  11 % of messages, "vastly reduces" the useless suggestions users see (G2 §6).
- **The cost of a wrong suggestion sets how eagerly to show.** Smart Reply found it "may be beneficial to slightly
  over-trigger, since the cost of presenting a suggestion, even if it is not used, is quite low" (G2 §7.2.1). That
  holds for reply chips under an email; a suggestion that names a Friend costs more when wrong (section 4).
- **One inline vs several tap targets.** Inline ghost text shows one (G1, C1, C2), and longer inline suggestions can
  feel "jarring" (C5). A separate row of tap targets shows several, diverse on purpose: Smart Reply never shows two
  replies of the same intent and swaps in a negative reply when the top ones are all positive, because "the
  likelihood of at least one response being useful is greatest when the response options are not redundant" (G2 §5).
- **Acceptance rate is the right coarse metric, with known biases.** It correlated best with perceived productivity
  (ρ = 0.24, P < 0.0001, 2,047 matched survey responses), better than every persistence measure (accepted text
  unchanged, or under 33 % Levenshtein change, after 30–600 s) (C1 §3–4). It moves with things unrelated to quality:
  23.5 % on weekends, 23 % on weekday evenings, 21.2 % in weekday working hours (C1 §5.2), and by language (C1 §5.1).
  The authors use it for "coarse-grained monitoring" (C1 §1); the direct measure is a controlled experiment, e.g.
  Copilot users finishing a task 55.8 % faster (C6).
- **Optimising acceptance alone games itself.** CDHF cites Goodhart's law (C2 §6.3). Ranking candidates by predicted
  acceptance favoured short ones: for over 60 of 164 HumanEval problems the top candidate lay in the first 20 % of the
  solution, for at least 40 it was the first token (C2 §7). An under-trained filter also hides useful ones (C2 §6.3).
- **Personal counts plus a global model.** Smart Compose blends a per-user Katz-backoff n-gram model (the user's Sent
  mail of the past few months) with the global model by one constant weight α, chosen offline and confirmed online:
  about 6 % relative CTR gain and 10 % relative ExactMatch gain after launch (G1 §5). Personal state had to be "small,
  adaptive, easy for serving" (G1 §5.1).
- **The user's state matters.** Acceptance prediction with the programmer's self-labelled activity reached 83.6 %
  accuracy vs 61.9 % without it (21 programmers, 1,096 suggestions; C2 §4, from the C3 study). In SNU Now "the chat
  was just opened" vs "the user is typing" is that state, and it is observable.

What transfers: one grey suggestion, shown only when a cheap score clears a threshold set for a target precision;
acceptance rate as the headline, guarded by a value metric (our persistence: the Proposal the tap produced was
confirmed, not edited or cancelled). What does not: neural scoring per keystroke; our candidates are built once.

## 2. Shortcuts learned from usage: Siri Suggestions and Alexa Hunches

### 2.1 Apple: donations of completed actions

- **Evidence is a completed action, as structure.** An app "donate[s] a shortcut each time the user performs the
  action", one donation per action, never for "actions the user hasn't completed"; for a completed task "Siri can
  deconstruct the donation into its intent parameters allowing for more intelligent predictions" (S1).
- **Use.** "Siri can predict shortcuts to actions that a user may want to perform using your app, and suggest those
  shortcuts to the user in places such as Spotlight search and the Lock Screen"; the app can delete its donations
  (S1). The page does not say how time, place, or repetition are weighed (S1).
- **Privacy claims** (unverified, S2 snippets): suggestions learned "based on your routines and how you use your
  apps" on the device, from Safari history, messages, contacts, notifications, and app donations; not stored on Apple
  servers; synced end-to-end encrypted; each app can be excluded. No Apple ML Research paper on Siri Suggestions
  ranking was found within this note's budget.

### 2.2 Amazon: Hunches

- Since 2018, "an Alexa setting that offers reminders when Alexa thinks you forgot to turn off a light or to lock a
  door"; Automatic Actions, which act when customers are asleep or away, are a separate feature (S3).
- Two models: an encoder embeds each device's previous states and the home's configuration, and a decoder predicts
  future state ("whether a device would be on at a certain time"); a separate model on the same encoder is "trained
  to predict whether a given Hunch will be accepted or not". They "need to clear a high bar"; no threshold or
  precision is published. Alexa initiates "one in four" smart-home interactions (S3).
- Unverified (S4 snippet): suggestions on by default with a Hunches settings page; inputs include device state,
  interactions, and location; acting on lights must be switched on by the user; a related feature suggests a Routine
  from frequent patterns (e.g. lights and heat at 7 a.m.).

### 2.3 What transfers to SNU Now

1. **Count completed actions only** (S1): a confirmed Proposal or an executed request, never a typed message, an
   impression, or a tap that was then cancelled.
2. **Key shortcuts by structure** (S1): intent plus normalised parameters (`meal · Friend 민수 · 학생회관 ·
   12:00±30m`), not wording. The grey text is rendered from the structure, so a tap runs it without a model call.
3. **Separate "applies now" from "will they take it"** (S3): the first is deterministic here (free period started,
   the Friend is free, the Place is open); the second is what the logs teach.
4. **Suggest, never act** (S3 keeps Hunches apart from Automatic Actions): a tap, then the Proposal's own confirm.
5. **Personal, small, deletable**: per-user counts as in G1 §5, and a "자주 하는 요청" list with delete (S1).

## 3. Ranking a handful of candidates: hand-written score or bandit

### 3.1 What the bandit papers say

- **LinUCB (B1).** News recommendation as a contextual bandit over user and article features, learning from clicks:
  12.5 % click lift over a context-free bandit on "over 33 million events" of Yahoo! Front Page traffic, larger "when
  data gets more scarce"; evaluated offline "using previously recorded random traffic" (B1).
- **Replay (B2).** "Completely data-driven" and "provably unbiased" offline evaluation, unlike simulators; it agreed
  with online bucket tests (B2). Mechanism as commonly described (full text not opened, unverified): log under a
  uniformly random policy, keep only events where the evaluated policy picks the logged item, average their rewards;
  with K candidates about 1/K of events survive (my arithmetic).
- **IPS and doubly robust (B3).** Logged data "does not faithfully represent proportions of actions taken by a new
  policy". Reward models are "plagued by a large bias"; models of the past policy (inverse propensity scoring:
  weight each logged reward by 1 / its logging probability) have "a large variance"; doubly robust is accurate if
  either model is good (B3).
- **Greedy is nearly as good (B4).** An optimistic method was best, and "a surprisingly close second is a simple
  greedy baseline that only explores implicitly through the diversity of contexts" (B4).
- **Thompson sampling (B5)** is computationally cheap and covers Bernoulli (accept or not) bandits (B5).

### 3.2 Is a bandit worth it at SNU Now's scale?

My arithmetic: about 200 daily users opening the chat once gives about 200 impressions a day. Telling a 20 %
acceptance rate from 25 % at 80 % power and 5 % significance needs about 1,100 impressions per arm (standard
two-proportion formula). LinUCB's lift came from 33 million events (B1); a per-user contextual bandit cannot learn here.

What the scale supports:

- **Per-template acceptance**: a Beta-Bernoulli posterior per template ("meal with a free Friend", "route to next
  class", "repeat my request"), optionally per coarse time band; Thompson sampling's simplest case (B5), and a number
  the UI can explain.
- **Per-user repetition counts**, decayed by age and keyed by structure (G1 §5, section 2.3).
- **Greedy plus a slice of randomness.** Greedy is a close second (B4) and free periods vary the context by
  themselves. The randomness is for evaluation, not speed: a deterministic argmax logs propensity 1 for the shown item
  and 0 for the rest, so no other policy can be evaluated from its log (B3).

So: a **hand-written score with two learned factors**, not LinUCB. It stays explainable and still yields a learning
curve, because the learned factors move with data.

### 3.3 What to log for offline evaluation

Per impression (my design, from B1–B3's needs: context, action, reward, logging probability): bucketed context; every
eligible candidate with template, structured key, and score; the shown candidate and its **propensity** (with
ε-greedy over K eligible candidates, 1 − ε + ε/K for the greedy pick and ε/K otherwise); policy version; outcome;
holdback arm. The 10 % uniform slice is the "random traffic" of B1 and B2. IPS over the greedy 90 % suits only
policies close to the logging one: a disagreeing event weighs 1 / (ε/K), 40 at ε = 0.1 and K = 4 (my arithmetic),
the variance B3 warns about.

## 4. Dismissal and fatigue

Evidence:

- Fatigue comes from "an overexposure to irrelevant content" and "boredom from seeing too many similar
  recommendations", and users exit more when they dislike the content; F1 discounts attractiveness by how many
  similar items were shown (F1). Users abandon "due to fatigue from seeing less useful items" (F3). An ad's effect
  changes with repeated exposure (F2).
- Dependabot users "configure Dependabot toward reducing the number of notifications", and 11.3 % of projects
  dropped it (F4).
- Behaviour adapts with repeated exposure (automation bias, alert fatigue, calibrated reliance), which biases designs
  that ignore it (F5).
- A shown suggestion costs verification time even when rejected (C2 §4); Smart Reply judged an unused chip cheap
  (G2 §7.2.1); Hunches must "clear a high bar" (S3).

Policies (my design; numbers are knobs to tune on the log):

| Rule | Why |
|---|---|
| Nothing unless the top score clears τ, set per template for a target precision on the log | G1 §3.3, C2 §6.3, G2 §6 |
| One suggestion per chat open; the same key at most once per session | G1 shows the top one only; F1's repetition discount |
| Explicit dismissal (✕ or swipe): hide that key 24 h; two in 14 days: hide it 30 days | F1, F4 |
| Three dismissals in a day: no suggestions until tomorrow | F3, F4 |
| Ignored (the user typed something else): weak negative, no cool-down | C2 §6.3: rejected suggestions can still be useful |
| Templates naming a Friend: higher τ, and only status the Friend already shares | A wrong guess about a person costs more than a reply chip (contrast G2 §7.2.1) |
| "이런 제안 그만" per template; "자주 하는 요청" list with delete | S1's deletable donations; S2, S4 controls (unverified) |
| Confirmations from a tapped suggestion are counted apart from organic ones; only organic repeats create a shortcut | Else showing creates its own evidence, the loop note 05 guards against for clicks (its F3) |

## 5. Judgement for SNU Now

**Candidates** (server, no model call): a few templates, each with hard eligibility rules (free period started, the
Friend is free and shares it, mealtime, the Place is open, a card is open) and a structured action whose Korean text
is rendered from slots. A tap runs the stored action and opens the Proposal card for the usual confirm (S3). Personal
shortcuts are one more template, "repeat my request", eligible after two organic confirmations in 14 days (S1).

**Score** (my design): `score = w_T × â_T(band) × (1 + λ·r_u(key)) × f_u(key)`: a hand-set template prior, the
Beta-smoothed acceptance of the template in a coarse time band over all users (B5), the user's decayed organic count
for the key (G1 §5), and the fatigue factor (0 in a cool-down, section 4). Show the top one only if it clears `τ_T`.
Each factor becomes a reason line ("공강 시작 · 민수도 공강 · 최근 2번 같이 점심").

**Trigger**: rank once when the chat or a card opens, within 100 ms (G1 §1.1's 0.1 s); while typing, the phone only
filters the same candidates by jamo prefix. 90 % greedy, 10 % uniform among candidates above `τ_T`, propensity logged.

**Log** (`suggestion_impressions`, no message text, deleted with the account): the fields of section 3.3 plus user,
time, surface (grey text or chip), outcome (accepted, dismissed, ignored, chat closed), and the result within 10
minutes (Proposal confirmed, edited, cancelled).

**Evaluate**:

1. Weekly acceptance rate with Wilson intervals and n (C1), guarded by the confirm rate after a tap (our
   persistence), the dismissal rate, and coverage (share of chat opens with a suggestion).
2. Learning curve: fit the learned factors on weeks ≤ w, score week w + 1 by replay on the random slice (B2) and
   doubly robust IPS on the rest (B3), time-split as in note 05 §5.
3. Holdback: 10 % of accounts get the prior-only score over the same weeks, separating learning from novelty and
   fatigue drift (F5); at about 200 impressions a day it detects only large gaps (section 3.2).
4. Rows: random eligible candidate, most recent confirmed request, prior only, full score, and ablations without the
   personal factor and without fatigue.

**Cheapest version with a learning curve**: three or four templates; `w_T × â_T`; the 10 % uniform slice with
propensities; weekly acceptance against the prior-only holdback, plus replay on the slice. The personal factor and
the shortcut template come next.

**Why it holds up as technical depth**: one concrete problem (whether and what to suggest when only the shown
candidate's outcome is observed), a method sized to the data (greedy score with two learned factors rather than
LinUCB; B1, B4), and verification a reviewer can check (replay on logged random traffic, a holdback, a learning curve
with intervals; B2, B3). It applies known methods; say so rather than claim novelty.

**Avoid**:

- Ranking by acceptance alone; it favours short, trivial suggestions (C2 §7). Keep the confirm-rate guard.
- Per-user contextual bandits or learned models at this traffic (B1 used 33 million events).
- A deterministic argmax without propensities: nothing can be evaluated offline afterwards (B3).
- A model writing candidate text at chat open (the kickoff doc's §5.8 plan has Haiku write 5–8): it breaks the
  model-free tap and makes impressions incomparable in the log. Templates first; a model may at most fill a slot.
- Counting tapped suggestions as organic repetition (section 4).
- Claiming "it learns" from before/after acceptance without the holdback (F5), or from team accounts.
- Acting without a tap (S3).
