# 12: The menu answer shows the dishes, their prices and the hours

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [06](06-free-stretch-not-a-meal.md), which changes the same lines.

Native files: none. Releases: the main server.

## What happens now

- The menu answer's lines are the first dish ("모레 점심은 눈꽃치즈닭갈비") and a free-time line. The tool's result holds the prices and the hours note, but the app shows only the lines. Asked again for the prices, the model called the same tool and the same card came back.
- The rules tell the model to say when the data was collected, every time: "메뉴는 11/21 02:59에 수집된 정보예요" unasked.

## What to build

- The first line gives the first dish with its price and how many more are served ("**301동식당** 오늘 점심은 부대짬뽕&군만두 6,500원 외 1"); the basis opens with up to three dishes and their prices.
- The hours stay the plan's, in the second line, read from the hours collected (ticket 01). The menu's own hours note is not added: where no hours were stored, it would contradict the plan's window in the same answer.
- The menu rules say when the menu was collected only when the User asks, or when it is not the menu of the day asked.

## Acceptance criteria

- [x] The first line holds the first dish's price and the count of the others; the basis lists the dishes with their prices. (Unit test, fails before the fix.)
- [x] An evaluation case, `menu-collected-not-said-unasked`: a menu question about today does not mention the time of collection. (Loads; not run here, it calls the model.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 4 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 11k; input 6.8M, of which 6.8M cache reads, 19k cache writes and 24 uncached. No subagents.
