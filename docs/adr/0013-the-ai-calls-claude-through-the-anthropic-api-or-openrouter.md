---
status: accepted
---

# The AI calls Claude through the Anthropic API or OpenRouter, with the key chosen on the admin site

From Iteration 4 (A02), every model call of the main server, the chat Assistant's, the Judgement's, the same-event choice's and the topics reading's, goes either to the Anthropic API directly or through OpenRouter. Which one is decided by the AI's key: the global setting `llm.key` names one of the keys the server holds, and an Administrator chooses it on the admin site's Settings page. The key's prefix tells its provider (`sk-ant-` is Anthropic, `sk-or-` OpenRouter). The model is Claude Haiku 5.5 on both, a constant in code (`claude-haiku-5-5` and `anthropic/claude-haiku-5.5`), so only the path to it changes. `adapter.ts` stays the one file that knows the model library, as [ADR 0005](0005-assistant-in-the-main-server-without-an-agent-framework.md) decided; this ADR supersedes that ADR's choice of OpenRouter only.

The keys stay where secrets are: `OPENROUTER_API_KEY`, from `/snunow/production/openrouter-api-key`, is the key named `default`, and every `/snunow/production/llm-key-<name>` parameter reaches the server as one entry of `LLM_KEYS` in Secret `secrets`. A Release hands the server its keys; the admin site only chooses among their names. Each pod reloads the setting at the next minute, and each answer and each Judgement reads it once, at its start, so one answer never mixes two keys.

We call Anthropic directly when it is chosen, for A01's three reasons:

- **One platform per message.** OpenRouter routes `anthropic/claude-haiku-5.5` by weighted random choice over several platforms (Anthropic, Claude Platform on AWS, Amazon Bedrock, Google Vertex, Azure), and only a request with `cache_control` sticks to one. One message of ours is a loop of several model calls, and Haiku 5.5's thinking blocks belong to the conversation that produced them, so a step served by another platform may lose the earlier step's reasoning without an error.
- **Prompt caching.** We send no `cache_control` through OpenRouter, so its calls read and write no cached tokens, while input is over 90% of a chat turn's cost. On the Anthropic API the constant part of each prompt is cached behind an explicit breakpoint, and the chat's growing conversation automatically, at a tenth of the input price on a read. A01's experiment measured a P19 turn at USD 0.0011 under `breakpoints`, against 0.0072 with no caching (`.scratch/iteration-3/A01-openrouter-to-claude-console/caching-experiment.md`). Caching changes cost and latency, never the output.
- **One account fewer** on the path, with the team's monthly spend limit in the Claude Console.

We keep OpenRouter beside it, and make the choice a setting rather than a start-up value, for one more reason:

- **A switch without a Release.** When a key runs out of credit or hits its spend limit, every AI feature stops. Only a person with AWS access can release, so a start-up setting kept the Assistant down until one was found. An Administrator can now choose another key on the admin site, and every pod uses it from the next minute.

Both paths serve the same model snapshot with the same system prompt, tools and limits, so a switch is not expected to change what a User sees. The baseline (A02 ticket 05, `main-server/eval/a02-baseline.md`) ran P19 on both paths, and the P5 small and large worlds, P6 and evaluations A and B on the Anthropic path; the P5 small world's OpenRouter run was interrupted and not repeated, so its last OpenRouter run (`40cb60e5`) stands beside it.

## Considered Options

- **A01's start-up setting, `MODEL_PROVIDER`.** Simple, but a switch needs a Release, which is what A02 removes.
- **One key per provider** (`ANTHROPIC_API_KEY` beside `OPENROUTER_API_KEY`). It could not hold a second key for the same provider, such as a team member's key while the first one's credit is refilled. Keys by name can, and a key's provider follows from its value.
- **A Redis copy of the settings, kept by a copy job.** Production's Redis has no volume, so the database stays the source of truth anyway, and the copy is a second store to keep in step. Each pod reads a one-row revision every minute instead and reloads when it changed.
- **Keys managed on the admin site** (added, replaced or seen there, stored in the database). Keys would then sit in the database and pass through the admin site, and the running servers or the site would need to write secrets. Keys stay in Parameter Store and Secret `secrets`, and the admin site sees only their names and providers.

## Consequences

- After the merge `llm.key` has no row, so the AI uses `default`, the OpenRouter key, until an Administrator chooses another. Using an Anthropic key needs its `llm-key-<name>` parameter and one Release first (`infra/production/README.md`, "The AI's keys").
- Adding, removing or replacing a key is still a Release; switching between keys is not.
- With no router to fail over to another platform on the Anthropic path, a call that fails with 429 or 529 is retried once on either path, within the message's time limit, unless the 429 names a spend limit.
- Each model call logs the key's name and its provider, never its value, so the logs tell which path served a request.
- The evaluations keep their own keys in `main-server/.env` and their `--provider` flag; they never read `llm.key`. Runs on the two paths are different conditions: each run records its provider and caching mode, and is compared with a run on the other path only when it says so.
- The breakpoint ends the system prompt's stable part: the tools, the rules, and the campus short names. The current time, which changes every minute, is a second system message after it, so that requests of different Users and minutes share the cache (P15 ticket 51, 2026-11-18). Before that, the time sat inside the cached part, and production read the cache only within the minute it was written.
