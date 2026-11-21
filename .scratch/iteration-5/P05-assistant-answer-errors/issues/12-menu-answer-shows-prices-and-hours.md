# 12: The menu answer shows the dishes, their prices and the hours

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [06](06-free-stretch-not-a-meal.md), which changes the same lines.

Native files: none. Releases: the main server and an app OTA update.

## What happens now

- The menu answer's lines are the first dish ("모레 점심은 눈꽃치즈닭갈비") and a free-time line. The tool's result holds the prices and the hours note, but the app shows only the lines. Asked again for the prices, the model called the same tool and the same card came back.
- The rules tell the model to say when the data was collected, every time: "메뉴는 11/21 02:59에 수집된 정보예요" unasked.

## What to build

- The first line gives the first dish with its price and how many more are served ("**301동식당** 오늘 점심은 부대짬뽕&군만두 6,500원 외 1"); the basis opens with up to three dishes and their prices.
- The hours stay the plan's, in the second line, read from the hours collected (ticket 01). The menu's own hours note is not added: where no hours were stored, it would contradict the plan's window in the same answer.
- The menu rules say when the menu was collected only when the User asks, or when it is not the menu of the day asked.
- The menu Lookup carries `menu`: the meal's hours that day (null when none were kept) and the dishes of its main corner with their prices, so that the map's card of the Restaurant (P04 ticket 08) reads them as facts, not from the words.
- The Restaurant card (findMealRestaurants and showRestaurants) carries `hours`, the meal's hours kept for its day (`RestaurantHours`), or null when none were kept. The app reads it as optional. P04 ticket 08 writes them on the Restaurant's flag; that server part was moved here.
- Each meal Plan carries `menu`: its Restaurant's main corner, with the corner's own price from its heading (a buffet's or a self corner's, null when it has none) and its dishes with their prices in the menu's order. It is absent when no menu was collected for the meal there. P04 tickets 13 and 15 write the first dish and a price on the Restaurant's tag and list every candidate's menu. The Plan and the menu Lookup take the corner from one helper, `mainMenu` in `meal-menu.ts`. A dish that fits a stated wish ("더 가벼운 걸로") is not put first: the server is given only the Restaurant the model chose, not the wish.

## Acceptance criteria

- [x] The first line holds the first dish's price and the count of the others; the basis lists the dishes with their prices. (Unit test, fails before the fix.)
- [x] An evaluation case, `menu-collected-not-said-unasked`: a menu question about today does not mention the time of collection. (Loads; not run here, it calls the model.)
- [x] The menu Lookup's `menu` holds the hours and the main corner's dishes with prices. (Unit test.)
- [x] The app believes a menu Lookup with `menu`, with null hours, and without it, and refuses one of another shape. (Unit test.)
- [x] The Restaurant card carries the hours kept for its meal, and null without them. (Main server integration tests.)
- [x] The app believes a card with hours, with null, and without the field, and refuses hours of another shape. (Integration test.)
- [x] A meal Plan's `menu` holds its Restaurant's main corner: a buffet's price once, the dishes with their prices in the menu's order. It is absent without a menu. (Unit test, fails before the change.)
- [x] The app believes a meal Plan with `menu`, with no dishes, and without it, and refuses one of another shape. (Unit test.)
- [x] Lint, format and types of the main server and the app pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 4 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 11k; input 6.8M, of which 6.8M cache reads, 19k cache writes and 24 uncached. No subagents.
