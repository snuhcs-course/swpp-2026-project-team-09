# 31: A meal answer's candidates are small tags, and its pick a two-line name label

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update only.

## What to build

The core of the map part of the answer screen's redesign (boards E1 and E2). With eleven real candidates, the two-line flags on every candidate covered each other. In a meal answer with menus, each candidate becomes a small tag: its number and the walking that choice adds to the User's day ("26분"): the way to the place, plus the way on to the next fixed thing when one follows. When where the User starts is not known, the tag shows the arrival time instead. Tags carry no dishes and no prices. The pick keeps a two-line name label: its name with its time and walking ("학생회관식당 11:00 · 걸음 32분"), then its main dish, the count of the rest, and the lowest price. The existing placement keeps tags from covering each other; a tag that cannot be placed leaves its number on its dot.

The mock answers "내일 점심 뭐 먹을까" with eleven restaurants at their buildings, two of them sharing 109동 and two 75-1동, between a Class at 301동 ending at 10:45 and one at 302동 at 15:30. Every picture of this redesign is taken with it.

The walking is worked out in the app from what a Plan already holds (the User's part's `walkMinutes` and the scene's `next` route), so the main server sends no new field.

## Left for after

The route's two legs with their minutes and the dark start and next labels, fading far or unfitting candidates, the pop and ring on choosing, "메뉴 ›" on the pick's label, and choosing by a press on a tag with the label moving. The functions for walking and fading (`addedWalk`, `fitsBand`, `fadedPlan`, `fixedBefore`, `fixedAfter` in `answer-walks.ts`) are in place for them and for the list.

## Acceptance criteria

- [ ] A meal answer with menus: each candidate's tag is its number and its walking minutes; the pick's label has its time and walking after its name and its dish and lowest price under it. (Unit test.)
- [ ] A meal answer without menus and other answers keep their drawing. (Existing tests.)
- [ ] The crowded mock reply on the emulator: no tag covers another. (Picture.)
- [ ] No native file changes; lint, format, and types pass on the app.
