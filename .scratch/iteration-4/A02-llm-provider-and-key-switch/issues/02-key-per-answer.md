# 02: Each answer and each Judgement reads the AI's key once, at its start

Parent: [A02 spec](../spec.md) ("The model port", "Keys")
Status: ready-for-agent
Blocked by: 01

## What to build

A model is built at start for each of the AI's keys: `OPENROUTER_API_KEY`, the key named `default`, and each key in `LLM_KEYS` (ticket 03), on the provider its value tells. This ticket registers `llm.key`, a key's name, default `default`. Each answer of the chat and each Judgement reads `llm.key` from the settings once, at its start, and uses that key's model for all its calls, so one answer never mixes two keys. The same-event choice reads it per call. The Anthropic path is A01's: cache breakpoints plus automatic caching for the chat, effort `medium`, one retry on an overload. Each call logs one line naming the key and its provider.

With no setting saved, the AI uses the `default` key on OpenRouter, so nothing a User sees changes.

## Bring from A01

From `origin/3.0/A01-01-anthropic-model-port` (by hand: the branch is on 3.0/Main):

- `main-server/src/assistant/adapter.ts` (the Anthropic model factory, the options per caller, the retry), `model-port.ts`, `provider-failures.ts`.
- The provider's options in `main-server/src/global-events/judgement-model.ts` and `same-event-choice.ts`; `keyConfigured` in `assistant.service.ts` and `judgements.service.ts`; the bindings in `assistant.module.ts` and `global-events.module.ts`.
- Not `ANTHROPIC_API_KEY`: the Anthropic keys come from `LLM_KEYS`, which ticket 03 adds to `main-server/src/common/settings.ts`.
- `@ai-sdk/anthropic` in `main-server/package.json` and `pnpm-lock.yaml` (4.0.81 matched `ai` 7.0.142; recheck against 4.0/Main's `ai`).
- The eval flags and prices: `eval/cli.ts`, `eval/options.ts`, `eval/run.eval.ts`, `eval/runner.ts`, `eval/cost.ts`, `eval/collection/run-cli.ts`, `run-options.ts`, `one.run.ts`, `report.ts`.
- Their tests: `anthropic-requests.integration.test.ts`, `model-port.unit.test.ts`, `settings-model.unit.test.ts`, `eval-cost.unit.test.ts`, `eval-provider-flags.unit.test.ts`, `judgement-settings.integration.test.ts`, and the changes to `assistant-limits.integration.test.ts`, `eval-options.integration.test.ts`, `eval-collection-run-options.unit.test.ts`, `eval-p4-holdout.unit.test.ts`, `settings.unit.test.ts` and `test/global-setup.ts`.

What changes from A01: `MODEL_PROVIDER`, chosen at start-up, is replaced by `llm.key` read per answer from the settings. `MODEL_PROVIDER` and `ANTHROPIC_MODEL` are not carried, and the server stops reading `ASSISTANT_MODEL`. `MODEL_CACHE` stays, for the evals' `--cache`.

## Acceptance criteria

- [x] `llm.key` is registered: a key's name, default `default`; its allowed values are `default` and the names in `LLM_KEYS`, and saving `default` when `OPENROUTER_API_KEY` is not set is refused by the setting's own check.
- [x] A model is built at start for each key, with its provider's fixed model id (`anthropic/claude-haiku-5.5`, `claude-haiku-5-5`). The provider is told by the key's value: `sk-ant-` is Anthropic, `sk-or-` OpenRouter. A key with neither is not offered, and the start-up log names it, never its value.
- [x] Each answer of the chat and each Judgement reads `llm.key` once, at its start, and keeps it for every model call of that answer (up to 8 in the chat). The same-event choice and the topics reading read it per call.
- [x] A call when no key is set fails with 503, as it does today. A saved name whose key a later Release removed reads as `default`, and the pod logs it. The server refuses to start when the Assistant or the Judgement is on and no key is set.
- [x] Saving `llm.key` with a name the pod has no key for is refused, through ticket 01's checks.
- [x] On Anthropic: the chat's explicit breakpoint after the system prompt and automatic caching of the conversation; one breakpoint after the Judgement's and the same-event choice's constant instructions; effort `medium`; no sampling parameters. On OpenRouter: today's options.
- [x] One retry on 429 and 529 only (not on a spend-limit 429), at the model call, within the time limit, for all three callers.
- [x] Each model call logs one line with the key's name, its provider and the outcome, never a key's value or the request's content.
- [x] `pnpm eval` and `pnpm eval:collection` keep reading keys from the local `.env`, with `--provider`, `--cache` and Anthropic's prices, as A01 made them. They do not read the settings.
- [x] Tests (ADR 0007): the fake-`fetch` test that the Anthropic request carries the breakpoints and effort and no sampling parameters; an answer that keeps the provider read at its start when the copy changes during it; a Judgement likewise; the 503 with no key; a removed key read as `default`; the refusal of such a save; the log line without a key. The existing scripted-model tests pass unchanged.
- [x] `main-server/README.md`'s settings table and Assistant section say how the key, and with it the provider, is chosen.
- [x] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass.

## Comments

### Agent usage (2026-11-15)

- Agent time: about 2 hours 40 minutes in one session (Opus 5.5, worktree `/workspace/a02-02`), both review rounds and
  the merge of `4.0/Main` included. An estimate.
- Tokens, estimated: input about 17M, of which about 16.2M cache reads and 0.7M cache writes; output about 150k. No
  subagents.
