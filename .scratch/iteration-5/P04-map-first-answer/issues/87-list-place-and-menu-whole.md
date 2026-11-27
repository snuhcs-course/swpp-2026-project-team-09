# 87: Back from a place low in the meal list, the list is where it was, and the opened Restaurant shows its dishes whole

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #591
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Two faults on the user's phone, 2026-11-26, on the preview build at 5.0/Main dd569505f with Production data:

- Going back from a Restaurant's menu, "‹ N곳 목록" or Android's back, keeps the list's place for rows near its top (ticket 78), but not for a row further down. The sixth of six places, with "쉬는 곳" under it, came back with the list near its top, the kind chips cut by the header.
- In the opened Restaurant, a dish ordered at its own price is cut with "…" ("콘마요핫도그, 웨지감자튀김, 미니토마…  6,500원"). This is the view where the User comes to read the menu.

The way back stopped at the menu's end:

- Android runs a scroll asked in an update before it lays out that update's views (`MountItemDispatcher`, "execute all ViewCommands first").
- Closing the menu asked the list's place in the update that puts the list back. The scroll then ran against the menu's content, which ends far sooner than the list's, and stopped at its end.
- A row near the top was within the menu's reach; a row further down was not.

The other suspects:

- The sheet's step does not change at high, where the capture was.
- The kind chips and "쉬는 곳" are part of the list and stay as they were.
- The chosen row changes only its colours.

## What to build

1. While a menu covers the list, the sheet's content keeps room under the menu as tall as the list was. Closing it then scrolls the list back to its place in the same update, however far down that was.
   - The room is under the content's end. The card scrolls as far as the menu's own end, as before, and the room is gone once the menu closes.
   - A menu over another menu keeps the list's height. Another answer keeps no place, as before.
2. In the opened Restaurant, and in a menu question's Restaurant, which shows the same corners, a dish ordered at its own price is shown whole. It wraps onto as many lines as it needs, its price at the right of the first line, and the menu grows.
   - The list's rows and the map's label keep their one-line cut.

## Acceptance criteria

- [x] Closing a menu opened from a row further down than the menu is tall brings the list back to that row's place, Android's order of scroll and layout included.
- [x] While a menu covers the list, the room under the content makes up the list's height, and none is left once it closes.
- [x] An opened Restaurant shows a long dish whole, with its price.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

Built in PR #591. `useLayerScroll` gives the room to hold under the content while a layer is open: the content's height when the first layer opened, less the layer's own. The card adds it to the content's bottom padding. Its unit test (`answer-layer-scroll`) runs the scroll before the layout, as Android does, and failed first with the list back at the menu's end (230 for 900). `answer-meal-list-back` checks the room while a menu is open and after it closes. `answer-meal-menu-whole` failed first on the dish's one-line cut.

### Agent usage (2026-11-26)

- Agent time: about 25 minutes in one session, test runs included (an estimate).
- Tokens, to the PR's opening: input 8,858,610 (cache reads 8,697,028, cache writes 161,482, uncached 100); output 48,691. No subagents.
