# A01: The Assistant calls Claude through the Anthropic API, not OpenRouter

Schedule row: Iteration 3, A1, "Openrouter to Claude Console" (Programming - refactoring, unplanned). Owner: 안진영. Spec drafted 2026-11-02 from a grilling session; the research behind it is summarised under Further Notes.

## Problem Statement

Every model call in the main server goes through OpenRouter: the chat Assistant, the Judgement of collected posts, and the same-event choice. All three use one model port (`main-server/src/assistant/adapter.ts`, `MODEL_PORT`), and the eval runners use it too. The model is Claude Haiku 5.5 everywhere (`anthropic/claude-haiku-5.5`).

OpenRouter is a router, not the model's maker, and that costs us three things:

- **Each request can land on a different platform.** OpenRouter routes `anthropic/claude-haiku-5.5` by weighted random choice over five platforms (Anthropic, Claude Platform on AWS, Amazon Bedrock, Google Vertex, Azure) and ten endpoints, and only a request with `cache_control` sticks to one. One message of ours is a loop of several model calls, so its steps may run on different platforms. Haiku 5.5's thinking blocks are bound to the conversation that produced them; a step on another platform may drop the earlier step's reasoning without an error. We could not confirm this happens, but it makes the Assistant's behaviour and our eval results less repeatable than they need to be.
- **No prompt caching.** We send no `cache_control`, so every eval run so far read and wrote 0 cached tokens. Input is 93% of a run's cost (P05 R1: 40M input tokens, USD 4.29), and an eval world's tools and system prompt are byte-identical across its cases, so most of that input could be read from the cache at a tenth of the price.
- **A second account and key** between us and the model, with its own credit, terms and outages.

## Solution

The model port calls the Anthropic API directly, with the Vercel AI SDK's Anthropic provider (`@ai-sdk/anthropic`) and an API key from 안진영's Claude Console account. The model stays Claude Haiku 5.5 (`claude-haiku-5-5`), so the only change is the path to it. OpenRouter stays selectable by one setting until Iteration 4, so any result can be compared with or rolled back to it. The requests turn on automatic prompt caching and state the effort level (`medium`, Haiku 5.5's default) instead of relying on the default. A model call that fails with 429 or 529 is retried once within the message's time limit, since there is no longer a router to fail over to another platform.

A01 starts only after P06 and P07 are merged, so that their evaluations run on the path they were measured on. Once A01 is merged and deployed, every eval suite runs once on the new path, and that run is the new baseline.

## User Stories

### Using the app

1. As a User, I want the Assistant to answer as it does today, so that the switch changes nothing I can see.
2. As a User, I want a message to be answered by one platform from start to end, so that the Assistant's steps build on each other's reasoning.
3. As a User, I want a momentary overload of the model to be retried once, so that I don't get an error when a retry would have worked.
4. As a User, I want a message that cannot be answered within its time limit to fail as it does today, so that a retry never makes me wait longer than the limit.

### Running the service

5. As the operator, I want one setting to choose between the Anthropic API and OpenRouter, so that I can roll back without a code change.
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

- `MODEL_PROVIDER`: `anthropic` (the default) or `openrouter`.
- `ANTHROPIC_API_KEY`: the Anthropic key. `OPENROUTER_API_KEY` stays for the `openrouter` provider.
- `ASSISTANT_MODEL` keeps its role but its value follows the provider: `claude-haiku-5-5` for `anthropic`, `anthropic/claude-haiku-5.5` for `openrouter`. `.env.example`, the k8s settings and `bootstrap.sh` carry the Anthropic value.
- The server refuses to start when the Assistant or `AUTOMATIC_JUDGEMENT` is on and the chosen provider's key or the model is empty, as it does today for OpenRouter.

### The model port (`adapter.ts`)

- `adapter.ts` stays the one file that knows the model library (ADR 0005). It gains an Anthropic model factory beside `openRouterModel`, and the module binds `MODEL_PORT` by `MODEL_PROVIDER`.
- Provider options are chosen with the model. On `anthropic`:
  - automatic prompt caching on (`cacheControl` in the Anthropic provider's options; the ticket confirms the exact option name in the installed provider's source);
  - effort `medium`, sent explicitly;
  - no `temperature`, `top_p` or `top_k`. The API version the SDK sends rejects them, and we send none today.
- On `openrouter` the options stay as they are today (`data_collection: 'deny'`, and `require_parameters: true` for the Judgement and same-event calls).
- Retries: a call that fails with 429 or 529 is retried once, for the chat, the Judgement and the same-event choice alike. The retry stays inside `timeoutMs`, which already aborts the whole message. No other status is retried.
- `causeOf()` names the provider's error kinds of both providers. A refusal (`stop_reason: refusal`) ends the run as `NoAnswerError` on both, as it does today.
- The Judgement's and the same-event choice's provider options (`judgement-model.ts`, `same-event-choice.ts`) move behind the same choice.
- The SDK packages: `@ai-sdk/anthropic` is added at the version that matches the installed `ai`. If it needs a newer `ai`, the ticket upgrades `ai` in the same change and says so.

### The eval runners

- `pnpm eval` and `pnpm eval:collection` take the provider from the same setting, with a `--provider` flag that overrides it.
- A run's record and its results directory name the provider beside the model.
- `eval/cost.ts` prices a run on the Anthropic path from a fixed table of Anthropic's listed prices for the models we use (input, output, cache read, cache write), with the table's source and date in the file. OpenRouter's list stays for the `openrouter` path. The fallback prices stay for an unknown model.
- Usage records keep the cache read and cache write tokens they already have fields for.

### Deployment

- The Release reads `/snunow/production/anthropic-api-key` (SSM SecureString) as it reads `openrouter-api-key`, and writes `ANTHROPIC_API_KEY` and `MODEL_PROVIDER` into the settings. The OpenRouter parameter stays until Iteration 4.
- The network policy and its comment allow 443 to `api.anthropic.com`.
- `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `bootstrap.sh` and their tests carry the new settings.
- Writing the SSM parameter is a person's step: the ticket gives 안진영 a `!` command with an empty-value guard, as for the other secrets.
- The switch goes to production when A01 is merged (no Dev-first stage).

### Documentation

- ADR 0013: the Assistant calls the model through the Anthropic API directly. It records why: one platform per message, prompt caching, one account fewer, and that OpenRouter stays selectable until Iteration 4. ADR 0005 is marked as superseded on the provider only.
- README: the Assistant row of the stack table, the setup steps, the settings table, the AI-in-the-product paragraph and the external-services table (Anthropic's terms instead of OpenRouter's) are updated. `main-server/README.md` and `infra/production/README.md` (the key's SSM step, the Judgement's credit note) too.

## Testing Decisions

- Tests follow ADR 0007's levels.
- Unit: the settings refuse a missing key for the chosen provider; the module binds the right model by `MODEL_PROVIDER`; the retry runs once on 429 and 529 and never on other statuses or past the time limit; `eval/cost.ts` prices a run with cache reads and writes from the Anthropic table.
- Integration: the existing assistant, Judgement and same-event tests still run against the scripted model (`test/scripted-model.ts`), which does not care about the provider. One test checks that the Anthropic path's request carries the cache and effort options and no sampling parameters, through a fake `fetch`.
- No test calls a real model. The real checks are the baseline runs, which spend money: their cost is estimated and approved before they run (estimate on 2026-11-02: about USD 1.5–2 for every suite with caching, against about USD 5.6 without).
- The baseline: P19, P4, P5 (small and large worlds) and P6, once each on the Anthropic path, recorded beside the last OpenRouter run of each suite as a different condition (metrics 4.3). The record reports the cache hit rate and the cost per turn.

## Out of Scope

- Moving the current time out of the system prompt so that production requests hit the cache across messages. It changes the prompt and so the Assistant's behaviour; it is a TODO for later (Further Notes).
- Removing OpenRouter: its code, its key and its parameter go in Iteration 4.
- Changing the model, the effort level, the step or token limits, or any prompt.
- Anthropic features beyond caching and effort (server tools, fallbacks, batch, citations).
- Rotating the Anthropic key that was pasted in the session chat: 안진영 does it in the Console after A01.

## Further Notes

- **Research (2026-11-02).** Both paths serve the same snapshot (`claude-haiku-5.5-20261007`) with the same system prompt, tools and limits, and neither adds a system prompt to API requests. OpenRouter's context compression ("middle-out") applies by default only to endpoints of 8K context or less, so not to ours. Caching never changes outputs (Anthropic's prompt-caching docs), only cost and latency. Haiku 5.5 has no server-side refusal fallback. The full notes are in the session's research file; the ticket that writes ADR 0013 copies what it needs.
- **The account.** 안진영's Claude Console account, with a monthly spend limit of USD 200 that 안진영 sets in the Console.
- **TODO: caching across messages in production.** The system prompt holds the current time to the minute (`korea-time.ts`), so in production every new message misses the cache from the system prompt onwards; only the steps within one message share it. Moving the time into the last user message, or a mid-conversation system message, would let the tools and the system prompt be read from the cache. It changes what the model reads, so it needs its own eval run.
- **Order.** A01's tickets start after P06 and P07 are merged. The baseline ticket runs after the code and deployment tickets are merged and production runs on the new path.
