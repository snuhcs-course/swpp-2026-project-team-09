# 02: Each answer and each Judgement reads the AI's provider once, at its start

Parent: [A02 spec](../spec.md) ("The model port", "Keys")
Status: ready-for-agent
Blocked by: 01

## What to build

Both models are built at start from the env keys. Each answer of the chat and each Judgement reads `llm.provider` from the settings once, at its start, and uses that provider's model for all its calls, so one answer never mixes two providers. The same-event choice reads it per call. The Anthropic path is A01's: cache breakpoints plus automatic caching for the chat, effort `medium`, one retry on an overload. Each call logs one line naming the provider.

With no setting saved, the AI uses OpenRouter, so nothing a User sees changes.

## Bring from A01

From `origin/3.0/A01-01-anthropic-model-port` (by hand: the branch is on 3.0/Main):

- `main-server/src/assistant/adapter.ts` (the Anthropic model factory, the options per caller, the retry), `model-port.ts`, `provider-failures.ts`.
- The provider's options in `main-server/src/global-events/judgement-model.ts` and `same-event-choice.ts`; `keyConfigured` in `assistant.service.ts` and `judgements.service.ts`; the bindings in `assistant.module.ts` and `global-events.module.ts`.
- `ANTHROPIC_API_KEY` in `main-server/src/common/settings.ts` and `main-server/.env.example`.
- `@ai-sdk/anthropic` in `main-server/package.json` and `pnpm-lock.yaml` (4.0.81 matched `ai` 7.0.142; recheck against 4.0/Main's `ai`).
- The eval flags and prices: `eval/cli.ts`, `eval/options.ts`, `eval/run.eval.ts`, `eval/runner.ts`, `eval/cost.ts`, `eval/collection/run-cli.ts`, `run-options.ts`, `one.run.ts`, `report.ts`.
- Their tests: `anthropic-requests.integration.test.ts`, `model-port.unit.test.ts`, `settings-model.unit.test.ts`, `eval-cost.unit.test.ts`, `eval-provider-flags.unit.test.ts`, `judgement-settings.integration.test.ts`, and the changes to `assistant-limits.integration.test.ts`, `eval-options.integration.test.ts`, `eval-collection-run-options.unit.test.ts`, `eval-p4-holdout.unit.test.ts`, `settings.unit.test.ts` and `test/global-setup.ts`.

What changes from A01: `MODEL_PROVIDER`, chosen at start-up, is replaced by `llm.provider` read per answer from the settings. `MODEL_PROVIDER` and `ANTHROPIC_MODEL` are not carried, and the server stops reading `ASSISTANT_MODEL`. `MODEL_CACHE` stays, for the evals' `--cache`.

## Acceptance criteria

- [ ] Both models are built at start from `OPENROUTER_API_KEY` and `ANTHROPIC_API_KEY`, with each provider's fixed model id (`anthropic/claude-haiku-5.5`, `claude-haiku-5-5`). A provider without a key has no model.
- [ ] Each answer of the chat and each Judgement reads `llm.provider` once, at its start, and keeps it for every model call of that answer (up to 8 in the chat). The same-event choice reads it per call.
- [ ] A call whose provider has no key fails with 503, as a call with no key does today. The server refuses to start when the Assistant or the Judgement is on and neither key is set.
- [ ] Saving `llm.provider` with a value whose key is empty is refused, through ticket 01's extra check.
- [ ] On Anthropic: the chat's explicit breakpoint after the system prompt and automatic caching of the conversation; one breakpoint after the Judgement's and the same-event choice's constant instructions; effort `medium`; no sampling parameters. On OpenRouter: today's options.
- [ ] One retry on 429 and 529 only (not on a spend-limit 429), at the model call, within the time limit, for all three callers.
- [ ] Each model call logs one line with the provider and the outcome, never a key or the request's content.
- [ ] `pnpm eval` and `pnpm eval:collection` keep reading keys from the local `.env`, with `--provider`, `--cache` and Anthropic's prices, as A01 made them. They do not read the settings.
- [ ] Tests (ADR 0007): the fake-`fetch` test that the Anthropic request carries the breakpoints and effort and no sampling parameters; an answer that keeps the provider read at its start when the copy changes during it; a Judgement likewise; the 503 for a provider without a key; the refusal of such a save; the log line without a key. The existing scripted-model tests pass unchanged.
- [ ] `main-server/README.md`'s settings table and Assistant section say how the provider is chosen.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass.

## Comments
