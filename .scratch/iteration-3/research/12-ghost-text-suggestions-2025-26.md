# Ghost-text suggestions, 2025–26: what the products do and which papers ticket 04 can claim

Research note, 2026-11-01. Question: Claude Code and OpenAI's Codex now show a grey suggestion the user accepts with
one key, and the user reads it as a trend; what do the two products actually do, and which 2025–26 paper can the grey
suggestions of P07 ticket 04 honestly say they apply? Note 10 §1 (ProactiveBench, PRISM) and note 06 (Smart Compose,
bandits) are not repeated.

Ticket 04 as built: when the chat opens, the server picks at most one request from a few hand-written templates,
scored by hand with two learned factors (acceptance per template and hour, recency), shows it in grey, and a tap runs
the stored action without a model call; every impression is logged with its propensity, a tenth are random, and a
holdback group never sees one. One research agent ran with 10 web searches and 6 pages read in depth. "Unverified"
marks what no opened page confirmed.

## Sources opened

| Id | Source | Date and venue as verified | Read |
|---|---|---|---|
| D1 | Claude Code docs, "Interactive mode", section "Prompt suggestions", https://code.claude.com/docs/en/interactive-mode | Official docs, read 2026-11-01 | Full section |
| D2 | OpenAI, "Composer predictions", https://learn.chatgpt.com/docs/features/composer-predictions (the redirect target of developers.openai.com/codex/features/composer-predictions) | Official docs, read 2026-11-01; no release date on the page | Full page |
| D3 | OpenAI Codex changelog, https://learn.chatgpt.com/docs/changelog | First 100k of 224k characters | Partial |
| P1 | Taobao and Tmall Group (Alibaba), "AIGQ: An End-to-End Hybrid Generative Architecture for E-commerce Query Recommendation", arXiv 2603.19710 | 20 Mar 2026; no venue (the page carries an unfilled template line) | Full text |
| P2 | Al Awad, Ivanov, Tikhonova, "Pre-Filtering Code Suggestions using Developer Behavioral Telemetry", arXiv 2511.18849 | 24 Nov 2025; journal reference ASEW 2025 (IEEE/ACM ASE Workshops) on the page | Abstract page |
| P3 | Baidu and Peking University, "CTR-Guided Generative Query Suggestion in Conversational Search", arXiv 2507.04072 | 5 Jul 2025; no venue on the page (EMNLP 2025 Industry per a search snippet, unverified) | Full text |
| P4 | OPPO AI Center, Chongqing University, "ToolRec: Calibrated Preference Alignment for Query Recommendation in On-Device Assistants", arXiv 2606.08466 | about 7 Jun 2026; venue unverified | Search snippets |
| P5 | Liu et al., "Do Proactive Agents Need an LLM to Decide When to Act?", arXiv 2605.30152 | May 2026; venue unverified | Search snippets |

Named but not read: OneSug 2506.06913 and LaD 2505.20966 (Kuaishou query suggestion; LaD's larger nearline model gave
minimal gain), OneBar 2606.15330, QueryAgent-R1 2606.05671, OnePred 2605.23668, "Feedback-Driven Timing with
Lightweight State Bounds" 2511.18842 (adaptive delay for code completion: acceptance 4.9 % → 18.6 %, blind dismissals
8.3 % → 0.36 %, nine developers), "Sensing What Surveys Miss" 2602.00880 (CHI 2026 per snippet, unverified), ChaI-TeA
2412.18377 (a benchmark for chat-input autocompletion, Dec 2024, no 2025 venue verified).

## 1. What the two products do

- **Claude Code (D1)** shows two kinds of suggestion. When a session opens, "a grayed-out example command in the
  prompt input" picked "from your project's git history"; the docs tie no model call to this one. After each response,
  a next prompt "based on your conversation history", made by "a short background request to the same model" that
  reuses the prompt cache ("mostly cache reads plus a few output tokens"). Tab or the Right arrow puts the suggestion
  in the input and Enter sends it; typing dismisses it. It is skipped when the cache is cold, after an error, in plan
  mode and near the usage limit. After many unused suggestions in a row it shows them less often ("Showing fewer
  prompt suggestions · use one to bring them back"). Off by `/config`, `promptSuggestionEnabled=false` or
  `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false`.
- **Codex (D2)** calls it "composer predictions": in the Codex desktop app, as a beta for ChatGPT Pro users aged 18 or
  more, after Codex responds it "uses the current conversation to suggest a follow-up prompt in the message box"; Tab
  turns it into an editable draft and "does not send the message for you"; making predictions does not count toward
  usage limits. The page names only the desktop app, not the CLI. A search snippet says the changelog removed the
  TUI's `tui.prompt_suggestions` setting; the part of the changelog read (D3) does not show it: unverified. The CLI
  0.166.0 entry (2026-10-29) mentions "prediction forks", which suggests predictions come from a forked model
  request: unverified.
- **What this means.** The trend reading holds for Claude Code and, for the desktop app only, for Codex. Both predict
  the next turn after a model response, from a warm conversation; neither calls a model at a cold open. Claude Code's
  open-time suggestion comes from git history, the same shape as ticket 04's: one grey line at open, no model call,
  one key to take it, typing to dismiss, and a back-off when ignored. Their cost argument for the model-written kind
  (a warm cache after a model turn) does not transfer to our chat-open moment, where nothing is cached.

## 2. Papers

### 2.1 Pre-Filtering (P2)

A lightweight model estimates the chance a code suggestion is accepted from content-free telemetry (typing speed,
file navigation, editing activity) before the LLM is called; under a threshold nothing is shown and nothing is
called. Over four months of natural use of a VS Code plugin, acceptance rose from 18.4 % to 34.2 % and 35 % of the
LLM calls were suppressed. The abstract page does not say how training on shown suggestions alone was handled, nor
the model, the threshold or the data size; a workshop paper about one plugin.

For ticket 04: this is the "show nothing" branch, decided before any rendering from content-free context (the hour,
the time since the app opened, days since the last chat, the last streak of accepts and ignores). The template-by-hour
acceptance and recency score is such a gate once a global show threshold is added, as Claude Code backs off after
many unused suggestions. Our tenth of random impressions with logged propensities covers the selection bias the
paper does not address, and the holdback tells whether suppression loses accepts. Caution: a gate raises the
acceptance rate by shrinking its denominator, so report accepts per chat open and missed needs beside it.

### 2.2 AIGQ (P1)

Pre-search hint queries on Taobao's home page, before the user types. A nearline LLM (Qwen3-30B-A3B) runs
asynchronously when behaviour warrants and writes to a per-user cache; a daily offline batch distils chain-of-thought
outputs into a trigger → query index; at request time both are only extra recall sources into the existing ranker,
since the LLM takes "several seconds" against a sub-second budget. Trained by SFT on clicked hints and GRPO with the
production CTR model as reward; no exposure or position bias handling, no serving-time validation of the generated
text. A 30-day A/B test: hint click rate +7.42, attributed orders +10.31, GMV +10.68, 7-day retention +3.73 (units as
printed); offline HR@30 0.0100 → 0.0745 for queries.

For ticket 04: the one architecture that keeps the open path model-free while a model writes suggestions, by moving
the model to a nightly batch whose output is one more candidate source. Here the trigger would be the hour bucket and
the last Place, Friend or event touched, the output new template phrasings or trigger → template pairs, every slot
checked against the catalog, current Friends or published events before it enters the index, and the hand scorer
still picking one. Its training needs a volume we lack (about a million page views, a 30B model); its click rate
maps to our acceptance per impression and its HR@K to our missed needs.

### 2.3 CTR-Guided Generative Query Suggestion (P3)

After each answer of Baidu's assistant, three follow-ups written by a 21B model, chosen among sampled sets by a
BERT click model with a position term, and the generator trained by DPO weighted by the predicted click gap.
Training directly on raw clicks mostly made things worse; the offline gain is against other LLM variants only, with
no template or retrieval baseline and no online numbers. It does not meet the team's bar for a model-written
suggestion at chat open. Two lessons hold: smooth sparse clicks before learning from them (our per-template-hour
factor with shrinkage) and clip the weights of inverse-propensity estimates.

### 2.4 ToolRec (P4) and "Do Proactive Agents Need an LLM to Decide When to Act?" (P5)

From snippets only. ToolRec ties each recommended query to an executable on-device action and finds that "tool
invocation dominates user preference": support for a suggestion bound to a stored action, as ticket 04's are. P5 has
a small graph model, not an LLM, decide when to act, with a tunable threshold: support for deciding at chat open
without a model. Neither read in full, neither venue verified.

### 2.5 Gaps

No 2025–26 paper on bandits or propensity logging for suggestions was found: the random slice, the logged propensity
and the holdback are standard practice, not attributable to a recent paper, and the off-policy evaluation papers
found (PAC Off-Policy Prediction 2507.16236, Context-Action Embedding OPE 2509.00648) only warn that inverse
propensity weights blow up with large or under-explored action sets, which argues for a small template catalog and
clipped weights. Nothing on Korean query autocompletion.

## 3. Judgement

- **The claim for ticket 04**: it applies Pre-Filtering (P2, ASEW 2025): a content-free acceptance predictor
  decides whether to show anything before any template is scored, with stronger bias control than the paper's.
  The piece it lacked, a global show threshold under which nothing is shown, as the paper and Claude Code's
  back-off do, was added on 2026-11-01 (ticket 04, Comments): the User's own acceptance of the newest ten
  suggestions shown to them in the last week, under 0.15, with the templates still scored so that the missed needs
  stay measurable.
- **The claim available with one more ticket**: AIGQ's shape (P1, preprint), a nightly model step whose validated
  output is one more candidate source, the open path staying a lookup. Worth it only once the impression log shows
  the hand-written templates missing needs the model could phrase.
- **Not a basis**: P3 for a model-written suggestion at chat open.
- **The trend**: confirmed for Claude Code by its docs; for Codex only in the desktop app, in beta. Both products
  predict the next turn after a model response and neither calls a model at a cold open, which is ticket 04's own
  choice.
