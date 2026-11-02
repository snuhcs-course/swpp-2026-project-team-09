# 01: The model port calls Claude through the Anthropic API

Parent: [A01 spec](../spec.md) ("The provider setting", "The model port", "The eval runners")
Status: ready-for-agent
Blocked by: P06 and P07 merged into 3.0/Main

## What to build

The main server and the eval runners call Claude Haiku 5.5 through the Anthropic API by default, with automatic prompt caching and an explicit effort level, and still through OpenRouter when `MODEL_PROVIDER=openrouter`. A 429 or 529 is retried once within the message's time limit. Nothing a User sees changes.

## Acceptance criteria

- [ ] `MODEL_PROVIDER` (`anthropic` default, `openrouter`) and `ANTHROPIC_API_KEY` in `src/common/settings.ts`, `.env.example` and the settings tests; `ASSISTANT_MODEL` documented per provider (`claude-haiku-5-5` / `anthropic/claude-haiku-5.5`). The server refuses to start when the Assistant or `AUTOMATIC_JUDGEMENT` is on and the chosen provider's key or model is empty.
- [ ] `@ai-sdk/anthropic` added at the version matching `ai` (upgrade `ai` in the same change if needed, and say so). `adapter.ts` stays the only file that imports a model library: an Anthropic model factory beside `openRouterModel`, and `MODEL_PORT` bound by `MODEL_PROVIDER`.
- [ ] Provider options chosen with the model, for the chat, the Judgement and the same-event choice: on `anthropic`, automatic caching on and effort `medium`, no sampling parameters; on `openrouter`, today's options unchanged. The exact option names come from the installed provider's source and are noted in a comment.
- [ ] One retry on 429 and 529 only, inside `timeoutMs`, for all three callers. `causeOf()` names both providers' errors; a refusal still ends as `NoAnswerError`.
- [ ] `pnpm eval` and `pnpm eval:collection` follow `MODEL_PROVIDER`, with a `--provider` flag. The run record and the results directory name the provider.
- [ ] `eval/cost.ts` prices the Anthropic path from a fixed table of Anthropic's listed prices for the models used (input, output, cache read, cache write), with source and date; OpenRouter's list stays for `openrouter`.
- [ ] Tests (ADR 0007): settings per provider; the binding; the retry (once on 429 and 529, never on others, never past the limit); the Anthropic price table with cache tokens; one integration test with a fake `fetch` checking the Anthropic request carries the cache and effort options and no sampling parameters. The existing scripted-model tests pass unchanged.
- [ ] One manual call through the real key (a single "Hello" chat, cost recorded) to confirm the path works and the usage shows a cache write; then a second identical call shows a cache read.
