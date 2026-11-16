# 15: A café on the way

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: nothing (the cafés are an OpenStreetMap export, below)

## What to build

"가는 길에 카페" shows the cafés on the User's way to their next item, each with the extra minutes of the detour. The one with the least extra time is picked, and the arrows browse the others (wireframe row 7, board q9; design section 5, question 15).

## Why it waits

The server has no list of cafés. The seed's Places, the restaurant seed, and the OpenStreetMap export hold none, and the board's café names are example values. A person decides the source: a hand-made list of the campus cafés with their buildings, or an OpenStreetMap `amenity=cafe` export like the existing one. Once there is one, the calculation is ticket 06's way with one stop between, which needs no new screen piece.

## Comments

### The data source (2026-11-16)

Decided by the session that coordinates the packages, for the user's review: an OpenStreetMap export of `amenity=cafe` in the campus's extent. It is made as the existing OpenStreetMap export is: `pnpm seed:export openstreetmap-cafes` writes `seed/openstreetmap-cafes.json` with its query, date, and copyright line. When the server starts, each café is tied to the seeded Place it is in, or the nearest within 150 m, as a way reads a location. A café with no Place that near is left out. No café was typed by hand.

### Decisions taken in the build (2026-11-16)

1. **A tool of its own**, `findCafeOnWay({ to?, from? })`, for an app that draws answers. The way goes to the Place of the User's next item today, or to a Place they name, from where a way sets out (ticket 06).
2. **The extra minutes** of a café are the walk there plus the walk on, less the walk straight. Walks are the walking table's, rounded up as a way's. The shuttle is not weighed for a detour.
3. **A café fits** when the User reaches it before they must set out from it for the deadline. At most three are shown: the fewest extra minutes first, then the one nearest the destination, then by name. The first is drawn as the pick and the next two as candidates, each tagged "{name} · +N분".
4. **The words.** The lines are "**{café}**에 들러요" / "돌아가는 길 +1분 · 12:45 도착", or "가는 길에 있어요 · …" with no extra minutes. The basis has three lines:
   - "바로 가면 15분, 들르면 15분 + 1분";
   - "세 곳 다 +1분이라 24동에 가장 가까운 곳을 골랐어요", when the shown cafés tie;
   - "12:59에 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 1분", and "카페는 OpenStreetMap에 올라 있는 곳만 찾아요".
5. **The map and the band.**
   - The walk to the café, and the walk on as a `next` route.
   - The flag "12:45 도착 · 12:59까지 있어요".
   - The destination as `next`, "13:00 수업 · 24동".
   - The band from the arrival to when to set out: "12:45–12:59 · 카페".
   - The chips "301동에서", "13:00 수업까지", and "카페". The action is route guidance to the café.
6. **Review fixes (2026-11-16).**
   - The walking table does not always keep the triangle inequality: 1동→83동 is 307 s straight, but 60 s plus 235 s through 109동. So the extra minutes are never below 0. A café that saves time reads "가는 길에 있어요", tagged "{name} · 가는 길", with the basis "바로 가면 6분, 들러도 더 걸리지 않아요".
   - A name that more than one café has is told apart by its Place, as in "Cafe ING(28동)". The map's marks and the model's words then each name one café.
7. **The arrows are not built.** A Lookup's card has no arrows (ticket 11). The other two cafés are on the map with their extra minutes, and a press on one opens its building's card (P02-22).


### Agent usage (2026-11-16)

- Agent time: about 14 minutes. This is an estimate from this session's transcript timestamps: the union of active stretches, with gaps over 5 minutes left out (most of the waiting was for the shared check slots and the Docker lock). The first export of the cafés is counted in ticket 14's record.
- Tokens, this session only (no subagent worked on this ticket):
  - output: 47,201;
  - input: 16,897,281, of which 16,822,654 were cache reads, 74,545 cache writes, and 82 uncached.
