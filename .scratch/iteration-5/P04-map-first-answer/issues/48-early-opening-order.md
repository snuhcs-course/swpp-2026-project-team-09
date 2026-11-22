# 48: Without walking, the meal list says "일찍 여는 순" and keeps the server's order

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. The main server's order without a starting place is P05 ticket 40 (PR 509).

Native files: none. Releases: an app OTA update only.

## What happens now

When the asker has no starting place (tomorrow with no Class before the meal, a weekend, late at night off campus), a meal's Plans carry no walking minutes. The tags show the start time and the rows say "11:53 도착", which is right. But:

- the raised list's caption says "걸음이 적은 순", a false claim;
- the list sorts by a walk that does not exist, so it falls to arrival time and scrambles the server's order (the walk on to the next item, the earliest start, the longest time to eat).

## What to build

- When the User's walking is known for none of the listed Plans, the caption says "일찍 여는 순", and the list keeps the server's order.
- With walking, nothing changes: the caption says "걸음이 적은 순" and the list is ordered by walking.

## Acceptance criteria

- [ ] Without walking, the rows keep the server's order and say arrivals, and the caption's words are "일찍 여는 순". (Unit test.)
- [ ] With walking, the rows are ordered by walking, and the caption's words are "걸음이 적은 순". (Unit test.)
- [ ] No native file changes; lint, format, and types pass on the app.
