# 02: The model port takes its provider and key for each call, with a backup key

Parent: [A02 spec](../spec.md) ("Keys", "The model port", "The backup key")
Status: ready-for-agent
Blocked by: 01

## What to build

Every model call of the main server (the chat Assistant, the Judgement and the same-event choice) reads the chosen key's name from the settings store, takes the key's value, and calls the provider the key's prefix names. The Anthropic path is A01's: cache breakpoints plus automatic caching for the chat, effort `medium`, one retry on an overload. Three key-type failures in a row switch to the backup key when one is set. Each call logs one line naming the provider and the key's name.

With no setting saved, the AI uses `default`, the existing OpenRouter key, so nothing a User sees changes.

## Bring from A01

From `origin/3.0/A01-01-anthropic-model-port` (by hand: the branch is on 3.0/Main):

- `main-server/src/assistant/adapter.ts` (the Anthropic model factory, the options per caller, the retry), `model-port.ts`, `provider-failures.ts`.
- The provider's options in `main-server/src/global-events/judgement-model.ts` and `same-event-choice.ts`; `keyConfigured` in `assistant.service.ts` and `judgements.service.ts`; the bindings in `assistant.module.ts` and `global-events.module.ts`.
- `@ai-sdk/anthropic` in `main-server/package.json` and `pnpm-lock.yaml` (4.0.81 matched `ai` 7.0.142; recheck against 4.0/Main's `ai`).
- The eval flags and prices: `eval/cli.ts`, `eval/options.ts`, `eval/run.eval.ts`, `eval/runner.ts`, `eval/cost.ts`, `eval/collection/run-cli.ts`, `run-options.ts`, `one.run.ts`, `report.ts`, and `main-server/.env.example`.
- Their tests: `anthropic-requests.integration.test.ts`, `model-port.unit.test.ts`, `settings-model.unit.test.ts`, `eval-cost.unit.test.ts`, `eval-provider-flags.unit.test.ts`, `judgement-settings.integration.test.ts`, and the changes to `assistant-limits.integration.test.ts`, `eval-options.integration.test.ts`, `eval-collection-run-options.unit.test.ts`, `eval-p4-holdout.unit.test.ts`, `settings.unit.test.ts` and `test/global-setup.ts`.

What changes from A01: `MODEL_PROVIDER`, chosen at start-up, is replaced by the provider and key read for each call from the cached settings. `MODEL_PROVIDER` and `ANTHROPIC_MODEL` are not carried, and the server stops reading `ASSISTANT_MODEL`. `MODEL_CACHE` stays, for the evals' `--cache`.

## Acceptance criteria

- [ ] The key list: the env keys (from ticket 01's function) plus, when the folder `/var/run/llm-keys` exists, one key per file in it, with its added date from `added.json`. The provider comes from the prefix (`sk-ant-` Anthropic, `sk-or-` OpenRouter, other unknown). Values stay in memory and on the files.
- [ ] Each call reads `llm.key` from the settings store and the key's value from the list, and builds the model for its provider with the provider's fixed model id (`claude-haiku-5-5`, `anthropic/claude-haiku-5.5`). A model is reused while the key's name and value stay the same.
- [ ] On Anthropic: the chat's explicit breakpoint after the system prompt and automatic caching of the conversation; one breakpoint after the Judgement's and the same-event choice's constant instructions; effort `medium`; no sampling parameters. On OpenRouter: today's options.
- [ ] One retry on 429 and 529 only (not on a spend-limit 429), at the model call, within the time limit, for all three callers.
- [ ] Key-type failures (401, 403, a spend limit, a 429 left after the retry) are counted per key in Redis, and a success resets the count. On the third with a backup key set and present, `llm.key` becomes the backup, `llm.backupKey` becomes empty, a `SettingChange` row with cause `AUTOMATIC_SWITCH` is written, and a warning is logged. No switch back. Without a backup key, only the warning.
- [ ] A chosen key that is missing from the list uses the backup key if it is present, and otherwise fails as a call with no key does today (503).
- [ ] The server refuses to start when the Assistant or the Judgement is on and the list holds no key at all.
- [ ] Each model call logs one line with the provider, the key's name and the outcome, never the key or the request's content.
- [ ] `pnpm eval` and `pnpm eval:collection` keep reading keys from the local `.env`, with `--provider`, `--cache` and Anthropic's prices, as A01 made them. They do not read the settings store.
- [ ] Tests (ADR 0007): the prefix rule; the key list from a folder and from env; the failure rules (2 no switch, 3 switch, success resets, no backup no switch); the fake-`fetch` test that the Anthropic request carries the breakpoints, the effort and the chosen key; a call using the key in Redis's copy; the log line without a key. The existing scripted-model tests pass unchanged.
- [ ] `main-server/README.md`'s settings table and Assistant section say how the provider and key are chosen.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass.

## Comments
