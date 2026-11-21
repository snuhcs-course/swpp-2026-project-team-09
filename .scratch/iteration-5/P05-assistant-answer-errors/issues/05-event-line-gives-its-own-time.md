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

- The first line is the event: its name, its place and its own times ("가을 정기 음악회 · 문화관 06:00–08:00").
- The arrival comes second, labelled as an arrival ("07:29 도착 · 31분 볼 수 있어요").
- The map flag shows the event's time, not the arrival.
- The basis starts with the event's time and place.

## Acceptance criteria

- [ ] An event under way: the first line holds its name, place and 06:00–08:00. (Unit test, fails before the fix.)
- [ ] Its flag reads with the event's start, not the arrival. (Unit test, fails before the fix.)
- [ ] An event that starts after the arrival keeps its start as the time. (Unit test.)
- [ ] Lint, format and types of the main server pass.

## Comments
