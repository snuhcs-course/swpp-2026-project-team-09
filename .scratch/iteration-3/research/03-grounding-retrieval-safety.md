# Grounding, retrieval and prompt-injection safety for the Assistant

Research note, 2026-10-26. Question: what the primary sources say about (1) structured outputs, (2) tool design, (3) retrieval over a small catalog, (4) Korean jamo and 초성 matching, and (5) prompt-injection defenses for tool agents, and what that means for the Assistant's rule "the model proposes, the server decides".

## How to read this note

- Eight web fetches were allowed. Each claim cites the page that was opened, by tag. Statements marked **(inference)** are our reasoning, not a source's claim. Statements marked **unverified** come from memory or a page that was not opened. Treat them as leads to check.
- Pages were read through a fetch tool that summarizes them. Before a number goes into the design document or the slides, check it against the page. Two AgentDojo figures already disagree with each other (section 5).
- Local evidence comes from this repository's code, the installed `@openrouter/ai-sdk-provider` 3.1.0 bundle and a small Python check. Paths are given where each is used.

| Tag | Source (opened) |
|---|---|
| S1 | Anthropic, Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs (the brief named docs.claude.com; this is the address the docs live at now) |
| S2 | Anthropic Engineering, "Writing effective tools for agents — with agents", 2025-09-11: https://www.anthropic.com/engineering/writing-tools-for-agents |
| S3 | pgvector README: https://github.com/pgvector/pgvector |
| S4 | es-hangul README: https://github.com/toss/es-hangul |
| S5 | Debenedetti et al., AgentDojo, arXiv 2406.13352v3 (24 Nov 2024): https://arxiv.org/html/2406.13352v3 |
| S6 | Debenedetti et al., "Defeating Prompt Injections by Design" (CaMeL), arXiv 2503.18813v2 (24 Jun 2025): https://arxiv.org/abs/2503.18813 |
| S7 | Qwen3-Embedding-0.6B model card: https://huggingface.co/Qwen/Qwen3-Embedding-0.6B |
| S8 | OpenAI function calling guide: https://platform.openai.com/docs/guides/function-calling. It returned **301 to https://developers.openai.com/api/docs/guides/function-calling**, which was not fetched because of the budget, so every OpenAI claim below is **unverified**. |
| L1 | Installed provider bundle: `main-server/node_modules/.pnpm/@openrouter+ai-sdk-provider@3.1.0_ai@7.0.142_zod@4.6.5__zod@4.6.5/node_modules/@openrouter/ai-sdk-provider/dist/index.js`. `main-server/package.json` on 3.0/Main asks for `^3.1.0`. |
| L2 | Assistant code on 3.0/Main: `main-server/src/assistant/` (`others-text.ts`, `found-ids.ts`, `adapter.ts`, `tools/*.ts`, `chat/chat-assistant.ts`) |
| L3 | Python check of Hangul arithmetic and alias matching, run locally (script and output in section 4) |

Not opened, so **unverified**: OpenAI Structured Outputs guide, OpenAI agent-safety guidance, Anthropic prompt-injection guidance, BFCL, RAGAS docs, OpenRouter's embeddings docs and model pages, ko-MTEB, and PostgreSQL full-text search for Korean.

## 1. Structured outputs and constrained decoding: shape, not truth

**Anthropic [S1]**
- There are two features. JSON outputs (`output_config.format` with `type: "json_schema"`) shape the reply text, and strict tool use (`strict: true` on a tool) makes "schema validation on tool names and inputs" a guarantee. The page states the mechanism: "Structured outputs guarantee schema-compliant responses through constrained decoding". The schemas are compiled "into a grammar that constrains Claude's output".
- The status is GA. The older `output_format` parameter moved to `output_config.format` and no beta header is needed. `claude-haiku-5-5` is on the supported-model list.
- The guarantee has stated holes. The page says it holds "in most cases". A `stop_reason: "refusal"` or `"max_tokens"` reply may not match the schema, and the capitalization of `enum`/`const` values is not guaranteed.
- Unsupported JSON Schema features return a 400 error: recursive schemas, numeric limits (`minimum`, `maximum`, `multipleOf`), string length limits, array limits beyond `minItems` 0 or 1, and `additionalProperties` set to anything other than `false`. Regex lookaround and backreferences are also out.
- Complexity limits apply per request: **20 strict tools**, 24 optional parameters and 16 union-typed parameters. Past them the API answers "Schema is too complex for compilation".
- The first use of a schema adds grammar-compilation latency. Compiled grammars are cached for 24 hours. Changing only a tool's name or description does not invalidate that cache, and changing `output_config.format` invalidates the prompt cache.
- Truth of values: the page talks only about schema compliance and says nothing about whether the values are correct. **(inference)** A grammar can force `day ∈ {today, tomorrow, weekday}` but cannot know which one the User meant. It also cannot express "an id returned by a tool in this turn" or "the same rules as the app's form". Those checks stay on the server.

**OpenAI [S8, unverified]**
- From memory: strict mode requires `additionalProperties: false`, every field listed as required, and optional fields written as a union with `null`. The Structured Outputs guide says schema adherence does not prevent mistakes inside the values.

**Our stack [L1, L2]**
- `adapter.ts` builds tools with the AI SDK's `tool({ description, inputSchema, execute })` and does not set `strict`.
- The installed OpenRouter provider sends each tool as `{ type: "function", function: { name, description, parameters } }` and has no `strict` field (L1, the tool mapping near line 4326). Only `response_format` gets `json_schema` with `strict` defaulting to `true` (L1, near line 4303).
- So strict tool use is not reachable through the current provider. Whether OpenRouter would forward a `strict` flag to Anthropic is **unverified**.
- **(inference)** Zod `.min()`/`.max()` in tool schemas could not be enforced by Anthropic's grammar anyway. The proposer's server validation, which applies the same rules as the app's form, is the guarantee that matters.

## 2. Tool design changes accuracy

**Anthropic Engineering [S2]**
- "More tools don't always lead to better outcomes". Avoid tools that only wrap API endpoints and merge steps that go together, for example one `schedule_event` tool in place of `list_users`, `list_events` and `create_event`.
- Namespace tool names by service and resource. The post says prefix and suffix naming "have non-trivial effects" that vary by model.
- Return high-signal fields. Resolving opaque UUIDs to meaningful names "significantly improves Claude's precision in retrieval tasks". No figure is given.
- Offer a `response_format` enum of concise or detailed. In the post's example the detailed reply took 206 tokens and the concise one 72. Paginate, filter and truncate with sensible defaults; Claude Code caps a tool reply at 25,000 tokens.
- Make errors actionable rather than "opaque error codes or tracebacks", with examples of correct input. Write descriptions as you would for a new hire, and give parameters unambiguous names (`user_id`, not `user`).
- Measured results:
  - Charts compare human-written and Claude-optimized Slack and Asana tools on held-out tasks, but the text gives no numbers.
  - Refining tool descriptions helped Claude Sonnet 3.5 reach the state of the art on SWE-bench Verified. No number is given.
  - Claude kept appending "2025" to web-search queries until the tool description was fixed.
- Evaluation method: realistic multi-step tasks, each with a verifier (exact match or a Claude judge, not so strict that it rejects valid phrasings). Track accuracy, runtime, number of tool calls, tokens and tool errors, and keep a held-out set.
- The post gives no guidance on tools that return candidates or on asking clarifying questions. **(inference)** Our none/one/several resolvers are our own design. They follow the post's "consolidate and return meaningful context" advice, but they are not a sourced best practice.

**OpenAI [S8, unverified]**
- From memory, the function-calling guide advises: keep the set of functions small (it names a number around 20), use enums and object structure to make invalid states unrepresentable, do not make the model fill arguments the code already knows, and combine functions that are always called in sequence.

**BFCL**: not opened, **unverified**. For measured tool-calling accuracy, the evidence collected here is Anthropic's qualitative report [S2] plus our own P19 harness.

**Our stack [L2]**
- The Assistant has 11 tools: `getMenus`, `getShuttle`, `searchGlobalEvents`, `searchRecruitingQuests`, the resolvers `resolveFriend`, `resolvePlace` and `resolveGlobalEvent`, `proposeQuest`, and the presenters `showGlobalEvents`, `showQuests` and `showOnMap`. That is under Anthropic's 20-strict-tool limit.
- Resolvers return name, number and id, and the model must copy a UUID back into `proposeQuest`. `found-ids.ts` refuses any id not returned in the current message, with an actionable error. **(inference)** S2's UUID finding suggests counting those refusals in the run logs. If they are frequent, give per-run short handles (`P1`, `E2`) and map them back to UUIDs on the server.

## 3. Retrieval for a catalog of hundreds

**pgvector [S3]**
- The README's install command clones v0.8.7, and the extension supports Postgres 13+.
- Exact nearest-neighbour search is the default and "provides perfect recall". An index switches to approximate search, which "trades some recall for speed". For a small table, "a table scan may be faster".
- Dimension limits:

  | Type | Stored | Indexable (HNSW and IVFFlat) |
  |---|---|---|
  | `vector` | up to 16,000 dimensions | 2,000 |
  | `halfvec` | up to 16,000 dimensions | 4,000 |
  | `bit` | no maximum given | 64,000 |
  | `sparsevec` | up to 16,000 non-zero elements | 1,000 non-zero, HNSW only |

- HNSW builds more slowly and uses more memory but has a better speed-recall tradeoff, and it can be built on an empty table (`m` 16, `ef_construction` 64, `ef_search` 40). IVFFlat builds faster, must be created after the data is loaded, and starts from `lists = rows/1000` and `probes = sqrt(lists)`.
- With approximate indexes, "filtering is applied after the index is scanned". Iterative scans (0.8.0+, `hnsw.iterative_scan`) reduce how many filtered rows are lost.
- Hybrid search: use it "together with Postgres full-text search", and combine results with Reciprocal Rank Fusion or a cross-encoder.
- **(inference)** For our size, keep embeddings in a column, put no index on them, and query with `WHERE <structured filters> ORDER BY embedding <=> $1 LIMIT k`. That is exact, respects the filters and needs no tuning. An index becomes worth it only at many thousands of rows.

**Embedding models [S7, L1]**
- Qwen3-Embedding comes in three sizes. 0.6B gives 1,024 dimensions, with user-defined output dimensions from 32 to 1,024 (MRL). 4B gives 2,560 and 8B gives 4,096. All take 32K context, cover "100+ Languages" and use the Apache-2.0 licence.
- Queries take the form `Instruct: {task}\nQuery:{query}`; omitting the instruction costs "approximately 1% to 5%".
- The card reports these mean task scores on MTEB Multilingual: 0.6B 64.33, 4B 69.45, 8B 70.58, and OpenAI text-embedding-3-large 58.93. These are the vendor's own numbers.
- The card does not mention Korean, so **no Korean-specific evidence was found**. ko-MTEB is **unverified**.
- **(inference)** 8B's 4,096 dimensions exceed pgvector's `halfvec` index limit of 4,000. That does not matter without an index, but it is another reason to prefer 0.6B at 1,024 dimensions or a reduced dimension.
- OpenRouter: the installed provider has an `OpenRouterEmbeddingModel` that POSTs `{model, input, user, provider}` (plus `extraBody`) to `/embeddings` (L1, near line 5520). A `dimensions` field could only travel through `extraBody`.
- The availability of `qwen/qwen3-embedding-0.6b` and `openai/text-embedding-3-small` on OpenRouter comes from the team's earlier note (`.scratch/iteration-3/kickoff-ideation.md`, line 294) and was **not re-verified** here.

**Structured, lexical or vectors (inference)**
- **Place resolution:** use the alias lexicon plus lexical matching (section 4), not embeddings. A vector search always returns a nearest item, so it never says "none" unless you add a tuned threshold. That breaks the none/one/several contract, and a wrong link is worse than an empty one.
- **Event search:** keep the structured query (period, board, words). Event-kind classification at ingestion adds a filter, not a vector.
- **답변 항목 (FAQ) matching and grouping of unanswered questions:** these are paraphrase problems, where embeddings help. Use exact scan, top-k candidates and a similarity threshold. The model chooses among the candidates or answers "none", like a resolver. Merging lexical and vector ranks with RRF [S3] is optional at this size.

**RAG evaluation [unverified]**
- RAGAS docs were not opened. From memory, RAGAS "faithfulness" is the share of claims in the answer that the retrieved context supports, judged by an LLM. Check https://docs.ragas.io before citing it.
- **(inference)** Our design makes entity grounding deterministic: every card and Proposal id passed `FoundIds`. Only the reply's free text and FAQ answers need a faithfulness check.

## 4. Korean matching: jamo and 초성

**es-hangul [S4]**
- It is "A modern JavaScript library for handling Hangul characters", MIT licensed, by Viva Republica (Toss), and ships as ES modules so unused code can be dropped.
- The README shows `getChoseong(searchWord) // ㄹㅁ` for checking whether a word's initial consonants match what the User typed, and `josa(word, '을/를')`.
- The fetched README did not list `disassemble`, `assemble` or `romanize`, so they are **unverified** here. The API is documented at https://es-hangul.slash.page/.

**How 초성 search works [L3]**
- A precomposed syllable U+AC00..U+D7A3 encodes `0xAC00 + (initial×21 + medial)×28 + final`. The initial consonant index is therefore `(code − 0xAC00) // 588`, and NFD splits a syllable into conjoining jamo.
- The check confirmed this: 학 is U+D559 both by the formula and as the actual character, and NFD gives U+1112 U+1161 U+11A8.
- 초성 search computes the initial-consonant string of each candidate name and alias and compares it with the query when the query is all consonants. Matching while typing needs the last, unfinished syllable decomposed **(inference)**.

The local check used an illustrative list of names: 학생회관, 중앙도서관, 자연과학대학, 관정도서관, 학부생활관, 행정관 and 농업생명과학대학. Its output:

| Query | Substring (today's search) | Syllable subsequence | 초성 subsequence |
|---|---|---|---|
| 학관 | none | 학생회관, 학부생활관 | 학생회관, 학부생활관, 행정관 |
| 중도 | none | 중앙도서관 | 중앙도서관, 자연과학대학, 관정도서관 |
| 자대 | none | 자연과학대학 | 중앙도서관, 자연과학대학, 관정도서관 |
| ㅎㄱ | none | none | 학생회관, 학부생활관, 행정관 |

**(inference)** Korean abbreviations usually take the first syllable of each word, so syllable-subsequence matching recovers many of them but can return several Places. That fits the "several → ask" rule. 초성 subsequence matching over-matches and should run only on all-consonant queries, with prefix matching rather than subsequence. Order the matching as: alias lexicon exact → syllable subsequence → 초성 prefix → several or none. Edit distance and model fallback come last and choose only among candidates.

## 5. Prompt-injection defenses for tool agents

**AgentDojo [S5]**
- The benchmark has 97 user tasks, 27 injection tasks, 629 security test cases and 4 environments. The text says 74 tools and the Table 1 caption says 70.
- Table 3 (benign utility / utility under attack / targeted ASR): GPT-4o 69.00% / 50.08% / 47.69%, and Claude 3.5 Sonnet 78.22% / 51.19% / 33.86%.
- Table 5 gives the defenses on GPT-4o:

  | Defense | Benign utility | Utility under attack | Targeted ASR |
  |---|---|---|---|
  | None | 69.0% | 50.01% | 57.69% |
  | Data delimiters | 72.66% | 55.64% | 41.65% |
  | Prompt-injection detector | 41.49% | 21.14% | 7.95% |
  | Prompt sandwiching (repeat the user prompt) | 85.53% | 67.25% | 27.82% |
  | Tool filter | 73.13% | 56.28% | 6.84% |

  The text rounds the tool filter's ASR to 7.5%. The no-defense ASR of 57.69% in Table 5 differs from the 47.69% in Table 3, and the introduction's "less than 25%" figure matches neither, so check the tables before quoting them.
- The tool filter fails when the tools can't be planned in advance, or when "the tools required to solve the task are also sufficient to carry out the attack". That covers 17% of the test cases.
- Injections placed at the end of a tool response are the most effective, reaching up to 70% average success against GPT-4o. "More capable models tend to be easier to attack."

**CaMeL [S6]**
- CaMeL "explicitly extracts the control and data flows from the (trusted) query; therefore, the untrusted data retrieved by the LLM can never impact the program flow".
- It attaches capabilities to data and enforces security policies when tools are called, which blocks exfiltration over unauthorized data flows.
- On AgentDojo it solves 77% of tasks with provable security, against 84% for the undefended system (v2 numbers).
- The split into a privileged and a quarantined LLM is not stated in the abstract, so it is **unverified** from this fetch.

**Anthropic and OpenAI guidance**: not opened, **unverified**.

**What a small team can realistically do (inference, grounded in S5 and S6)**
- Delimiters alone are weak: in S5 they lowered ASR only from 57.69% to 41.65%. Keep them, but do not count on them.
- The strong cheap controls are structural:
  - Restrict which tools a request can reach, as the tool filter does.
  - Make actions need the User's confirmation.
  - Check data flow on the server, the small-scale version of CaMeL's capabilities: a value that came from untrusted text may not decide who is invited or what is made.

## 6. Judgement: what we already do, what to add, how to measure

| Area | Already done (L2) | Add | Measure |
|---|---|---|---|
| Structured values | Zod tool schemas. `proposeQuest` validates with the form's rules and answers "refused" with the fields to fix. The model classifies time words and the server computes them. | Do not plan on strict tool use through OpenRouter: the provider sends no `strict` (L1). Compare enum values case-insensitively, since their casing is not guaranteed [S1]. | Rate of tool calls with an invalid schema or a "refused" answer, and the repair rate on the next step, from the run observer logs. |
| Tool design | 11 tools; candidate-returning resolvers; presenters accept only ids from this message (`found-ids.ts`); actionable errors [S2]. | Iterate tool descriptions on a held-out split of the P19 cases [S2]. Count `FoundIds` refusals and switch to short handles if they are frequent. | P19 per-case accuracy, tool calls, tokens and tool errors [S2]; resolver `several` rate and wrong-pick rate. |
| Retrieval | Structured event search; substring and number Place search. | Alias table plus the section 4 matching for Places. Event-kind tag at ingestion. Embeddings only for 답변 항목 and grouping: exact scan, no index [S3], Qwen3-Embedding-0.6B or text-embedding-3-small. Choose by our own Korean test, since no Korean evidence was found [S7]. | Alias-set accuracy and `several` rate (ideation target ≥95%); FAQ top-1 accuracy and precision of "none" on 50–100 Korean paraphrases; grouping purity on a hand-labelled sample. |
| Korean matching | None (`학관` fails today). | es-hangul `getChoseong` [S4]; syllable-subsequence fallback; 초성 prefix only for all-consonant queries. | Same alias set, before and after, per matching stage. |
| Injection | Labelled `<data label=…>` delimiters with tag escaping (`others-text.ts`); the system prompt declares the text data; id allow-list; nothing is made until the User presses 만들기. | Server check that the words passed to `resolveFriend`/`resolvePlace` occur in the User's own messages, so text inside an event description cannot pick invitees (CaMeL-style data-flow rule [S6]). Optionally narrow the tool set per request [S5]. Wrap user-written unanswered questions as others' text wherever they are shown. | AgentDojo-style cases in P19: plant instructions at the end of event descriptions and Quest titles, which is the strongest position [S5]. Report targeted ASR (a Proposal or card carries an attacker-chosen value) and utility under attack. |
