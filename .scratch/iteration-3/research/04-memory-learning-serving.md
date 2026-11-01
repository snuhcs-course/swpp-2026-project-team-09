# Memory, learning from use, and serving for the SNU Now Assistant

Research note for the Iteration 3 design document. Question: which conversation and long-term memory designs, which
"gets smarter with use" mechanisms that need no fine-tuning, and which serving techniques (streaming, prompt caching,
routing) fit a NestJS Assistant on Claude Haiku 5.5 through OpenRouter with one developer and USD 100 of credit.

Every claim cites the page it came from. "Unverified" marks what I did not confirm in a source opened for this note.
Eight web fetches were the budget; one of them (DSPy) returned only a redirect stub, so DSPy facts are unverified.

## Sources opened

| Id | Source | What it supports |
|---|---|---|
| S1 | Anthropic, Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md | Minimum cacheable length, cache and model prices, TTL, prefix order |
| S2 | OpenRouter, Prompt caching: https://openrouter.ai/docs/features/prompt-caching | Caching Claude through OpenRouter, sticky routing, usage fields |
| S3 | AI SDK, Generating and streaming text: https://ai-sdk.dev/docs/ai-sdk-core/generating-text | `streamText` behaviour, errors in streams, usage fields |
| S4 | Packer et al., MemGPT (arXiv 2310.08560): https://arxiv.org/abs/2310.08560 | Virtual context management |
| S5 | Chhikara et al., Mem0 (arXiv 2504.19413): https://arxiv.org/abs/2504.19413 | Extract-consolidate-retrieve memory and its reported numbers |
| S6 | Ong et al., RouteLLM (arXiv 2406.18665): https://arxiv.org/abs/2406.18665 | Learned routing between a strong and a weak model |
| S7 | DSPy, Optimizers: https://dspy.ai/learn/optimization/optimizers/ | Opened, but the fetch returned only a "continue to the documentation" stub; nothing from it is verified |
| S8 | Cucerzan and Brill, "Spelling correction as an iterative process that exploits the collective knowledge of web users", EMNLP 2004: https://aclanthology.org/W04-3238.pdf | Learning a lexicon of corrections from query logs, with numbers |
| R | This repository: `main-server/src/assistant/chat/chat-assistant.ts`, `main-server/src/assistant/adapter.ts`, `main-server/src/assistant/tools/resolve-place.ts`, `main-server/src/assistant/found-ids.ts`, `main-server/src/common/settings.ts`, `main-server/eval/cost.ts` | Current Assistant shape |

## Where the Assistant stands today (R)

- `adapter.ts` calls the AI SDK's `generateText` with the tools and `stopWhen: stepCountIs(maxSteps)`; the phone gets
  nothing until the whole run ends. Limits from `settings.ts`: 8 steps, 30 s timeout, 1,000 output tokens per call,
  50 messages per user per day.
- The adapter already records `usage.inputTokenDetails.cacheReadTokens` and `cacheWriteTokens`, but nothing in
  `main-server/src/assistant` sets `cache_control` (a grep finds none). S2 says Anthropic models on OpenRouter cache
  only when the request enables it, so today's runs presumably read nothing from cache. Check a recorded run's usage
  to confirm.
- The system prompt (about 4,200 characters) begins with `Now in Korea: 2027-01-04 Monday 09:05`, a timestamp to the
  minute, in its second line. S1: the prefix is `tools`, `system`, `messages` "in that order", and a cache read needs
  the prefix up to the breakpoint to be identical. The timestamp therefore changes everything after the tool
  definitions once a minute.
- `resolvePlace` matches a Place whose name contains the words or whose building number they are. "학관" is not a
  substring of "학생회관" (학·생·회·관), and "ㅎㄱ" matches nothing, so both end in "none" today.

## 1. Conversation and long-term memory

### Designs

| Design | What it is | What it adds | Cost and risk |
|---|---|---|---|
| Client-side history (today) | The phone sends the last 20 messages plus references to shown cards and the last Proposal | Stateless servers; the server keeps no transcript | Each request resends the history (caching offsets it, S1); nothing to learn from across users; a client can send fabricated history, so ids and values in it must be re-checked on the server (R: `found-ids.ts` lets cards and Proposals take only ids a lookup or resolver returned in the same message) |
| Server-side history | Transcripts stored per conversation | Analytics, replay for evals, the raw material for the human-in-the-loop queue | Stores personal data (Friends' names, plans, places); needs retention, deletion with the account and access control. Korean PIPA obligations: unverified, not researched here |
| Summary memory | Older turns replaced by a rolling summary | Bounded prompt for long chats | Rewriting history breaks the cached prefix after the rewrite point (S1, prefix rule). Our chats are short task turns; 20 messages fit easily |
| MemGPT / Letta (S4) | "Virtual context management", borrowed from operating-system memory tiers: the model moves data between fast (in-context) and slow (external) memory itself, with interrupts for control flow | Context beyond the window; evaluated on document analysis and multi-session chat, where agents "remember, reflect, and evolve" (S4) | Extra model calls and tool loops per turn; the agent edits its own memory. Letta's current product docs: not opened, unverified |
| Mem0 (S5) | A pipeline that extracts, consolidates and retrieves salient facts from conversations; a graph variant models relations | On LOCOMO: 26 % relative gain in LLM-as-a-Judge score over OpenAI's memory, 91 % lower p95 latency and over 90 % lower token cost than putting the full history in context; the graph variant about 2 % higher overall (S5) | Stores inferred facts about each user, the highest privacy exposure of all designs. Mem0's product docs: not opened, unverified |

### What this means here

The gains reported in S4 and S5 are against long, multi-session dialogues that overflow a context window. Our
Assistant's turns are short and task-shaped (menus, shuttle, finding or making a 파티), and 20 messages fit in a
Haiku 5.5 prompt far below the 100,000-token price tier (S1). Per-user long-term memory ("is vegetarian", "usually
eats at 301동") would personalise answers but stores inferred personal facts and is hard to show as a measured
improvement in one iteration.

What the "gets smarter with use" goal needs is not a per-user memory but **shared, aggregated knowledge about public
campus entities** (Places, Global Events, menus): which words people use for them. That can be stored as counts
against entity ids, with no transcript, which keeps the privacy surface small (see section 2).

Privacy rules worth writing into the spec (my recommendation, not from a source):

- Learn only for public catalog entities, never for Friends or other people's names.
- Store interaction events (shown candidates, chosen id, edited field), not message text; the exception is the text
  of unanswered questions, which the admin loop needs, kept for a fixed period.
- Require several distinct users before a learned alias applies to everyone, so one user cannot teach a wrong or
  offensive alias.

## 2. Learning from interaction without fine-tuning

### 2.1 Learned lexicon from user choices: the closest precedent (S8)

Cucerzan and Brill learned spelling corrections for web queries from search query logs instead of a fixed
dictionary. The ideas that transfer:

- **The log is the lexicon.** "Any string that appears in the query log used for training can be considered a valid
  correction", ranked by relative frequency; correct forms "tend to be more frequent than misspellings" (S8, §4).
- **Iterative correction.** "anol scwartegger" reaches "arnold schwarzenegger" in three steps, each step a small
  edit to a more frequent logged string (S8, §4).
- **Measured on two sets.** 1,044 randomly sampled queries (864 valid, 180 misspelled; annotator agreement
  91.3 %): the full system agreed with annotators on 81.8 % of all queries and 67.2 % of misspelled ones. Without the
  query log: 77.0 % and 52.8 %. Without the trusted lexicon but with the log: 70.3 % and 61.1 % (S8, Table 2).
- **User reformulations as free labels.** A second set was built from pairs of successive queries by the same user
  that differ by a small edit (e.g. "audio flie" then "audio file"). On it the full system scored 73.1 %, and 44.9 %
  without the query log (S8, Table 3). An error analysis gave precision 88.4 % and recall 85.4 % (S8, §6).
- **More data helps recall but adds false positives.** Accuracy on misspelled queries rose from 66.1 % (one month of
  logs) to 69.4 % (four months), while accuracy on all queries peaked at 81.6 % and fell to 81.2 % (S8, Figure 3).

Our analogue: a typed form ("학관", "ㅎㄱ", "학생회관 앞") and the entity the user ends up choosing is the same
signal as a query and its reformulation. Three sources of such pairs:

1. **Disambiguation picks.** `resolvePlace` (or another resolver) answers "several" or "none", and the run ends in a
   `proposeQuest` with a Place id. Log `(normalised words, chosen id, user)`. A tappable choice list instead of a typed
   reply makes this signal exact.
2. **Proposal edits.** The user changes the Place of a shown Proposal. Log a negative for the first id and a positive
   for the final one.
3. **Opened search results.** Which Global Event or 파티 the user opens after a search. Click logs are biased towards
   whatever is shown first (well known in learning-to-rank; unverified here, no source opened), so treat opens as a
   weak signal and choices and edits as strong ones.

Mechanism (no model training; my design, built on S8's idea):

- A `place_aliases` table: alias string, entity id, distinct users, picks, last seen, status (`candidate`, `active`,
  `rejected`). An alias becomes `active` when, for example, at least 3 distinct users chose the same id and it holds
  at least 80 % of picks for that string; an admin can approve or reject. Thresholds are tuning knobs, set on held-out
  data.
- A deterministic 초성 key for every Place name and active alias, so "ㅎㄱ" can match "학관". Initial-consonant
  extraction follows the Unicode Hangul syllable layout (syllable = 0xAC00 + (initial × 21 + medial) × 28 + final);
  this formula was not re-checked in a source this session. When a 초성 key matches several entities, the learned
  counts order them.
- Resolution order in `resolvePlace`: exact name or number, then active alias, then 초성 key, then substring. A
  confident alias hit returns "one", so the Assistant skips a question it would have asked.

### 2.2 Few-shot examples retrieved from logged successes

Log turns that ended well (a Proposal confirmed without edits, an answer with no thumbs-down) as
`(request, tool calls)` exemplars; at request time retrieve the few most similar and put them in the prompt.
DSPy's `KNNFewShot` and `BootstrapFewShot` optimisers automate this kind of demo selection, and its MIPROv2 also
rewrites instructions from a metric and labelled examples; DSPy is a Python library. All DSPy facts are unverified
here, because S7 returned only a redirect stub.

Fit for us:

- Per-request examples change the prompt, so they must sit after the cache breakpoint (in the last user turn), or the
  shared prefix stops caching (S1, prefix rule).
- Examples from one user's chat shown to the model for another user can leak names; use only scrubbed or
  team-written examples.
- DSPy is Python and our server is TypeScript; at most it could run offline on an exported eval set and the chosen
  instructions and demos be copied into the prompt. A manual prompt hill-climb against the existing P19 eval does
  the same job with no new stack.

### 2.3 Feedback and preference logging

Thumbs up/down and implicit outcomes (Proposal confirmed, edited, abandoned; answer followed by a rephrase) are the
cheapest labels. They feed the metrics below and pick exemplars for 2.2. No source opened; standard practice.

### 2.4 Online learning of rankers

Bandits or click-model rankers that reorder results from live traffic need far more traffic than a course app
gets and careful bias correction. Unverified, no source opened; not recommended for this iteration.

### 2.5 Human-in-the-loop for unanswered questions

Flag turns where a tool answered "none", the Assistant said a feature is not supported, or the user gave a
thumbs-down. A nightly job groups the flagged questions (embeddings plus simple clustering, or one cheap Haiku call per
batch to label topics), an admin page lists groups by size, and an admin writes an answer that a new FAQ tool or a
resolver returns next time. Store answers in PostgreSQL. This is my design; no source opened. Metric: the share of
questions that end unanswered, week over week, and the share of question groups an admin closed.

### 2.6 What such systems report

| Mechanism | Metrics reported in sources | Metric for us |
|---|---|---|
| Lexicon from logs (S8) | Agreement with annotators on all and on misspelled queries; precision and recall; ablations without the log | Top-1 resolution accuracy on held-out (typed words → chosen id) pairs, split by time (learn before date T, test after); rate of clarifying questions per Place-referencing message; Proposal edit rate on the Place field |
| Long-term memory (S5) | LLM-as-a-Judge score on LOCOMO by question type; p95 latency; token cost | Not built |
| Router (S6) | Cost reduction at equal quality | Not built |
| Few-shot / prompt optimisation | Task metric on a held-out set (unverified, S7 not read) | P19 eval pass rate with and without exemplars |
| Admin loop | (no source) | Unanswered rate; groups closed; repeat questions now answered |

## 3. Serving: caching, streaming, routing, cost

### 3.1 Prompt caching

From S1 (Anthropic):

- Minimum cacheable prompt: 512 tokens for Claude Haiku 5.5 (4,096 for Haiku 4.5). Shorter prompts are processed
  without caching and "no error is returned".
- Claude Haiku 5.5 prices per million tokens, prompts up to 100,000 tokens: input USD 0.10, 5-minute cache write
  USD 0.125, 1-hour cache write USD 0.20, cache hit USD 0.01, output USD 0.50. Above 100,000 tokens: 0.50 / 0.625 / 1 /
  0.05 / 2.50.
- Multipliers: 5-minute write 1.25× input, 1-hour write 2×, read 0.1× (some larger models have other read factors).
- Default lifetime 5 minutes, measured from the start of the request; each hit refreshes it at no cost.
- Up to 4 breakpoints. Prefix order: `tools`, `system`, `messages`.
- Caching generally improves time to first token for long prompts; a pre-warm request removes the first request's
  cache-miss latency.
- Caches are isolated per organisation, and per workspace on the Claude API.

From S2 (OpenRouter):

- Anthropic models need caching enabled per request: either a top-level `cache_control` that puts the breakpoint on the
  last cacheable block automatically, or `cache_control` on individual content blocks; at most four explicit
  breakpoints; TTL 5 minutes or `"ttl": "1h"`.
- The same multipliers: write 1.25× (5 min) or 2× (1 h), read 0.1×.
- After a cached request OpenRouter routes later requests to the same provider endpoint; this sticky routing lapses
  after 10 minutes of inactivity, is skipped when a manual provider order is given, and can be keyed by `session_id`.
- Usage reports `prompt_tokens_details.cached_tokens` and `cache_write_tokens`, and the response has `cache_discount`.

How to pass `cache_control` through `@openrouter/ai-sdk-provider` (provider options on the message or call): not
verified; read the provider's README before coding. Whether OpenRouter's per-token price for
`anthropic/claude-haiku-5.5` equals Anthropic's: unverified; `main-server/eval/cost.ts` already reads OpenRouter's
live model list, which settles it.

Changes for us: move the minute timestamp out of the top of the system prompt (to the end of the request, after the
last breakpoint), keep the tool list and instructions byte-stable, then enable caching and check that
`cacheReadTokens` is above zero on a second request.

### 3.2 Streaming with the AI SDK

From S3: `streamText` exists because waiting for the whole answer "can be unacceptable for interactive use cases such
as chatbots"; it "immediately starts streaming"; `result.textStream` is a `ReadableStream` and `AsyncIterable`; tools
work and `result.usage` totals usage "across all steps"; `onError`, `onChunk` and `onEnd` callbacks are documented
(the page names `onEnd`, not `onFinish`); and "errors become part of the stream and are not thrown".

Consequences for us:

- Text only starts after the tool steps finish, so the first visible thing should be a progress event per tool call
  (e.g. "식단 확인 중") and each card as soon as its tool returns, then the answer text.
- The adapter's error mapping (for example HTTP 402 "credit used up") relies on thrown errors; with `streamText` it
  moves to `onError`.
- The phone needs a streaming transport (SSE or a streaming `fetch`); React Native and Expo support: unverified.
- Metric: time to first visible event and time to first answer token, p50 and p95, against today's time to the whole
  reply. Studies on perceived latency of streamed text: no source opened, unverified.

### 3.3 Model cascades and routing

RouteLLM trains routers on human preference data, with data augmentation, to pick between a stronger and a weaker
model per query; it reports cost cut "by over 2 times in certain cases" without losing response quality, and the
routers kept working when the model pair changed at test time (S6).

For us the strong model is already Haiku 5.5, the cheapest model in Anthropic's price table (S1), and a message costs
a fraction of a US cent (3.4). A second model also means a second prompt cache that does not share entries with the
first; that caches are per model is unverified here. A cascade buys little. Better uses of a cheap or tiny model:
offline jobs (grouping unanswered questions), and plain rules for the few intents that need no model (none measured).

### 3.4 Cost per message

Assumptions (estimates; measure with one recorded run):

- Fixed prefix, tools plus system: 4,000 tokens (11 tools; instructions about 4,200 characters, R).
- History and card references: 1,500 tokens; new user message: 50.
- A typical message takes 3 model calls: two tool calls and the answer. Each tool call adds 100 tokens and its result
  1,000 tokens to the next call's input.
- 300 output tokens per call on average, including any thinking.

Uncached (today):

- Input: 5,550 + 6,650 + 7,750 = 19,950 tokens × USD 0.10 / 1M = USD 0.00200
- Output: 900 × USD 0.50 / 1M = USD 0.00045
- **About USD 0.0024 per message; USD 100 buys about 41,000 messages.**

Cached, prefix warm (another request within 5 minutes), each call writing only what it added:

- Reads: 4,000 + 5,550 + 6,650 = 16,200 × USD 0.01 / 1M = USD 0.00016
- Writes: 1,550 + 1,100 + 1,100 = 3,750 × USD 0.125 / 1M = USD 0.00047
- Output unchanged: USD 0.00045
- **About USD 0.0011 per message (−56 %); about 93,000 messages per USD 100.** A cold prefix adds about
  USD 0.0005.

Worst case allowed by the settings (8 calls, 1,000 output tokens each, uncached): about 75,000 input and 8,000 output
tokens, USD 0.0115 per message; at the 50-message daily cap, USD 0.58 per user per day.

Example month: 200 active users × 5 messages a day × 30 days = 30,000 messages, about USD 73 uncached and USD 33
cached. Caching is what keeps a demo month inside the USD 100 credit with room for evals, and an eval case costs about
the same as a message.

## 4. Judgement: what to build, in what order, how to measure

Constraints: one developer, USD 100, grading wants a measured improvement. The mechanism that shows "gets smarter with
use" most clearly and cheaply is the learned alias lexicon; caching is nearly free and protects the budget; the rest
is optional.

| Order | Build | Why now | Measure |
|---|---|---|---|
| 1 | Prompt caching hygiene: timestamp out of the prefix, `cache_control` through OpenRouter, per-turn usage logged | Hours of work; halves cost per message (3.4) | Cache-read share of input tokens; USD per message from logged usage, before and after |
| 2 | Interaction event log: candidates shown, id chosen, Proposal field edited, result opened, unanswered flag; pseudonymous user id, retention limit | Every later mechanism and metric needs it | Event counts per day |
| 3 | Learned alias lexicon with a 초성 key in `resolvePlace` (then Global Events), with distinct-user thresholds and admin approval | The visible demo: after three people pick 학생회관 for "학관", the fourth gets no question. Direct precedent in S8 | Top-1 accuracy on held-out pairs split by time; clarifying-question rate; Place edit rate; a seeded eval case set ("학관", "ㅎㄱ", "공대") in the P19 harness, before and after |
| 4 | Unanswered-question queue with an admin page and FAQ answers | Human-in-the-loop story; plain CRUD plus one batch job | Unanswered share week over week; groups closed |
| 5 | Streaming with progress events | UX gain, but touches server, transport and phone | Time to first visible event and first token, p50/p95 |
| 6 | Retrieved few-shot exemplars, only if the P19 eval shows tool-choice errors | Uncertain gain; must stay after the cache breakpoint and be scrubbed | P19 pass rate with and without |

Not worth building now: per-user long-term memory (Mem0 or Letta style), because the gains in S4 and S5 are for long
multi-session dialogue and the privacy cost is high; server-side transcripts beyond the unanswered queue; DSPy, a
Python stack beside a TypeScript server; RouteLLM-style cascades, since Haiku 5.5 is already the cheap model; online
rankers, which need traffic a course app lacks; and fine-tuning, which is out of scope.

A caveat on measurement: real traffic will be small. Seed the lexicon from team and tester sessions, keep a time split
so the test pairs are never used for learning, and report results with their counts (n) next to each number.
