# 15: A café on the way

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: needs-info
Blocked by: the cafés' design: where their list comes from, whether they have menus, and how they show on the map

## What to build

"가는 길에 카페" shows the cafés on the User's way to their next item, each with the extra minutes of the detour. The one with the least extra time is picked, and the arrows browse the others (wireframe row 7, board q9; design section 5, question 15).

## Why it waits

The user deferred cafés on 2026-11-16 until they are designed: where the list comes from and how it stays current, whether cafés have menus collected as Restaurants do, and how they show on the map. Only board q9, the answer, is drawn. A first build exists (below); once the design is settled, it is a starting point, not a commitment.

## Comments

### Deferred (2026-11-16)

The user's decision, after asking where the list comes from, how often it is refreshed, whether cafés would have menus, and how they show on the map: close the pull request and build cafés later, after a proper discussion once the day's planned work is done. Pull request #316 was closed unmerged.

The first build stays on the branch `4.0/P01-15-a-cafe-on-the-way`:

- `pnpm seed:export openstreetmap-cafes` writes `seed/openstreetmap-cafes.json`. This is a one-time OpenStreetMap export of `amenity=cafe` in the campus's extent: 13 named cafés, and two unnamed ones left out. No collector refreshes it.
- When the server starts, each café is tied to the seeded Place it is in, or the nearest within 150 m.
- The tool `findCafeOnWay` draws the café of the fewest extra minutes on foot, with the next two beside it. On the real data it gives board q9 as drawn: 공차 at 63동, +1분, 12:45–12:59.
- The reviewer's two fixes are in it: the extra minutes are never below 0, since the walking table does not always keep the triangle inequality; and cafés of one name are told apart by their Places ("Cafe ING(28동)").
- No app change was needed. The board's arrows were not built.

### Agent usage (2026-11-16)

- Agent time: about 19 minutes. This is an estimate from the session's transcript timestamps: the union of active stretches, with gaps over 5 minutes left out. It covers the first build (about 14 minutes) and the review fixes (about 5 minutes). The first export of the cafés is counted in ticket 14's record.
- Tokens, the session only (no subagent worked on this ticket):
  - output: 58,211;
  - input: 24,093,760, of which 24,002,580 were cache reads, 91,070 cache writes, and 110 uncached.

