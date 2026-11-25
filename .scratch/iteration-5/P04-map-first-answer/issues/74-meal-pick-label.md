# 74: The chosen Restaurant's map label says its name, start, and main dish

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet.
Blocked by: none.

Native files: none. Releases: a main server deployment and an app OTA update.

## What happens now

On a meal answer's map, the chosen Restaurant's label reads "예술계식당 17:00 · 걸음 3분" over "콘마요핫도그, 웨지감자튀김, 미니토마토파…". It takes two thirds of the screen's width, and the walk repeats the route's own "3분" pill.

## What to build

1. Line 1 is the name and the start ("예술계식당 17:00"), with no walk.
2. Line 2 is the main dish alone, then "외 N" for the other things that Restaurant serves at that meal ("콘마요핫도그 외 2"). One thing served gives the dish alone; no menu gives no second line.
   - N is the count the main server's menu words already use (`meal-menu.ts`): every item of every corner but the main dish. The main server sends it with the Plan's menu as `others`, so the phone does not count a second way.
   - The main dish is the first of the kind on screen when a kind is chosen, its name up to its first comma.
   - A main server without `others` leaves the menu's own dish words.
3. The label is as wide as its longer line, at most 200 points (about half the map's width), the dish cut short with "…" past it.
4. The walk stays on the route's pill and in the list's rows; the sheet, the list, and the unchosen candidates' tags are unchanged. A screen reader still reads the whole name, walk, dishes, and price.

## Acceptance criteria

- [x] The chosen Restaurant's label reads its name and start, with no walk, over its main dish and "외 N".
- [x] One thing served shows the dish alone; no menu shows no second line.
- [x] "외 N" on the label is the main server's count of the menu words.
- [x] The label is at most 200 wide, where another pick's may be 260.
- [x] No native file changes; lint, format, and types pass on the main server and the app.
