---
status: accepted
---

# The Assistant calls Claude through the Anthropic API, not OpenRouter

From Iteration 3 (A01), every model call of the main server, the chat Assistant's, the Judgement's and the same-event choice's, goes to the Anthropic API directly, with the Vercel AI SDK's Anthropic provider and a key from 안진영's Claude Console account. The model stays Claude Haiku 5.5 (`claude-haiku-5-5`), so only the path to it changes. `adapter.ts` stays the one file that knows the model library, as [ADR 0005](0005-assistant-in-the-main-server-without-an-agent-framework.md) decided; this ADR supersedes that ADR's choice of OpenRouter only.

We chose it for three reasons:

- **One platform per message.** OpenRouter routes `anthropic/claude-haiku-5.5` by weighted random choice over five platforms (Anthropic, Claude Platform on AWS, Amazon Bedrock, Google Vertex, Azure), and only a request with `cache_control` sticks to one. One message of ours is a loop of several model calls, and Haiku 5.5's thinking blocks belong to the conversation that produced them, so a step served by another platform may lose the earlier step's reasoning without an error. We could not show that it happens, but it makes the Assistant and our eval results less repeatable than they need to be.
- **Prompt caching.** We sent no `cache_control` through OpenRouter, so every eval run read and wrote no cached tokens, while input was 93% of a run's cost (P05 R1: 40M input tokens, USD 4.29). On the Anthropic API the constant part of each prompt (the chat's tools and system prompt, the Judgement's and the same-event choice's instructions) is cached behind an explicit breakpoint, and the chat's growing conversation automatically, at a tenth of the input price on a read. Caching changes cost and latency, never the output.
- **One account fewer.** OpenRouter put a second account, key, credit, set of terms and outage between us and the model. The Anthropic account has one monthly spend limit, which 안진영 sets in the Console (`infra/production/README.md`).

Both paths serve the same model snapshot with the same system prompt, tools and limits, and neither adds a system prompt of its own, so the switch is not expected to change what a User sees. Every eval suite runs once on the new path, and that run is the new baseline.

## Considered Options

- **Stay on OpenRouter and send `cache_control`.** It would cache and pin each request to one platform, but keep the second account and its terms, and still let different messages land on different platforms.
- **OpenRouter with its provider order fixed to Anthropic.** It narrows the routing but keeps the router, its account and its fallbacks, which are what we wanted to remove.

## Consequences

- OpenRouter stays selectable until Iteration 4: `MODEL_PROVIDER=openrouter` rolls back with one setting, with its own key (`OPENROUTER_API_KEY`) and model id (`ASSISTANT_MODEL`), so one provider's id is never sent to the other. Its code, key and Parameter Store entry go in Iteration 4.
- With no router to fail over to another platform, a model call that fails with 429 or 529 is retried once, within the message's time limit.
- Runs on the two paths are different conditions: each eval run records its provider and caching mode, and is compared with a run on the other path only when it says so.
- Production keeps missing the cache between messages, because the system prompt holds the current time to the minute. Moving the time out of it is left for later, since it changes what the model reads.
