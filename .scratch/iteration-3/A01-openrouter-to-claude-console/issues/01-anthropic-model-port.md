# 01: The model port calls Claude through the Anthropic API

Parent: [A01 spec](../spec.md) ("The provider setting", "The model port", "The eval runners")
Status: ready-for-agent
Blocked by: P06 and P07 merged into 3.0/Main

## What to build

The main server and the eval runners call Claude Haiku 5.5 through the Anthropic API by default, with automatic prompt caching and an explicit effort level, and still through OpenRouter when `MODEL_PROVIDER=openrouter`. A 429 or 529 is retried once within the message's time limit. Nothing a User sees changes.

## Acceptance criteria

- [ ] `MODEL_PROVIDER` (`anthropic` default, `openrouter`), `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (`claude-haiku-5-5`) in `src/common/settings.ts`, `.env.example` and the settings tests; `OPENROUTER_API_KEY` and `ASSISTANT_MODEL` stay for `openrouter`. The server refuses to start when the Assistant or `AUTOMATIC_JUDGEMENT` is on and the chosen provider's key or model is empty.
- [ ] Every OpenRouter assumption follows the provider: `keyConfigured` in `assistant.service.ts` and `judgements.service.ts`; the two `MODEL_PORT` bindings (`assistant.module.ts`, `global-events.module.ts`), from one shared factory; `eval/cli.ts` (its `OPENROUTER_API_KEY` check), `eval/options.ts` (the model from `ASSISTANT_MODEL`, which becomes the chosen provider's model setting), `eval/run.eval.ts` and `eval/collection/run-cli.ts` (key check, `openRouterModel`, and `canonicalSlugOf`'s dated id, taken from the response or the Models API on the Anthropic path).
- [ ] `@ai-sdk/anthropic` added at the version matching `ai` (upgrade `ai` in the same change if needed, and say so). `adapter.ts` stays the only file that imports a model library: an Anthropic model factory beside `openRouterModel`, and `MODEL_PORT` bound by `MODEL_PROVIDER`.
- [ ] Provider options chosen with the model. On `anthropic`: the chat puts an explicit cache breakpoint at the end of the system prompt and caches the conversation automatically; the Judgement and the same-event choice put one breakpoint at the end of their constant `INSTRUCTIONS` and no automatic caching; all send effort `medium` and no sampling parameters. On `openrouter`, today's options unchanged. The exact option names come from the installed provider's source and are noted in a comment.
- [ ] `MODEL_CACHE` (`breakpoints` default, `auto`, `off`) chooses the caching mode for all three callers; the eval runners take `--cache` and record the mode in the run's record and results directory.
- [ ] One retry on 429 and 529 only (not a 429 `enforced_spend_limit_reached`), at the model call (a `fetch` wrapper or a model middleware, not `maxRetries`, not around `generateText`), inside `timeoutMs`, for all three callers. The comments on `MAX_RETRIES` and the Judgement's "not sent again" are rewritten.
- [ ] `causeOf()` names both providers' errors, including Anthropic's spend limits (400 `invalid_request_error` for the account's limit, 429 `enforced_spend_limit_reached` for the tier cap) beside OpenRouter's 402; a refusal still ends as `NoAnswerError`.
- [ ] `pnpm eval` and `pnpm eval:collection` follow `MODEL_PROVIDER`, with a `--provider` flag. The run record and the results directory name the provider.
- [ ] `eval/cost.ts` prices the Anthropic path from a fixed table of Anthropic's listed prices for the models used (input, output, cache read, cache write), with source, date and the rate used (Haiku 5.5's rate up to 100K prompt tokens); OpenRouter's list stays for `openrouter`.
- [ ] Tests (ADR 0007): settings per provider; the binding; the retry (once on 429 and 529, never on others, never past the limit); the Anthropic price table with cache tokens; one integration test with a fake `fetch` checking the Anthropic request carries the breakpoints and effort and no sampling parameters, for the chat and for the Judgement; one integration test that the Assistant answers and the Judgement runs with only `ANTHROPIC_API_KEY` set. The existing scripted-model tests pass unchanged.
- [ ] One manual check through the real key (cost recorded): two chat messages in a row show a cache write, then a cache read of the tools and system prompt; two Judgement calls on different posts show the second reading the instructions.
