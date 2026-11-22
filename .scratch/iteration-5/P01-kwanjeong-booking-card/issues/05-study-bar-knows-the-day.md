# 05: The study-seat bar knows the User's day

Parent: [P01](../)
Status: ready-for-agent
Blocked by: none ([03](03-study-seat-dock.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

The seat's bar runs from the library's opening to its closing and shows only the band. A User can drag 14:00–17:00 across a 15:30 Class and nothing says so, while a meal's bar shows the Class before ("10:45 301동 수업 끝") and the next fixed thing.

## What to build

- The User's Classes and Quests of the slot's date (`GET /quests`: their own Quests, and today's Class Quests) inside the bar's hours are drawn on the track as a meal's bar draws busy stretches.
- Under the hours, the nearest one before the band is named at the left ("15:45 301동 수업 끝") and the nearest one after it at the right ("19:00 저녁 약속"), only when there is one.
- When the band runs into one, its words say so in one clause in the warning colour ("17:00–18:00 · 17:30 수업과 겹쳐요"), while dragging and after; the booking is not stopped.
- Nothing else of the bar changes: the hours as its ends, the handles, the steps, the words' place in the head. The booking's own seat, a Quest taken alone at exactly the band's span, is not counted.
- Classes are known for today only (the server sends today's Class Quests); another day shows its Quests alone.

## Acceptance criteria

- [x] The fixed things of the date, the ones before and after the band, the clash words, and the stretches cut to the hours. (Unit test.)
- [x] The bar with a Class inside its band: three stretches, the warning clause, and both names. (Integration test.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 1 hour in the map-first-answer session (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 40k; input about 15M, almost all cache reads, with about 100k cache writes.
