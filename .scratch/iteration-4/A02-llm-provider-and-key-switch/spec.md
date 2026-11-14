# A02: An Administrator switches the AI's provider and key on the admin site

Status: ready-for-agent

Schedule row: Iteration 4, A2, "LLM provider and key switch from the admin site". Owner: 안진영. Reviewer: 윤유상. Spec drafted 2026-11-15 from a grilling session in which 안진영 (PM) settled every decision below.

This spec supersedes Iteration 3's A01 ([its spec](../../iteration-3/A01-openrouter-to-claude-console/spec.md)) and its open pull requests #210 (the model port), #207 (deployment and docs) and #217 (the caching experiment). They are closed after this spec's pull request is up, and their code is carried into A02's tickets, which name the files to bring.

References:
- ADR 0005 (the Assistant runs in the main server on a thin model library) and ADR 0007 (test levels).
- ADR 0013 on `origin/3.0/A01-02-deployment-and-docs` (the Assistant calls Claude through the Anthropic API). It was never merged; ticket 05 brings it in, rewritten for A02.
- `.scratch/iteration-3/A01-openrouter-to-claude-console/caching-experiment.md` on `origin/3.0/A01-04-caching-modes`: what each caching mode costs.

## Problem Statement

Every model call of the main server goes through OpenRouter: the chat Assistant, the Judgement of collected posts, and the same-event choice. The provider and the key are fixed when the server starts, from `OPENROUTER_API_KEY` and `ASSISTANT_MODEL`. Changing either one means a new Secret and a Release, which only a person with AWS access can do.

Iteration 3's A01 moved the calls to the Anthropic API behind a start-up setting, `MODEL_PROVIDER`. Its measurements were good: on P19 the Anthropic path passed 57 of 64 cases, against 56 to 59 on OpenRouter, for USD 0.085 against 0.53, because the Anthropic path caches the prompt. But it still needed a Release for every switch. A key that runs out of credit, hits a spend limit or is revoked stops the Assistant until someone deploys again, and nobody on the admin site can see which key is in use.

## Solution

Keys live in Parameter Store under `/snunow/production/llm-keys/<name>`, and one more parameter, `/snunow/production/llm-key-names`, lists their names. A `keys` Release reads the list and fetches each key by its exact name, with the permissions the deploy role already has, and copies the keys into a Kubernetes Secret, which is mounted into the main server as one file per key. Terraform and the deploy role are not changed. The running server never gets AWS access. A script puts a key, adds its name to the list and pushes the Release's tag in one step.

A new `settings` table holds the settings Administrators change at run time, with a history of every change. Once a minute, a job in the main server copies the settings and the list of mounted keys (names and facts, never the key values) into Redis. Every model call reads the chosen key's name from Redis, or from the database when Redis is empty, and the key's value from its mounted file. The provider follows from the key's prefix. The model of each provider is fixed in code.

The admin site gets an "AI settings" page. It lists the keys, checks a key with three small calls before it may be chosen, switches the key, sets an optional backup key, and shows the history and whether the last change is "waiting" or "applied". All Administrators may switch.

With a backup key set, three key-type failures in a row switch to it on their own. There is no automatic switch back. Without a backup key, the page only warns.

The Anthropic path keeps A01's design: an explicit cache breakpoint after the constant part of each prompt, automatic caching for the chat's conversation, effort `medium`, and one retry on an overload.

After the merge nothing changes for Users: the chosen key is the existing OpenRouter key, listed as `default`. The Dev Server keeps its key in its env file.

## User Stories

### Using the app

1. As a User, I want the Assistant to answer as it does today after the merge, so that the change is invisible until an Administrator switches.
2. As a User, I want the Assistant to keep working when a key runs out, so that a spend limit does not stop my answers.
3. As a User, I want a momentary overload of the model to be retried once, so that I do not get an error when a retry would have worked.

### Administering

4. As an Administrator, I want to see every key the server holds, with its name, provider, last 4 characters and the date it was added, so that I know which key is which without seeing its value.
5. As an Administrator, I want a key added in the last 7 days marked NEW, so that I notice a key someone just put.
6. As an Administrator, I want to check a key before I choose it, so that I never switch to a key that does not work.
7. As an Administrator, I want to switch the key the AI uses, so that I can move to another provider or account without a Release.
8. As an Administrator, I want to set a backup key, so that the AI moves to it on its own when the chosen key fails.
9. As an Administrator, I want to see whether my change is still waiting or already applied, so that I know when the servers use it.
10. As an Administrator, I want a history of every change, with who made it, when, and whether it was automatic, so that I can tell what happened after an incident.
11. As an Administrator, I want a warning when the chosen key keeps failing, so that I can act when there is no backup key.

### Running the service

12. As the operator, I want keys to live only in Parameter Store and in a Secret, so that a key never sits in git, in the database, in Redis or in a log.
13. As the operator, I want one script that puts a key and pushes the `keys` Release, so that adding a key is one command.
14. As the operator, I want the running servers to have no AWS access, so that a compromised pod cannot read Parameter Store.
15. As the operator, I want each model call's log line to name the provider and the key's name, so that I can tell which key served a request.
16. As the operator, I want the Dev Server to keep its env key, so that A02 needs no change there.

### Measuring

17. As an evaluator, I want the evals to keep their local `.env` keys and their `--provider` flag, so that a run never depends on the admin site.
18. As an evaluator, I want a new baseline on both providers, recorded beside the last OpenRouter runs, so that later work is compared with the path production may use.

## Implementation Decisions

### The settings store

- A new Prisma model, `Setting`, on table `settings`: `name` (unique), `value_type` (an enum, `SettingValueType`: `STRING`, `INTEGER`, `BOOLEAN`), `value` (text), and `updated_at`. The value is checked against its type when it is saved and when it is read. It is generic: A02 adds two names, and later features can add more without a migration.
- A02's settings:
  - `llm.key`: the name of the chosen key. With no row, it is `default`.
  - `llm.backupKey`: the name of the backup key, or empty.
- A new model, `SettingChange`, on table `setting_changes`: the setting's name, the old and the new value, the Administrator who made it (empty for an automatic change), the cause (`ADMINISTRATOR` or `AUTOMATIC_SWITCH`) and the time. Each change writes the setting and its history row in one transaction.
- The existing switches (`AUTOMATIC_JUDGEMENT`, `SAME_EVENT_AI_CHOICE` and the rest in `main-server/src/common/settings.ts`) stay env vars. Moving them is out of scope.

### The one-minute copy to Redis

- A job in the main server runs every minute (`@nestjs/schedule`, which main-server does not use yet; worker-server does). It copies into Redis:
  - every row of `settings`;
  - the list of mounted keys: for each, its name, provider, last 4 characters and added date. Never its value;
  - the time of the copy.
- Redis is written by this job only. Saving a setting writes the database and nothing else, so a change reaches the servers at the next copy, within about a minute. The admin page shows this as "waiting" until the copy carries it, then "applied".
- Production runs 2 main-server replicas, so the job runs on both. The copy is idempotent (the same values, written whole), so two copies do no harm.
- Redis is ioredis through the global `REDIS` token (`main-server/src/common/redis.module.ts`). Production's Redis has 1 replica and no volume, so its copy is lost on a restart. A read that finds Redis empty reads the database, until the next copy.
- **Open question for the reviewer:** the job could live in worker-server instead, which owns the scheduled jobs today and runs 1 replica. The spec places it in main-server because main-server is the pod that has the key files mounted. The PR asks 윤유상 to choose.

### Keys

- In Parameter Store, a key is a SecureString at `/snunow/production/llm-keys/<name>`. A name is lowercase letters, digits and hyphens, at most 40 characters.
- `/snunow/production/llm-key-names` is a StringList that names the keys the Release syncs. A key whose name is not on the list is not synced.
- The provider is read from the key's prefix: `sk-ant-` is Anthropic, `sk-or-` is OpenRouter. A key with another prefix is listed as unknown and cannot be chosen.
- The added date is the parameter's `LastModifiedDate`. Putting a new value under an existing name makes the key NEW again.
- The existing `/snunow/production/openrouter-api-key` stays where it is and still reaches the pod as `OPENROUTER_API_KEY` through Secret `secrets`. The server lists it as the key `default`, so that nothing changes after the merge.
- On a server with no mounted keys (the Dev Server, a local run), the list holds the env keys: `OPENROUTER_API_KEY` as `default` and, when it is set, `ANTHROPIC_API_KEY` as `default-anthropic`.
- The key values stay in the pod: on the mounted files and in process memory. They are never written to the database, to Redis, to a log or to the admin site.

### The `keys` Release

- A tag `snunow/keys/YY.MM.DD-N` starts a `keys` Release. `.github/release/release.sh`'s `check-name` accepts only `main-server|socket-server|worker-server|match-server|admin|app|all` today, so `keys` is added, with an output that says the Release syncs keys. It deploys no server and no app. `all` does not include `keys`.
- The Release reads `llm-key-names` from the call the other Releases already make (`aws ssm get-parameters-by-path --path /snunow/production`, which returns the folder's direct children). It then fetches each named key by its exact name (`aws ssm get-parameters --names … --with-decryption`, at most 10 names per call). It writes one file per key and one `added.json` (name to added date), and applies them as a Secret named `llm-keys`.
- When the list names a key that is not in Parameter Store, the Release fails before it changes anything, and its log names the missing key. The Secret stays as it was. An empty list is allowed and empties the Secret. The Secret has a fixed name, not a generated one with a hash, so that applying it changes the mounted files without restarting the pods. The release's `clean` step only deletes Secrets named `secrets-<hash>`, so it leaves `llm-keys` alone.
- Removing a key takes its name off the list. The next `keys` Release leaves it out of the Secret.
- `main-server.yaml` mounts `llm-keys` as a read-only volume at `/var/run/llm-keys`, with `optional: true`, so that a pod starts before the first `keys` Release. The kubelet refreshes the files within about a minute of the apply; the copy to Redis picks them up at its next run.
- The deploy role's trust already accepts any tag under `snunow/*`, so `keys` tags need no change there.
- `infra/production/put-llm-key.sh <name>` (run by a person with AWS access) does three things: it reads the key with `read -rs`, refuses an empty value or a bad name, and puts the SecureString; it adds the name to `llm-key-names` (once); and it creates and pushes the next `snunow/keys/YY.MM.DD-N` tag. With `--remove <name>`, it takes the name off the list first, then deletes the parameter, then pushes the tag, so that the list never names a deleted key.

### The deploy role's permission

The deploy role (`infra/production/terraform/deploy_role.tf`) is not changed. It may call `ssm:GetParametersByPath` on `/snunow/production` only (checked against the exact path asked for), which returns `llm-key-names` as a direct child. It may call `ssm:GetParameters` on `/snunow/production/*`, which covers each key fetched by its exact name. So no IAM change is needed, no new secret becomes readable, and the running servers still have no AWS access.

The rejected alternative was to add `/snunow/production/llm-keys` as one more read-only resource of the `GetParametersByPath` statement, applied with `terraform apply`. It would have let the Release list the folder without a names list, but it changes IAM, and no IAM change is wanted.

### The model port

- `adapter.ts` stays the one file that knows the model library (ADR 0005). It carries A01's Anthropic model factory beside `openRouterModel`.
- A01 bound `MODEL_PORT` once, at start-up, from `MODEL_PROVIDER`. A02 replaces that: the port takes the provider and the key for each call, from the cached settings and the mounted key files. `MODEL_PROVIDER`, `ANTHROPIC_MODEL` and the server's use of `ASSISTANT_MODEL` go. Each provider's model is a constant in code: `claude-haiku-5-5` for Anthropic and `anthropic/claude-haiku-5.5` for OpenRouter.
- A model built for a key is kept in memory while the key's name and value stay the same, so a call does not rebuild the provider.
- On Anthropic, as A01 measured: the chat puts an explicit cache breakpoint at the end of the system prompt and caches the conversation automatically; the Judgement and the same-event choice put one breakpoint at the end of their constant instructions; every call sends effort `medium` and no sampling parameters. A01's experiment chose `breakpoints` as the mode: the chat's turn cost 85% less than with no caching. `MODEL_CACHE` stays for the evals' `--cache`.
- On OpenRouter, today's options stay (`data_collection: 'deny'`, and `require_parameters: true` for the Judgement and the same-event choice).
- A call that fails with 429 or 529 is retried once, at the model call, within the message's time limit. A 429 that names a spend limit is not retried.
- Each model call logs one line with the provider, the key's name and the outcome. Never the key, never the request's content.
- The server refuses to start when the Assistant or the Judgement is on and no key at all is available. A call whose chosen key has gone missing uses the backup key if it is set and present, and otherwise fails as a call with no key does today (503).

### The backup key

- Key-type failures are: an invalid or revoked key (401, 403), a spend limit (Anthropic's 400 for the account's limit or 429 `enforced_spend_limit_reached`; OpenRouter's 402), and a 429 that is still there after the retry. An overload (529), a time-out or a network error is not key-type.
- Failures are counted per key in Redis, across replicas, and a success resets the count.
- When the chosen key's count reaches 3 and a backup key is set: `llm.key` becomes the backup key and `llm.backupKey` becomes empty, with a `SettingChange` row whose cause is `AUTOMATIC_SWITCH`, and a warning log line. The switch reaches the servers at the next copy. There is no automatic switch back.
- With no backup key, the count only raises a warning on the AI settings page and in the log.

### The admin page "AI settings"

- A new page at `admin/src/app/(signed-in)/ai-settings/page.tsx`, and an entry "AI settings" in `SECTIONS` in `site-menu.tsx`. All Administrators are equal: any of them may switch.
- The main server serves it under `admin/ai-settings`, guarded like the other admin routes.
- **The key list**: name, provider, last 4 characters, added date, NEW for a key added in the last 7 days, and which key is chosen and which is the backup.
- **The health check**: three calls through the key: a short reply, one tool call, and on Anthropic a cache read (the same prompt twice, the second reading the first's cache). A key may be chosen, as the key or as the backup, only after a check that passed for its current value (its name and added date). The result is kept in a small table, `LlmKeyCheck`, with who ran it and when.
- **The switch** and **the backup key**: each is one save, with a confirmation.
- **The state**: for each setting, "waiting" while the database's value differs from Redis's copy, and "applied" once the copy carries it, with the copy's time.
- **The history**: the `SettingChange` rows, newest first.
- **The warning**: when the chosen key has key-type failures in a row, or was switched automatically.

### Deployment and documentation

- Production only. The Dev Server keeps `OPENROUTER_API_KEY` in its env file and gains nothing it must set.
- After the merge, `llm.key` has no row, so the AI uses `default`, the existing OpenRouter key. Switching to Anthropic is an Administrator's step after the first `keys` Release.
- ADR 0013, carried from A01 and rewritten: the Assistant calls Claude through either provider, chosen at run time on the admin site, from keys synced from Parameter Store. ADR 0005 is marked superseded on the provider only.
- README, `main-server/README.md` and `infra/production/README.md` describe the keys, the script, the `keys` Release, `llm-key-names` and the AI settings page.

### Steps only a person can do

- Creating `llm-key-names` the first time, through the script (ticket 03).
- Putting keys with the script, and pushing `keys` tags (ticket 03).
- 안진영 approving the baseline's cost before any run (ticket 05).

## Testing Decisions

- Tests follow ADR 0007's levels.
- Unit: the provider from a key's prefix; the key list from a folder and from env keys; what counts as a key-type failure; the third failure switching and the second not; no switch without a backup key; the log line has no key; `check-name` for `keys` tags; the script's name and empty-value checks.
- Integration: the settings store writes a setting and its history in one transaction; the copy job fills Redis; a read with Redis empty falls back to the database; a call uses the key named in Redis's copy; a switch saved in the database is not used before the next copy; the automatic switch writes its history row; the admin routes refuse a switch to an unchecked key and accept a checked one.
- The model port's requests are checked through a fake `fetch`, as A01 did (`anthropic-requests.integration.test.ts`): the Anthropic path carries the breakpoints and effort and no sampling parameters, and the key sent is the chosen key.
- The admin page has a test of its state labels and of the disabled switch for an unchecked key.
- Release: `release.bats` covers `check-name` for `keys`, the writing of the key files, and the failure, before anything is written, when the list names a missing key; the script's test covers keeping the list in step; `infra/production/k8s/test/targets.sh` covers the mount.
- No test calls a real model. The real checks are a health check of each real key after the first `keys` Release, and the baseline (ticket 05).
- The baseline, after 01 to 04 are merged and released: P19 and the P5 small world (`--world p5`) on both providers; the P5 large world (`--world large-world-v1`), P6 and the collection evaluations on Anthropic only; no P4. The estimate is about USD 3.5, and 안진영 approves it again before any run. Each run records its provider and caching mode, beside the last OpenRouter run of each suite.

## Out of Scope

- A statistics dashboard, a per-request usage table, or reading usage from the providers' dashboards or admin keys. The log line is the only record of which key served a call.
- Choosing the model, the effort or the limits on the admin site. Only the key (and so the provider) is chosen.
- Moving the existing env switches (`AUTOMATIC_JUDGEMENT` and the rest) into the settings table.
- Removing OpenRouter, its key or its parameter.
- An automatic switch back to the first key.
- The Dev Server's keys, and the evals' keys.
- Moving the current time out of the system prompt so that production caches across messages (A01's TODO).

## Further Notes

- **Where A01's code is.** `origin/3.0/A01-01-anthropic-model-port` (the model port, the adapter, the provider failures, settings, eval flags and their tests), `origin/3.0/A01-02-deployment-and-docs` (release, k8s, READMEs, ADR 0013) and `origin/3.0/A01-04-caching-modes` (`caching-experiment.md`). They branch from 3.0/Main, so each ticket brings the named files by hand onto 4.0/Main, not by a merge.
- **A01's P19 run on Anthropic** (57/64, USD 0.085) is pushed to its old branch as a record before #210 is closed.
- **Facts checked in the code on 2026-11-15 (origin/4.0/Main).** main-server has no scheduler; `@nestjs/schedule` is in worker-server, which runs the `@Cron` jobs on 1 replica (match-server lists it in its `package.json` but runs no job). Production runs 2 main-server replicas. Redis has 1 replica and no volume. There is no settings table. Secrets reach main-server only as env vars from Secret `secrets` (generated with a hash, `secrets-<hash>`), and nothing is mounted as a file. The deploy role's trust accepts tags under `snunow/*`, and its permissions already cover the names list and each key by name.
- **Order.** 01 and 03 start at once. 02 starts after 01. 04 starts after 01, 02 and 03. 05 is last.
