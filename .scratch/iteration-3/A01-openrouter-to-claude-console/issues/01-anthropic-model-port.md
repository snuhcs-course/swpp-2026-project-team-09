# 01: The model port calls Claude through the Anthropic API

Parent: [A01 spec](../spec.md) ("The provider setting", "The model port", "The eval runners")
Status: ready-for-agent
Blocked by: P06 and P07 merged into 3.0/Main

## What to build

The main server and the eval runners call Claude Haiku 5.5 through the Anthropic API by default, with automatic prompt caching and an explicit effort level, and still through OpenRouter when `MODEL_PROVIDER=openrouter`. A 429 or 529 is retried once within the message's time limit. Nothing a User sees changes.

## Acceptance criteria

- [x] `MODEL_PROVIDER` (`anthropic` default, `openrouter`), `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (`claude-haiku-5-5`) in `src/common/settings.ts`, `.env.example` and the settings tests; `OPENROUTER_API_KEY` and `ASSISTANT_MODEL` stay for `openrouter`. The server refuses to start when the Assistant or `AUTOMATIC_JUDGEMENT` is on and the chosen provider's key or model is empty.
- [x] Every OpenRouter assumption follows the provider: `keyConfigured` in `assistant.service.ts` and `judgements.service.ts`; the two `MODEL_PORT` bindings (`assistant.module.ts`, `global-events.module.ts`), from one shared factory; `eval/cli.ts` (its `OPENROUTER_API_KEY` check), `eval/options.ts` (the model from `ASSISTANT_MODEL`, which becomes the chosen provider's model setting), `eval/run.eval.ts` and `eval/collection/run-cli.ts` (key check, `openRouterModel`, and `canonicalSlugOf`'s dated id, taken from the response or the Models API on the Anthropic path).
- [x] `@ai-sdk/anthropic` added at the version matching `ai` (upgrade `ai` in the same change if needed, and say so). `adapter.ts` stays the only file that imports a model library: an Anthropic model factory beside `openRouterModel`, and `MODEL_PORT` bound by `MODEL_PROVIDER`.
- [x] Provider options chosen with the model. On `anthropic`: the chat puts an explicit cache breakpoint at the end of the system prompt and caches the conversation automatically; the Judgement and the same-event choice put one breakpoint at the end of their constant `INSTRUCTIONS` and no automatic caching; all send effort `medium` and no sampling parameters. On `openrouter`, today's options unchanged. The exact option names come from the installed provider's source and are noted in a comment.
- [x] `MODEL_CACHE` (`breakpoints` default, `auto`, `off`) chooses the caching mode for all three callers; the eval runners take `--cache` and record the mode in the run's record and results directory.
- [x] One retry on 429 and 529 only (not a 429 `enforced_spend_limit_reached`), at the model call (a `fetch` wrapper or a model middleware, not `maxRetries`, not around `generateText`), inside `timeoutMs`, for all three callers. The comments on `MAX_RETRIES` and the Judgement's "not sent again" are rewritten.
- [x] `causeOf()` names both providers' errors, including Anthropic's spend limits (400 `invalid_request_error` for the account's limit, 429 `enforced_spend_limit_reached` for the tier cap) beside OpenRouter's 402; a refusal still ends as `NoAnswerError`.
- [x] `pnpm eval` and `pnpm eval:collection` follow `MODEL_PROVIDER`, with a `--provider` flag. The run record and the results directory name the provider.
- [x] `eval/cost.ts` prices the Anthropic path from a fixed table of Anthropic's listed prices for the models used (input, output, cache read, cache write), with source, date and the rate used (Haiku 5.5's rate up to 100K prompt tokens); OpenRouter's list stays for `openrouter`.
- [x] Tests (ADR 0007): settings per provider; the binding; the retry (once on 429 and 529, never on others, never past the limit); the Anthropic price table with cache tokens; one integration test with a fake `fetch` checking the Anthropic request carries the breakpoints and effort and no sampling parameters, for the chat and for the Judgement; one integration test that the Assistant answers and the Judgement runs with only `ANTHROPIC_API_KEY` set. The existing scripted-model tests pass unchanged.
- [x] One manual check through the real key (cost recorded): two chat messages in a row show a cache write, then a cache read of the tools and system prompt; two Judgement calls on different posts show the second reading the instructions.

## Comments

### Decisions (2026-11-05)

- `@ai-sdk/anthropic` is pinned at 4.0.81, the release built on the same `@ai-sdk/provider` 4.0.28 and `provider-utils` 5.0.61 as the installed `ai` 7.0.142. `ai` is not upgraded.
- Option names, read in `node_modules/@ai-sdk/anthropic/dist/index.js` and noted in `adapter.ts`: `providerOptions.anthropic.cacheControl` on a system message is the explicit breakpoint (`cache_control` on its text block); the same option on the call is the request's top-level `cache_control`, automatic caching; `providerOptions.anthropic.effort` is `output_config.effort`. The provider drops `temperature`, `topP` and `topK` for Haiku 5.5, and none of our callers sends them.
- The Anthropic options are added by a model middleware that `anthropicModel()` wraps the model in, so the callers stay provider-blind. It tells the chat from the single calls by whether the call gives tools: a call with tools is a step of the loop, so it gets automatic caching too. The OpenRouter options stay at the call sites, unchanged, and the Anthropic provider ignores them. This keeps the existing scripted-model test of `data_collection: deny` as it was.
- The retry is a second middleware (`retriedOnce`) on both providers' models: one more try after 1 s, only on 429 or 529, never on a 429 with `enforced_spend_limit_reached`, and never once the call's abort signal (the message's `timeoutMs`) has fired. The wait also ends on that signal.
- `causeOf()` names the provider by the failed call's host (`from Anthropic`, `from OpenRouter`). It also names OpenRouter's 402, Anthropic's 429 `enforced_spend_limit_reached`, and a 400 `invalid_request_error` that mentions "usage limits" (the account's own limit). The body is read but never logged. The host lookup and the limit reading sit in `provider-failures.ts`, which imports nothing, so that `adapter.ts` stays under the lint's line limit and remains the only file that imports a provider library.
- The settings refuse to start when `AUTOMATIC_JUDGEMENT` or `SAME_EVENT_AI_CHOICE` is on and the chosen provider's key or model is empty. The Assistant has no on-setting: without the chosen provider's key it answers 503, as it did without the OpenRouter key.
- In `RunOptions` and the collection `RunRecord`, the run's `provider` and `cache` are optional, so that runs saved before A01 still parse. Those runs went through OpenRouter, with nothing cached. `pnpm eval` always sets both. OpenRouter runs record `cache: off`, and `--cache` other than `off` is refused with `--provider openrouter`. `--temperature` and `--top-p` are refused with `--provider anthropic`.
- File names: chat runs are `<date>-<commit>-<provider>-<model>-<settings>-cache<mode>`, and collection runs are `collection-<part>-<run>-<provider>-cache<mode>-<commit>`. On the Anthropic path, the collection record's `canonicalSlug` is the dated id of the first response.
- The test settings (`test/global-setup.ts`) now hold the Anthropic settings too, with `MODEL_PROVIDER=anthropic`. Three existing tests were edited, because the default provider changed:
  - the 503 test now empties `ANTHROPIC_API_KEY`;
  - `eval-options` and `eval-p4-holdout` give `ANTHROPIC_MODEL`, or pass `--provider openrouter`.
- Already failing before this ticket, and depends on the date: `judgement-settings.integration` "The app receives no Judgement…" fails with its file as at the base commit (the run used this branch's source) after 2026-11-05 16:00 KST. Its fixture's event (`2026-11-05T14:00–16:00`) has ended by then, so it no longer lists as upcoming.

### Manual check (2026-11-05, real key, `claude-haiku-5-5`, `MODEL_CACHE=breakpoints`)

Run 17:53 KST, after the 5-minute entries of earlier tries had expired. The chat used the real chat feature's system prompt and tools, with the tools stubbed, and the same `now` for both messages.

| Call | Input | Cache read | Cache write | Output | USD |
|---|---|---|---|---|---|
| Chat message 1 | 25,453 | 0 | 25,449 | 105 | 0.003234 |
| Chat message 2 | 25,571 | 25,449 | 118 | 20 | 0.000280 |
| Judgement, post 1 | 1,193 | 0 | 1,072 | 282 | 0.000287 |
| Judgement, post 2 | 1,177 | 1,072 | 0 | 297 | 0.000170 |

- The second chat message reads the tools and system prompt from the cache and writes only the conversation's tail.
- The second Judgement reads its instructions, with the output schema before them.
- That run cost USD 0.0040. Every try of the check together cost about USD 0.010: four runs, two of which stopped before any call.

### Agent usage (2026-11-05)

- Agent time: about 75 minutes (estimate), one session in this worktree, with no subagents. About 6 minutes of it was spent waiting for the cache entries to expire.
- Tokens (estimate, the session reports no exact count): input about 120 uncached, with about 9,000,000 cache reads and 300,000 cache writes shown apart; output about 70,000.
