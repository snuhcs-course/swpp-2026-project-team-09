# 16: The app sends `study-group`

Parent: [P10 spec](../spec.md) § With Friends ("Two capabilities")
Status: ready-for-agent
Blocked by: 09 to 15; a Release that carries the server's ticket 07 (PR 643) live in Production. This is the last pull request of the group study room.

Native files: none. Releases: an app OTA update, only after the Production server accepts `study-group`.

## What to build

- `ANSWER_CAPABILITIES` (`mobile/src/api/capabilities.ts`) gains `study-group`, and only it. `study-plan`, the ranked list alone, gets its own switch later.
- **Order of release:**
  - The server lists the capabilities it knows and answers 400 to any other.
  - The app sends the list with every `POST /assistant/messages`, `POST /assistant/answers` and `POST /plans`.
  - So an app with `study-group` against a server without it would fail every Assistant call. This ticket ships only after the server's ticket 07 is in Production.
  - Older apps are not affected: they do not send it.

## Acceptance criteria

- [x] `ANSWER_CAPABILITIES` has `study-group` and not `study-plan`. (Unit test.)
- [x] "같이 공부할 자리 있어?" gets the group answer from the mock server. "공부할 자리 있어?" alone still gets today's seat ticket. (Unit test of the mock's reply: the mock answers the words together before the library's words.)
- [ ] The Production server's capability list includes `study-group` before the OTA (checked at the release). The server side, #643, is in the Release `snunow/all/26.11.27-10`.
- [x] A group answer shown as one step of several requests has its main button: `stepActionOf` asks the group card's act as `libraryActOf` does (a point from #655's review). (Integration test.)
- [x] Whole lint, format and types.

## How it is built

- `ANSWER_CAPABILITIES` gains `study-group`; the tests' list of what every request sends (`__tests__/support/capabilities.ts`) with it.
- **A fault found on the way:** the app read a reply's steps only of the kinds `seat`, `room`, `meal`, `meet`, `events`, `quests` and `new-quest` (`api/server/step-answers.ts`). The main server names a Plan's step by its answer's input (`plan-steps.ts`), so a study answer's step is `study`, and one step refused drops all the steps of the reply. `study` is now read; a unit test reads every kind of `ReplyStep`, and failed on `study` before.
- **The step's button:** `stepActionOf` takes, for a Plan step whose Plan is a group study room, the act its card tells (`libraryActOf`), as the answer alone does; `planActionOf` leaves that Plan to its card.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 20 minutes (an estimate), in one session, from 22:01 to 22:20 KST, right after ticket 15's pull request. That includes three runs of the new integration test: the steps dropped, then the button missing, then passing.
- Tokens: input 118 uncached, with cache reads 13,703,518 and cache writes 69,206; output 33,768. No subagents.
