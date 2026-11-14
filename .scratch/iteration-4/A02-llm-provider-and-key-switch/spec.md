# A02: An Administrator changes global settings on the admin site, first the AI's provider

Status: ready-for-agent

Schedule row: Iteration 4, A2, "LLM provider and key switch from the admin site". Owner: 안진영. Reviewer: 윤유상. Spec drafted 2026-11-15 from a grilling session in which 안진영 (PM) settled the decisions, and narrowed the same day after 윤유상's review of PR #248: A02 is global settings that an Administrator changes on the admin site, with the AI's provider as the first one. Key management left the spec.

This spec supersedes Iteration 3's A01 ([its spec](../../iteration-3/A01-openrouter-to-claude-console/spec.md)) and its open pull requests #210 (the model port), #207 (deployment and docs) and #217 (the caching experiment). They are closed after this spec's pull request is up, and their code is carried into A02's tickets, which name the files to bring.

References:
- ADR 0005 (the Assistant runs in the main server on a thin model library) and ADR 0007 (test levels).
- ADR 0013 on `origin/3.0/A01-02-deployment-and-docs` (the Assistant calls Claude through the Anthropic API). It was never merged; ticket 05 brings it in, rewritten for A02.
- `.scratch/iteration-3/A01-openrouter-to-claude-console/caching-experiment.md` on `origin/3.0/A01-04-caching-modes`: what each caching mode costs.

## Problem Statement

Every model call of the main server goes through OpenRouter: the chat Assistant, the Judgement of collected posts, and the same-event choice. The provider is fixed when the server starts. Every setting the server has is an env var in `main-server/src/common/settings.ts`, so changing one means a Release, which only a person with AWS access can do. There is no place where an Administrator changes a setting for the whole service.

Iteration 3's A01 moved the calls to the Anthropic API behind a start-up setting, `MODEL_PROVIDER`. Its measurements were good: on P19 the Anthropic path passed 57 of 64 cases, against 56 to 59 on OpenRouter, for USD 0.085 against 0.53, because the Anthropic path caches the prompt. But it still needed a Release for every switch. When a provider's key runs out of credit or hits a spend limit, the Assistant stops until someone deploys again, and nobody on the admin site can see which provider is in use.

## Solution

A generic `settings` table holds the global settings that Administrators change at run time, with a history of every change. The settings are registered in code, each with a name, a type, a default and its allowed values. A02 registers one: `llm.provider`, `openrouter` or `anthropic`, with `openrouter` as the default. Each provider's model stays a constant in code.

Each main-server pod holds an in-memory copy of the settings. It loads them at start and, every minute at second 0, reads a one-row revision and reloads when it changed. So a change applies on every pod at the next minute, together. There is no Redis copy and no copy job.

Each answer of the chat and each Judgement reads the provider once, at its start, and keeps it for all its model calls, so one answer never mixes two providers.

The keys stay where keys are today, as env vars from Secret `secrets`: `OPENROUTER_API_KEY`, and `ANTHROPIC_API_KEY` from A01's `/snunow/production/anthropic-api-key` parameter. Saving a provider whose key is empty is refused. When a key runs out, an Administrator switches to the other provider. Replacing a key's value is a Release, as it is for any secret.

The admin site gets a "Settings" page that lists every registered setting, saves a change after a confirmation, shows "applies at HH:MM:00" and then "applied", and lists the history. Any Administrator may change any setting.

The Anthropic path keeps A01's design: an explicit cache breakpoint after the constant part of each prompt, automatic caching for the chat's conversation, effort `medium`, and one retry on an overload.

After the merge nothing changes for Users: `llm.provider` has no row, so the AI uses OpenRouter. The Dev Server keeps its keys in its env file.

## User Stories

### Using the app

1. As a User, I want the Assistant to answer as it does today after the merge, so that the change is invisible until an Administrator switches.
2. As a User, I want a momentary overload of the model to be retried once, so that I do not get an error when a retry would have worked.

### Administering

3. As an Administrator, I want to switch the AI's provider without a Release, so that the Assistant keeps working when one provider's key runs out.
4. As an Administrator, I want to see when my change applies, so that I know when the servers use it.
5. As an Administrator, I want a history of every change, with who made it and when, so that I can tell what happened after an incident.

### Running the service

6. As the operator, I want keys to live only in Parameter Store and in a Secret, so that a key never sits in git, in the database or in a log.
7. As the operator, I want the running servers to have no AWS access, so that a compromised pod cannot read Parameter Store.
8. As the operator, I want each model call's log line to name the provider, so that I can tell which provider served a request.
9. As the operator, I want the Dev Server to keep its env keys, so that A02 needs no change there.

### Measuring

10. As an evaluator, I want the evals to keep their local `.env` keys and their `--provider` flag, so that a run never depends on the admin site.
11. As an evaluator, I want a new baseline on both providers, recorded beside the last OpenRouter runs, so that later work is compared with the path production may use.

## Implementation Decisions

### The settings store

- **The registry.** The settings are registered in code, each with a name, a type (`STRING`, `INTEGER`, `BOOLEAN`), a default and its allowed values. A setting with no row has its default. A name that is not registered cannot be saved, and a value is checked against its type and allowed values when it is saved and when it is loaded.
- A02 registers one setting, `llm.provider`: `openrouter` or `anthropic`, default `openrouter`.
- A new Prisma model, `Setting`, on table `settings`: `name` (unique), `value_type` (an enum, `SettingValueType`), `value` (text) and `updated_at`.
- A new model, `SettingChange`, on table `setting_changes`: the setting's name, the old and the new value, the Administrator who made it, and the time.
- **The revision.** A one-row table holds a revision counter. A save writes the setting, its history row and the revision's increment in one transaction. The row lock on the revision orders the commits, so a check never misses a change. `max(updated_at)` or a sequence could miss one, when a transaction stamped earlier commits after a check.
- The existing switches (`AUTOMATIC_JUDGEMENT`, `SAME_EVENT_AI_CHOICE` and the rest in `main-server/src/common/settings.ts`) stay env vars.

### The in-memory copy in each pod

- At start (`onModuleInit`, the way `PlaceLookup` loads the Places), each main-server pod loads every `settings` row and the revision into memory. A pod that cannot load them does not start. Readiness already needs the database (`/health/ready` pings it).
- Every minute at second 0 (`@Cron('0 * * * * *')`, with `@nestjs/schedule`, which main-server does not use yet), every pod reads only the revision, and reloads all rows when it has changed. The pods' clocks come from their nodes, so they check at the same second and switch together. The pod that saved waits for the minute like the others. A failed check keeps the last copy and logs.
- Each read of a setting comes from the copy, with no query.
- Why not Redis: production's Redis has no volume, so the database stays the source of truth anyway. A Redis copy would be a second store to keep in step, with a fallback for when it is empty. The in-memory copy costs one tiny query per pod per minute, however many settings are added later.
- Example, with 2 pods switching from OpenRouter to Anthropic: at 14:00:20 an Administrator saves on pod A, and the revision goes from 7 to 8. The page shows "applies at 14:01:00". Both pods keep OpenRouter. At 14:01:00 both read revision 8, reload, and use Anthropic from then on.

### Keys

- The keys stay env vars from Secret `secrets`. `OPENROUTER_API_KEY` is unchanged. `ANTHROPIC_API_KEY` comes from A01's `/snunow/production/anthropic-api-key` parameter, through A01's line in `release.sh` (`origin/3.0/A01-02-deployment-and-docs`). The deploy role already reads that parameter through its existing `GetParametersByPath` call on `/snunow/production`, so Terraform is not changed and the running servers still have no AWS access.
- The Release fails when a parameter it reads is missing, so `anthropic-api-key` must be in Parameter Store before the first Release that carries ticket 03.
- Saving a provider whose key is empty is refused.
- Replacing a key's value is a Release, as for any secret. Key values never reach the database, the admin site or a log.
- The Dev Server keeps both keys in its env file; `ANTHROPIC_API_KEY` is optional there.

### The model port

- `adapter.ts` stays the one file that knows the model library (ADR 0005). It carries A01's Anthropic model factory beside `openRouterModel`.
- A01 bound `MODEL_PORT` once, at start-up, from `MODEL_PROVIDER`. A02 replaces that: both models are built at start from the env keys (a provider without a key has none), and each answer of the chat and each Judgement reads `llm.provider` once, at its start, and uses that provider's model for all its calls. The same-event choice does the same per call. `MODEL_PROVIDER`, `ANTHROPIC_MODEL` and the server's use of `ASSISTANT_MODEL` go. Each provider's model is a constant in code: `claude-haiku-5-5` for Anthropic and `anthropic/claude-haiku-5.5` for OpenRouter.
- A call whose provider has no key fails with 503, as a call with no key does today.
- The server refuses to start when the Assistant or the Judgement is on and neither key is set.
- On Anthropic, as A01 measured: the chat puts an explicit cache breakpoint at the end of the system prompt and caches the conversation automatically; the Judgement and the same-event choice put one breakpoint at the end of their constant instructions; every call sends effort `medium` and no sampling parameters. A01's experiment chose `breakpoints` as the mode: the chat's turn cost 85% less than with no caching. `MODEL_CACHE` stays, for the evals' `--cache`.
- On OpenRouter, today's options stay (`data_collection: 'deny'`, and `require_parameters: true` for the Judgement and the same-event choice).
- A call that fails with 429 or 529 is retried once, at the model call, within the message's time limit. A 429 that names a spend limit is not retried.
- Each model call logs one line with the provider and the outcome. Never a key, never the request's content.

### The admin page "Settings"

- A new page at `admin/src/app/(signed-in)/settings/page.tsx`, and an entry "Settings" in `SECTIONS` in `site-menu.tsx`. It is generic over the registry: it lists every registered setting.
- Each row has the setting's value, an input for its type and allowed values (a select for `llm.provider`), and a save with a confirmation.
- After a save, the row shows "applies at HH:MM:00" (the next minute), and "applied" once that time has passed.
- The history lists who changed what, when, and the old and new value, newest first.
- The main server serves it under `admin/settings`, guarded like the other admin routes. Any Administrator may change any setting.

### Deployment and documentation

- Production first; the Dev Server only gains the optional `ANTHROPIC_API_KEY`.
- After the merge `llm.provider` has no row, so the AI uses OpenRouter. Switching to Anthropic needs the `anthropic-api-key` parameter and one Release first.
- ADR 0013, carried from A01 and rewritten: the AI's provider is chosen on the admin site, from the two env keys. ADR 0005 is marked superseded on the provider only.
- README, `main-server/README.md` and `infra/production/README.md` describe the settings, the Settings page and the Anthropic key.

### Steps only a person can do

- Put `/snunow/production/anthropic-api-key` once, then release (ticket 03).
- 안진영 approves the baseline's cost before any run (ticket 05).

## Testing Decisions

- Tests follow ADR 0007's levels.
- Unit: the registry's checks (type and allowed values, an unregistered name); the refusal of a provider without a key; the log line holds no key.
- Integration: the setting, its history row and the revision saved in one transaction; the start-up load; the minute check reloading on a new revision and not otherwise; a failed check keeping the last copy; a save not used before the minute; each answer and each Judgement keeping the provider read at its start when the copy changes during it; the admin routes (save, refusal, history).
- The model port's requests are checked through a fake `fetch`, as A01 did (`anthropic-requests.integration.test.ts`): the Anthropic path carries the breakpoints and effort and no sampling parameters.
- The admin page has a test of its "applies at" and "applied" labels.
- Release: `release.bats` covers the `anthropic-api-key` line.
- No test calls a real model. The real checks are one answer on each provider after the switch in production, and the baseline (ticket 05).
- The baseline, after 01 to 04 are merged and released: P19 and the P5 small world (`--world p5`) on both providers; the P5 large world (`--world large-world-v1`), P6 and the collection evaluations on Anthropic only; no P4. The estimate is about USD 3.5, and 안진영 approves it again before any run. Each run records its provider and caching mode, beside the last OpenRouter run of each suite.

## Out of Scope

- Managing keys on the admin site (a key list, health checks, a backup key).
- A statistics dashboard, a per-request usage table, or reading usage from the providers' dashboards or admin keys. The log line is the only record of which provider served a call.
- Choosing the model, the effort or the limits on the admin site. Only the provider is chosen.
- Moving the existing env switches (`AUTOMATIC_JUDGEMENT` and the rest) into the settings table.
- Removing OpenRouter, its key or its parameter.
- The evals' keys.
- Moving the current time out of the system prompt so that production caches across messages (A01's TODO).

## Further Notes

- **Where A01's code is.** `origin/3.0/A01-01-anthropic-model-port` (the model port, the adapter, the provider failures, settings, eval flags and their tests), `origin/3.0/A01-02-deployment-and-docs` (release, k8s, READMEs, ADR 0013) and `origin/3.0/A01-04-caching-modes` (`caching-experiment.md`). They branch from 3.0/Main, so each ticket brings the named files by hand onto 4.0/Main, not by a merge.
- **A01's P19 run on Anthropic** (57/64, USD 0.085) is pushed to its old branch as a record before #210 is closed.
- **The review.** 윤유상's review of PR #248 (2026-11-15) narrowed A02 and answered its three open questions: there is no copy job, so it lives nowhere; nothing writes Redis; and keys stay in Secret `secrets`, so the deploy role and Terraform are not changed.
- **Facts checked in the code on 2026-11-15 (origin/4.0/Main).** main-server has no scheduler; `@nestjs/schedule` is in worker-server, which runs the `@Cron` jobs (match-server lists it in its `package.json` but runs no job). Production runs 2 main-server replicas. There is no settings table. `PlaceLookup` loads the Places in `onModuleInit`. `/health/ready` pings the database and Redis. Secrets reach main-server only as env vars from Secret `secrets`. The deploy role may call `GetParametersByPath` on `/snunow/production`, which returns `anthropic-api-key` as a direct child, and `release.sh` fails a Release when a parameter it reads is missing.
- **Order.** 01 and 03 start at once. 02 starts after 01. 04 starts after 01 and 02. 05 is last.
