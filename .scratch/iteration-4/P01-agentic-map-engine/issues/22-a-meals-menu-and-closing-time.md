# 22: A meal Plan says today's menu and when the Restaurant closes

Parent: [P01 spec](../spec.md) ("The Assistant", "The wording"); the design's section 6.1, alone step 1, and row 1 of the wireframes (`AmHungry` s1 to s3)
Status: ready-for-agent
Blocked by: None. P02 ticket 14 (#319, merged) reads each Restaurant's hours into the meal plan

## What to build

Planning a meal needs to know what is served, not only how long it takes to get there. The design's "배고파" puts the menu on each candidate's card: "Each card's bold line is today's menu and closing time ("오늘 제육덮밥 · 14:00까지"). Below it are where the place is and how long I can eat ("지금 있는 건물 · 식사 55분")." The wireframe's basis ends with "메뉴와 닫는 시각: 오늘의 식단", and its input hint is "이어서 말하기 · 예: 더 가벼운 걸로".

What is built carries no menu at all. The stored answer reads "301동식당 · 식사 55분" / "12:45엔 나서야 해요", and the menus decide only which Restaurants are open.

Each meal Plan now says the day's menu of that meal at that Restaurant and, where its hours were read, when it closes. This holds for the asker alone and with Friends, on the card and in 근거. The model gets the menu in words, so that "더 가벼운 걸로" or "돈까스 먹고 싶어" is answered from the Plans it has.

## Acceptance criteria

- [ ] Every meal Plan whose Restaurant has a menu for the meal carries a menu line: "{오늘|내일|모레|date} **{main dish}** 외 N · {HH:MM}까지".
  - The main dish is the first dish of the menu's first corner, as the building's card and the menu Lookup name it.
  - N counts the other things served.
  - The closing time is the one kept for the Restaurant, meal, and kind of day (`restaurant_hours`, P02 ticket 16). Without one, the line ends at the dish.
- [ ] The menu line comes right after the line that names the Restaurant. Where the first lines say something else (where the asker was taken to set out from, a condition eased, a Friend's place unknown), it comes last. A Plan has at most three lines.
- [ ] 근거 ends with the whole menu, one line per corner, with prices, and then its source: "메뉴와 닫는 시각: 오늘의 식단", or "메뉴: 오늘의 식단" without hours.
- [ ] The recalculation (`POST /assistant/answers`) gives the same lines, since it calls the same service.
- [ ] `planMeal` answers each plan's `menu` (its corners in words) and `closesAt`. It takes `restaurant`, a Restaurant's name as it answered it, which the server turns into that Restaurant's Place. `PLAN_RULES` says how to choose by food, and what to say when no plan's menu has it.
- [ ] The app draws the lines as it is. The stored meal answers in `mobile/src/api/mock/data/` are copied again from the endpoint with real menus. An emulator check shows the card alone and with Friends.
- [ ] Tests:
  - unit: the menu's words on the stored lines of 2026-10-01 (a dish menu, a buffet, a self corner with orders, the takeout corner, a menu with no dish line) and the line's place among the Plan's lines;
  - integration: at `POST /assistant/messages` with the scripted model, the Plans' lines and 근거 alone and with Friends, with hours and without, `planMeal`'s menu words, and a plan made at a Restaurant named by `restaurant`.

## Comments

### Decided in the build (2026-11-16)

- **Words, not a new field.** The menu reaches the app as one of the Plan's lines and as lines of 근거.
  - The installed app draws both as it is, since its check takes any number of lines, so nobody waits for an app update to see it.
  - The recalculation and the model read the same lines.
  - A contract field would show nothing until a new app is released.
- **Its place on the card.** The menu line comes second, right after a first line that names the Restaurant. Examples:
  - "점심 301동식당 · 식사 55분" and "점심 12:33 학생회관식당";
  - "301동식당이 가장 가까워요" (board n15);
  - "13:00 학생회관식당 · 셋이 59분" (board n11b);
  - "자하연식당 2층 · 13:52 도착" (board n12).

  Otherwise it comes last, as after the two lines that say where the asker was taken to set out from (board n13). A Plan has at most three lines.

  The design gives each of two cards side by side a bold menu line. The frame that was built shows one Plan at a time with arrows. So its first line keeps the Restaurant and the minutes, and the line that says when to leave stays, since that is what the asker acts on.
- **Which dish stands for the menu.** It is the first dish of the first corner that holds one, as the building's card and the menu Lookup name it (`dishesOf` now reads `cornersOf`).
  - Plain rice beside a buffet's dishes (잡곡밥, 쌀밥, …) is left out, so 두레미담 reads 뼈없는감자탕 and not 잡곡밥.
  - A corner's tag (`<A코너>`) is dropped.
  - The line cuts a set at its first comma, so 예술계식당 reads 제육김치덮밥.
  - A buffet's notice that the page cut in two ("<뷔페 특성상 메뉴의 조기품절") is not a dish.
  - "외 N" counts every other thing served: dishes, a buffet's lines, and the other corners. Headings and notes are not counted.
- **The closing time** is the one `restaurant_hours` keeps for the Restaurant, meal, and kind of day, which #319 reads for each candidate.
  - Without it, the line ends at the dish, and the source line reads "메뉴: 오늘의 식단".
  - The meal's own window is never written as a Restaurant's closing time.
  - 301동식당's lunch page gives three hours lines, so P02 ticket 16 keeps none, and its line has no closing time.
- **The whole menu** is in 근거 after the way: one line per corner, with prices, then "메뉴와 닫는 시각: 오늘의 식단", the wireframe's words. The building's card already shows the menu's main dish and is not changed.
- **The day's word** is 오늘, 내일, 모레, or else "11월 20일".
- **The model.** Each plan's `menu` (the lines of 근거) and `closesAt` reach the model.
  - For "돈까스 먹고 싶어", it calls `planMeal` again with `restaurant`, a name as `planMeal` answered it. The server turns that into the Restaurant's Place, the input's `placeId`, so no new condition is kept and the recalculation and the installed app are unchanged.
  - A name the seed places no Restaurant under is refused, with words the model reads.
  - `PLAN_RULES`: read the plans' menus under the conditions on screen, then plan again at the restaurant that serves it. When none does, say so. Never name a dish that no plan's menu has.
  - The scripted model covers the tool. These rules were not run against the real model.
- **Not done:** the map's labels. The pick's label keeps "11:50 점심" and a candidate keeps its name, so menus are compared with the arrows, one Plan at a time.
- **The stored answers** in `mobile/src/api/mock/data/` (the meal answers and `meal-answer-plan-1` to `-5`) were printed again from `POST /assistant/answers`.
  - Setting: the stage's Tuesday at 11:50, with the 2026-10-01 lunch menus and the hours P02 ticket 16 reads from those pages. These are 302동식당 11:30–13:30, 학생회관식당 11:00–14:30, 3식당 11:00–14:00, 자하연식당 2층 11:30–14:00, and none for 301동식당.
  - Besides the menu, they now hold what merged since they were copied:
    - "점심 " at the start of the first line (ticket 21);
    - each part's `arriveAt`;
    - the labels of the band;
    - each Restaurant's own end from its hours (the eased answer's 302동식당 until 13:30, and the no-timetable answer's 302동식당, 3식당, and 자하연식당 2층 until they close).

