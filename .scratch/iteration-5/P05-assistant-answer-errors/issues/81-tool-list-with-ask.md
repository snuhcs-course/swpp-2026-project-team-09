# 81: The study-room test's tool list holds askPastTime

Parent: [P05 spec](../spec.md). Found on 2026-11-28: `5.0/Main`'s push run 46111498072 went red after #742 (ticket 80).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: nothing; a test alone.

## What was wrong

Ticket 80 gave every app the chat's `askPastTime` tool. `assistant-study-room.integration`'s "An app that does not draw answers › is given today's tools and rules, without the study tool" pins the exact list of tools such an app is given. It got 23 tools where it expected 22. A PR's own CI run does not run that file, so only Main's run failed.

## Fix

`askPastTime` is added at the end of the expected list, where the chat feature registers it.

## The class

Every test under `main-server/test` that reads the tools given to the model or the system prompt was read:

- **Exact list pins:** only `assistant-study-room` pins an exact list.
- **Relative checks:** `assistant-study-area`, `assistant-study-plan`, `assistant-study-group-rules` and `assistant-study-plan-rules` compare one app's tools or prompt with another's built in the same run, so both hold the tool and the line.
- **Single tools:** `assistant-day`, `assistant-events`, `assistant-interests` and `assistant-recruiting` check tools with `arrayContaining`, `toContain` or `not.toContain`. `assistant-left-out-class` reads the tools one at a time.
- **Prompt pins:** `assistant-cached-prefix` pins the per-request lines and already holds the Past times line (ticket 80).
- **No count pins:** no test pins the number of tools.

## Acceptance criteria

- [x] `assistant-study-room.integration` passes, 6 of 6; on `5.0/Main` it fails.
- [x] The files of the class above pass, run one at a time (listed in the PR).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 10 minutes (an estimate), in one session.
- Tokens: not measured apart; a small share of the session of ticket 80.
