# 12: The menu answer shows the dishes, their prices and the hours

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [06](06-free-stretch-not-a-meal.md), which changes the same lines.

Native files: none. Releases: the main server.

## What happens now

- The menu answer's lines are the first dish ("모레 점심은 눈꽃치즈닭갈비") and a free-time line. The tool's result holds the prices and the hours note, but the app shows only the lines. Asked again for the prices, the model called the same tool and the same card came back.
- The rules tell the model to say when the data was collected, every time: "메뉴는 11/21 02:59에 수집된 정보예요" unasked.

## What to build

- The lines give up to three dishes with their prices, and the hours.
- The rules say the time of collection only when the User asks or when the menu is not of the day asked.

## Acceptance criteria

- [ ] A menu with three dishes and prices gives the three with their prices and the hours. (Unit test, fails before the fix.)
- [ ] An evaluation case: a menu question about today does not mention the time of collection.
- [ ] Lint, format and types of the main server pass.

## Comments
