# A01: The Assistant calls Claude through the Anthropic API, not OpenRouter

Schedule row: Iteration 3, A1, "Openrouter to Claude Console" (Programming - refactoring, unplanned). Owner: 안진영. Spec drafted 2026-11-02 from a grilling session; the research behind it is summarised under Further Notes.

## Problem Statement

Every model call in the main server goes through OpenRouter: the chat Assistant, the Judgement of collected posts, and the same-event choice. All three use one model port (`main-server/src/assistant/adapter.ts`, `MODEL_PORT`), and the eval runners use it too. The model is Claude Haiku 5.5 everywhere (`anthropic/claude-haiku-5.5`).

OpenRouter is a router, not the model's maker, and that costs us three things:

- **Each request can land on a different platform.** OpenRouter routes `anthropic/claude-haiku-5.5` by weighted random choice over five platforms (Anthropic, Claude Platform on AWS, Amazon Bedrock, Google Vertex, Azure) and ten endpoints, and only a request with `cache_control` sticks to one. One message of ours is a loop of several model calls, so its steps may run on different platforms. Haiku 5.5's thinking blocks are bound to the conversation that produced them; a step on another platform may drop the earlier step's reasoning without an error. We could not confirm this happens, but it makes the Assistant's behaviour and our eval results less repeatable than they need to be.
- **No prompt caching.** We send no `cache_control`, so every eval run so far read and wrote 0 cached tokens. Input is 93% of a run's cost (P05 R1: 40M input tokens, USD 4.29). Two kinds of repeat could be read from the cache at a tenth of the price: the steps of one message, which resend everything before them, and, in an eval world, the tools and system prompt, which are byte-identical across its cases (the world's time is fixed). The second needs an explicit breakpoint after the system prompt; automatic caching alone puts its breakpoint after the last block and would only reach a case's earlier repetitions.
- **A second account and key** between us and the model, with its own credit, terms and outages.

## Solution

The model port calls the Anthropic API directly, with the Vercel AI SDK's Anthropic provider (`@ai-sdk/anthropic`) and an API key from 안진영's Claude Console account. The model stays Claude Haiku 5.5 (`claude-haiku-5-5`), so the only change is the path to it. OpenRouter stays selectable by one setting until Iteration 4, so any result can be compared with or rolled back to it. The requests cache the constant part of the prompt (the chat's tools and system prompt, the Judgement's and the same-event choice's instructions) with an explicit breakpoint, the chat also caches its growing conversation automatically, and every request states the effort level (`medium`, Haiku 5.5's default) instead of relying on the default. A model call that fails with 429 or 529 is retried once within the message's time limit, since there is no longer a router to fail over to another platform.

A01 starts only after P06 and P07 are merged, so that their evaluations run on the path they were measured on. Once A01 is merged and deployed, every eval suite runs once on the new path, and that run is the new baseline.

## User Stories

### Using the app

1. As a User, I want the Assistant to answer as it does today, so that the switch changes nothing I can see.
2. As a User, I want a message to be answered by one platform from start to end, so that the Assistant's steps build on each other's reasoning.
3. As a User, I want a momentary overload of the model to be retried once, so that I don't get an error when a retry would have worked.
4. As a User, I want a message that cannot be answered within its time limit to fail as it does today, so that a retry never makes me wait longer than the limit.

### Running the service

5. As the operator, I want one setting to choose between the Anthropic API and OpenRouter, so that I can roll back without a code change. Each provider has its own model setting, so the choice never sends one provider's model id to the other.
6. As the operator, I want the server to refuse to start when the chosen provider's key is missing and the Assistant or Judgement is on, so that a bad Release does not replace running pods (as today for `OPENROUTER_API_KEY`).
7. As the operator, I want the Anthropic key stored like the OpenRouter key (an SSM SecureString read by the Release), so that it never sits in git or in a manifest.
8. As the operator, I want the network policy to allow the main server to reach `api.anthropic.com` on 443, so that production can call it.
9. As the operator, I want the server log to name the provider and the HTTP status of a failed call and never the request's content, as it does today.

### Measuring

10. As an evaluator, I want each run to record which provider it used, so that runs on different paths are never compared without saying so.
11. As an evaluator, I want each run to record cache reads and writes with their cost, so that the saving can be seen.
12. As an evaluator, I want the cost estimate to use Anthropic's listed prices on the Anthropic path, so that the budget check stays right.
13. As an evaluator, I want one baseline run of every suite on the new path, recorded beside the last OpenRouter run of each, so that later improvements are measured against the path production uses.

## Implementation Decisions

### The provider setting

- `MODEL_PROVIDER`: `anthropic` (the default) or `openrouter`. Rolling back is this one setting.
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (`claude-haiku-5-5`) for `anthropic`. `OPENROUTER_API_KEY` and `ASSISTANT_MODEL` (`anthropic/claude-haiku-5.5`, unchanged) stay for `openrouter`. One model id per provider means `--provider openrouter` can never send `claude-haiku-5-5` to OpenRouter.
- The server refuses to start when the Assistant or `AUTOMATIC_JUDGEMENT` is on and the chosen provider's key or model is empty, as it does today for OpenRouter.
- Every place that decides "is a key configured" reads the chosen provider's key: today `assistant.service.ts` and `judgements.service.ts` set `keyConfigured` from `OPENROUTER_API_KEY`, which with only the Anthropic key set would start the server and answer every message with a 503.

### The model port (`adapter.ts`)

- `adapter.ts` stays the one file that knows the model library (ADR 0005). It gains an Anthropic model factory beside `openRouterModel`. `MODEL_PORT` is bound in two modules, `assistant.module.ts` and `global-events.module.ts`; both bind it by `MODEL_PROVIDER`, from one shared factory.
- Provider options are chosen with the model. On `anthropic`:
  - **the chat:** an explicit cache breakpoint at the end of the system prompt (so the tools and the system prompt are read across messages whose prompt is the same, which in an eval world is every case), and automatic caching for the conversation (so each step of a message reads the steps before it);
  - **the Judgement and the same-event choice:** an explicit breakpoint at the end of their constant `INSTRUCTIONS` only. Each is one call whose last block is unique, so automatic caching would write the whole prompt at 1.25x and never be read: Anthropic's guide calls that a pure surcharge;
  - effort `medium`, sent explicitly;
  - no `temperature`, `top_p` or `top_k`. The API version the SDK sends rejects them, and we send none today.
  - The ticket confirms the option names (`cacheControl`, the message-level marker, effort) in the installed provider's source.
  - **The caching mode is a setting**, `MODEL_CACHE`: `breakpoints` (the default, as above), `auto` (automatic caching only, for every caller) or `off`. The eval runners take it as `--cache`, and a run's record names it. It exists so that ticket 04 can measure what each mode costs; production keeps the default.
- On `openrouter` the options stay as they are today (`data_collection: 'deny'`, and `require_parameters: true` for the Judgement and same-event calls).
- Retries: a model call that fails with 429 or 529 is retried once, for the chat, the Judgement and the same-event choice alike. The retry sits at the model call, not around `generateText` (which would run the tools again), and not as the SDK's `maxRetries` (which also retries other statuses): a small wrapper of the provider's `fetch` or a model middleware. It stays inside `timeoutMs`, which already aborts the whole message. No other status is retried, and a 429 with `enforced_spend_limit_reached` is not retried either. The comments on `MAX_RETRIES` and on the Judgement's "not sent again" are rewritten.
- `causeOf()` names both providers' errors, including the spend limit: on Anthropic, reaching the account's own limit is a 400 `invalid_request_error` and the tier cap a 429 `enforced_spend_limit_reached` (OpenRouter's equivalent is today's 402). A refusal (`stop_reason: refusal`) ends the run as `NoAnswerError` on both, as it does today.
- The Judgement's and the same-event choice's provider options (`judgement-model.ts`, `same-event-choice.ts`) move behind the same choice.
- The SDK packages: `@ai-sdk/anthropic` is added at the version that matches the installed `ai`. If it needs a newer `ai`, the ticket upgrades `ai` in the same change and says so.

### The eval runners

- `pnpm eval` and `pnpm eval:collection` take the provider from the same setting, with a `--provider` flag that overrides it. Today `eval/run.eval.ts` and `eval/collection/run-cli.ts` require `OPENROUTER_API_KEY` and call `openRouterModel`; both follow the provider.
- A run's record and its results directory name the provider beside the model. The dated model id that `canonicalSlugOf` reads from OpenRouter's list comes, on the Anthropic path, from the response's model id (or the Models API).
- `eval/cost.ts` prices a run on the Anthropic path from a fixed table of Anthropic's listed prices for the models we use (input, output, cache read, cache write), with the table's source and date in the file, and the rate it uses: Haiku 5.5 has a second rate above 100K prompt tokens, which our prompts stay below. OpenRouter's list stays for the `openrouter` path. The fallback prices stay for an unknown model.
- Usage records keep the cache read and cache write tokens they already have fields for.

### Deployment

- The Release reads `/snunow/production/anthropic-api-key` (SSM SecureString) as it reads `openrouter-api-key`, and writes `ANTHROPIC_API_KEY` into the settings. `MODEL_PROVIDER` and `ANTHROPIC_MODEL` go into `shared/kustomization.yaml`, and `main-server.yaml` passes all three to the pod. The OpenRouter parameter stays until Iteration 4.
- The network policy already allows 443 to the internet and cannot name a host, so only its comment changes (it names Anthropic beside OpenRouter).
- `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `bootstrap.sh`, `infra/deploy/README.md` and their tests carry the new settings.
- The key that goes into SSM is a new one: 안진영 rotates the key that was pasted in the session chat before ticket 02's SSM step, so production never holds a known-exposed key.
- Writing the SSM parameter is a person's step: the ticket gives 안진영 a `!` command with an empty-value guard, as for the other secrets.
- The switch goes to production when A01 is merged (no Dev-first stage).

### Documentation

- ADR 0013: the Assistant calls the model through the Anthropic API directly. It records why: one platform per message, prompt caching, one account fewer, and that OpenRouter stays selectable until Iteration 4. ADR 0005 is marked as superseded on the provider only.
- README: the Assistant row of the stack table, the setup steps, the settings table, the AI-in-the-product paragraph and the external-services table (Anthropic's terms instead of OpenRouter's) are updated. `main-server/README.md` and `infra/production/README.md` (the key's SSM step, the Judgement's credit note) too.

## Testing Decisions

- Tests follow ADR 0007's levels.
- Unit: the settings refuse a missing key for the chosen provider; the module binds the right model by `MODEL_PROVIDER`; the retry runs once on 429 and 529 and never on other statuses or past the time limit; `eval/cost.ts` prices a run with cache reads and writes from the Anthropic table.
- Integration: the existing assistant, Judgement and same-event tests still run against the scripted model (`test/scripted-model.ts`), which does not care about the provider. One test checks that the Anthropic path's request carries the cache and effort options and no sampling parameters, through a fake `fetch`.
- Integration: the Assistant answers, and the Judgement runs, with only `ANTHROPIC_API_KEY` set and `OPENROUTER_API_KEY` empty.
- No test calls a real model. The real checks are the baseline runs, which spend money: their cost is estimated and approved before they run. The estimate on 2026-11-02 was about USD 1.5–2 for the chat suites with caching, against about USD 5.6 without. Its basis: the system-prompt breakpoint lets every case after the first read the tools and system prompt, and each step reads the steps before it; a case's repetitions add little beyond that. The ticket re-estimates with the collection evaluations included.
- **The caching experiment (ticket 04).** The same suites run under `off`, `auto` and `breakpoints` on one commit, so that the saving is measured, not assumed: P19 for the chat (its 62 cases, `--repeat 1`, plus one `--repeat 3` run under `breakpoints` to see what repetitions add), and evaluation A for the Judgement. Each run records input, cache-read and cache-write tokens, cost, time per turn and pass rate. Pass rates should not move, since caching never changes outputs; a move beyond the suite's noise is read and reported. The result fixes the default mode and replaces the estimate above.
- The baseline: P19, P4, P5 (small and large worlds), P6, and the collection evaluations A and B (`pnpm eval:collection`, which measure the Judgement and the same-event choice), once each on the Anthropic path, recorded beside the last OpenRouter run of each suite as a different condition (metrics 4.3). The record reports the cache hit rate and the cost per turn.

## Out of Scope

- Moving the current time out of the system prompt so that production requests hit the cache across messages. It changes the prompt and so the Assistant's behaviour; it is a TODO for later (Further Notes).
- Removing OpenRouter: its code, its key and its parameter go in Iteration 4.
- Changing the model, the effort level, the step or token limits, or any prompt.
- Anthropic features beyond caching and effort (server tools, fallbacks, batch, citations).

## Further Notes

- **Research (2026-11-02).** Both paths serve the same snapshot (`claude-haiku-5.5-20261007`) with the same system prompt, tools and limits, and neither adds a system prompt to API requests. OpenRouter's context compression ("middle-out") applies by default only to endpoints of 8K context or less, so not to ours. Caching never changes outputs (Anthropic's prompt-caching docs), only cost and latency. Haiku 5.5 has no server-side refusal fallback. The full notes are in the session's research file; the ticket that writes ADR 0013 copies what it needs.
- **The account.** 안진영's Claude Console account, with a monthly spend limit of USD 200 that 안진영 sets in the Console.
- **TODO: caching across messages in production.** The system prompt holds the current time to the minute (`korea-time.ts`), so in production every new message misses the cache from the system prompt onwards; only the steps within one message share it. Moving the time into the last user message, or a mid-conversation system message, would let the tools and the system prompt be read from the cache. It changes what the model reads, so it needs its own eval run.
- **Order.** A01's tickets start after P06 and P07 are merged. The caching experiment (04) runs after ticket 01 is merged, locally, before the baseline; the baseline (03) runs after 01, 02 and 04, on the mode 04 chose.
