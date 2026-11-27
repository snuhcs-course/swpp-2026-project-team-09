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

- [ ] `ANSWER_CAPABILITIES` has `study-group` and not `study-plan`. (Unit test.)
- [ ] "같이 공부할 자리 있어?" gets the group answer from the mock server. "공부할 자리 있어?" alone still gets today's seat ticket. (Integration test.)
- [ ] The Production server's capability list includes `study-group` before the OTA (checked at the release).
- [ ] A group answer shown as one step of several requests has its main button: `stepActionOf` asks the group card's act as `libraryActOf` does (a point from #655's review). (Integration test.)
- [ ] Whole lint, format and types.

## Comments
