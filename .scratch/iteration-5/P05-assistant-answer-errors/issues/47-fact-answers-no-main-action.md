# 47: An answer that only tells a fact has no main action

Parent: [P05 spec](../spec.md); the user's phone: an hours answer shows "길 안내" as the dock's main button, and he asks whether that is needed
Status: ready-for-human
Blocked by: nothing on the server; the app reads the field in P04 ticket 55

Native files: none. Releases: the main server, with the app's P04 ticket 55.

## What happened

- An hours answer and "X 어디야?" are both a `place` Lookup with a `guide` action, so the app cannot tell them apart. It shows "길 안내" as the dock's main button for both.

## What changes

- `Lookup` gains `fact?: true` (`assistant/dto/lookup.dto.ts`, beside `note`), set on a Restaurant's hours (`hours-lookup.ts`) and on its menu (`menu-lookup.ts`). The app shows no main button in the dock when it is set.
- `actions` stay as they are, so the Restaurant's own card still offers the way. Every other Lookup leaves `fact` out, and older apps ignore it.

## Acceptance criteria

- [x] `fact: true` on an hours answer and a menu answer, with their `guide` kept. (Unit tests.)
- [x] No `fact` on a way, "X 어디야?", a pressed building's card, a way by the shuttle, or a study answer. (Unit tests.)
- [x] README; whole lint and types of the main server.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 15 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 10 million, almost all cache reads; output about 8,000. No subagents. Measured roughly from the session's transcript at the time of the pull request.
