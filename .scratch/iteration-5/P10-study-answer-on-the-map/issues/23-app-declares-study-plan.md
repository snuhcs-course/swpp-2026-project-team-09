# 23: The app says `study-plan`

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet
Blocked by: 17, 18, 19, 22; the main server's 21 and 24

Native files: none. Releases: an app OTA update; the main server needs 21 and 24, both released.

## What to build

The last of the app's study candidates screen: the app tells the main server it draws a study answer alone, so "공부할 자리 있어?" asked without a booking is the places to study (tickets 17–19, 22), not today's seat card.

1. `ANSWER_CAPABILITIES` carries `study-plan`. It is sent with every chat request, `POST /assistant/answers` and `POST /plans`.
2. The mock answers as the main server then does (`LIBRARY_STUDY_RULES`):
   - "공부할 자리" or "공부할 곳" asked without a booking and without a library space named is the stored study answer;
   - a reading room named, or a booking asked, stays the seat card;
   - "같이 공부할 자리" stays the group study room's answer.
3. The words the mock took before the app said `study-plan` ("공부할 곳 추천해 줘" alone) are gone; the stored answer is asked as a User asks it.
4. `study-group` is not said yet: it is ticket 16's.

## Acceptance criteria

- [x] The app says `study-plan`, and not `study-group`. (Unit tests; the first failing before the change.)
- [x] The mock answers "공부할 자리 있어?" with the places to study, and a reading room or a booking with the seat card. (Unit tests, the first failing before the change.)
- [ ] The whole study flow checked on the emulator by the orchestrator before merge.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 10 minutes, an estimate, in one session.
- Tokens, estimated as this ticket's share of that session: input 13M, of which 13M cache reads, 0.04M cache writes and under 1k uncached; output 13k.
