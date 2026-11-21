# 05: An event's line gives the event's own time and place

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

For an event already under way, the answer (`events/event-answer.ts`, `event-scene.ts`):

- writes only "07:29 도착 · 31분 볼 수 있어요" as its first line, with no name, place or time of the event;
- labels the map flag "07:29 가을 정기 음악회", the arrival standing where the event's start is read;
- gives only the walks as its basis.

A User asked again to learn that the concert ran 06:00–08:00.

## What to build

- For an event under way, the first line is the event, its place and its own times ("가을 정기 음악회 · 문화관 06:00–08:00").
- The arrival comes second ("07:29 도착 · 31분 볼 수 있어요"), then the leave-by line as before.
- The map flag of an event under way gives its own times; one that has not started keeps its start.
- Every event's basis starts with its place and times.

## Acceptance criteria

- [x] An event under way: the first line holds its name, place and times. (Unit test, fails before the fix.)
- [x] Its flag reads with the event's times, not the arrival. (Unit test, fails before the fix.)
- [x] An event that starts after the arrival keeps its start. (Unit test.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 9 minutes, part of it waiting on GitHub (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 11k; input 5.6M, of which 5.6M cache reads, 20k cache writes and 32 uncached. No subagents.
