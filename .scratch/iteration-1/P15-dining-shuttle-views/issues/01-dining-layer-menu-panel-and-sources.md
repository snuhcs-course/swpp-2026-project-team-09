# 01: The 편의기능 stack, the 식당 layer, the menu panel and the data sources screen

Parent: [P15 spec](../spec.md)
Status: ready-for-agent
Blocked by: P19-01 (The shell, the shared components, the Quest full screen and the Friend panel)

## What to build

The 편의기능 button on the map stops saying "준비 중이에요". It opens the stack of the `MainLayers` frame, which holds two toggles, 식당 and 셔틀버스. 셔틀버스 says "준비 중이에요" until ticket 02.

With 식당 on, the map shows a pin on the Place of each restaurant that has menus today, as the `MapDining` frame draws a single 식당. A press on a pin opens the frame's 식당 card at the top of the map, and its `메뉴 보기` opens the menu panel at that restaurant.

The menu panel shows the menus of 7 days from today. It opens on the meal served next, chosen by the time of day. It lists the day's restaurants, and each meal as its lines, as ADR 0001 decides. No frame draws it: it is built from the design system and P19's shared components. The stack opens it too, without a restaurant.

The credit on the map opens a screen with the attributions of the map data: OpenStreetMap, and 국토지리정보원's 연속수치지형도 건물 under 공공누리 type 1.

The frames are `MainLayers` (the stack), `MapDining` (the 식당 pins) and `Main` (the 편의기능 button, and the detail card, which sits at the top for 식당).

The server routes, read only:

- `GET /menus?date=YYYY-MM-DD`: one day's restaurants, each with `name`, `collectedAt` and `meals` of lines (`main-server/README.md`, "Menus");
- `GET /places`: the Places with their numbers and coordinates (`main-server/README.md`, "Places"). Ticket P19-02 may have added it to the API client already; if not, this ticket adds it.

Each new operation goes into the API client with its mock, so that the screens run in Expo Go and on the web against the mocks and in a build against the main server (`mobile/README.md`, "From a mock to the main server"). The mock's menus are a week from the mock clock's day, made from lines of the saved pages in `worker-server/test/pages/`: dishes with and without a price, a heading with a set price, notes, a closure, a restaurant listed with no meals, and an empty day.

### The restaurant → Place table

The app carries a table from a restaurant's name, as `GET /menus` gives it, to the number of its Place, as `GET /places` gives it. The position of a pin is that Place's. The starting table, from the Co-op's restaurant information page (`.scratch/research/external-sources.md` §4.4) and the wireframe, is checked against `GET /places` when it is written:

| Restaurant | Place number |
|---|---|
| 학생회관식당 | 63 |
| 자하연식당 2층, 자하연식당 3층 | 109 |
| 예술계식당 | 74 |
| 두레미담 | 75-1 |
| 3식당 | 75-1 |
| 동원관식당 | 113 |
| 301동식당 | 301 |
| 302동식당 | 302 |
| 아워홈(901동) | 901 |
| 생협기숙사(919동) | 919 |
| 수의대식당 | 85 |

A restaurant that the table does not name, or whose number `GET /places` does not answer, has no pin. It is still in the menu panel. The four fixed-menu restaurants are not collected (P07), so they are not in the table.

## Acceptance criteria

### The 편의기능 stack (`MainLayers`)

- [ ] The 편의기능 button opens and closes the stack. Its label is `편의기능 (식당 · 셔틀버스)`, and it reports whether the stack is open. It is navy with a white icon while the stack is open, and white with a navy icon otherwise. Under its icon, a 5 dot in each colour of a layer that is on shows which layers are on: `#B8336A` for 식당, `#6B46C1` for 셔틀버스.
- [ ] The stack rises above the button, as in the frame: a white rounded box, labelled `편의기능 레이어`, with the toggles from the bottom up, 식당 then 셔틀버스. A toggle is 60×64: the icon (`meal` or `bus`), the label in 11/600, and `ON` or `OFF` in 9/700. When on, it is filled with its layer's colour, with white content. When off, it is `#F5F6F9` with muted content. A screen reader reads it as a toggle button named `식당 켜기` or `식당 끄기`, and `셔틀버스 켜기` or `셔틀버스 끄기`. With reduced motion, the stack appears without rising.
- [ ] Above the toggles, a tile `메뉴` (new), with the `meal` icon in `#B8336A` on `#FBE7EF` and the label `메뉴 보기` (new) for a screen reader, opens the menu panel at today's next meal, at the top of the list, and closes the stack. It is not a toggle and has no `ON` or `OFF`.
- [ ] A transparent scrim, labelled `편의기능 레이어 닫기`, covers the map while the stack is open, and a press on it closes the stack. Android's back closes it, through P19's shared means, before the card or anything under it. The zoom control is hidden while the stack is open, as in the frame.
- [ ] 식당 turns its layer on and off. 셔틀버스 shows "준비 중이에요" and stays `OFF`.
- [ ] The layers stay on across a visit to another tab, and start off when the app starts.
- [ ] While a card at the bottom is open, the button and the stack are not shown, as P06 does. The 식당 card at the top leaves them shown.

### The 식당 layer (`MapDining`)

- [ ] Turning 식당 on fetches `GET /menus` for today, a day in Korea's time, and `GET /places`. The pins appear when both have answered. A failure of either shows no pins and the toast `식당 정보를 불러오지 못했어요` (new). Turning the layer off and on fetches again.
- [ ] A pin stands on the Place of each restaurant in the table that has at least one line in one of today's meals. A restaurant listed with `meals: []` has no pin. Restaurants that share a Place share one pin.
- [ ] A pin is the frame's single 식당 mark: a 22 circle in `#B8336A` with `학` in white 11/700, a white ring and a small tail, made as a marker look of the map. From the "names" level its text is the restaurant's name, or `{first restaurant} 외 {n}곳` (new) when several share the Place. The frame's clusters are not built.
- [ ] A press on a pin selects it, a ring around the mark as in the frame, and opens its card at the top of the map (top 52, left and right 16), as the frame places the 식당 card. While it is open, the Friend list and the Quest list are hidden, and the zoom control stays.
- [ ] The card holds:
  - the 40 round icon `meal` on `#B8336A`;
  - the kicker `식당 · 학식 · {number}동` in `#B8336A`, or `식당 · 학식 · {Place name}` for a Place without a number;
  - the title: the restaurant's name, or the Place's name when several share it;
  - a `pin` line: `{number}동`, or the Place's name;
  - a `meal` line for each restaurant at the Place: `오늘 {meals}` (new), the meals with lines today joined by ` · `, such as `오늘 점심 · 저녁`, and `{restaurant} · 오늘 {meals}` when several share the Place;
  - ✕ `닫기`, and the primary `메뉴 보기`.
- [ ] `메뉴 보기` opens the menu panel at today's next meal, scrolled so that the restaurant's section is at the top: the first of them, in the panel's order, when several share the Place.
- [ ] Turning 식당 off removes the pins and closes a 식당 card.

### The menu panel (no frame)

- [ ] It is P19's full-screen panel, sliding up from the bottom: ✕ `닫기` and the title `메뉴` (new). The address names the day, the meal and the restaurant, so that a test or a link opens it at a restaurant. Android's back closes it.
- [ ] Under the app bar, a row of 7 day tiles from today, in the form of the date sheet of the `Party` frame (`PartyCreate`): 52×60, the top line `오늘`, `내일`, or the weekday `월` … `일`, the date's number under it, Sunday's in red and Saturday's in blue, the chosen tile in navy. If P13 has already made that tile a component, it is used; otherwise this ticket makes it one of the design system, for P13 to use.
- [ ] Under the days, P19's segmented tabs `아침` · `점심` · `저녁` (new).
- [ ] The panel opens on the meal served next, by the time of day in Korea's time: before 10:00 `아침`; from 10:00 `점심`; from 15:00 `저녁`; from 20:00 `내일` and `아침`. The four times are constants in one place, with a test for each side of each.
- [ ] Choosing a day fetches `GET /menus` for that date, once, kept by the query cache. Choosing a meal changes no fetch.
- [ ] The day's restaurants are listed in the server's order, each as a card: the name in 16/600, and `{number}동` in 13 muted after it when the table places it. Under the name come the lines of the chosen meal, in the page's order:
  - a line with both a `name` and a `price` is a row with the name on the left and the price on the right in 15/600, written `6,000원`;
  - a `heading` is a section title in 14/700, its text as written, the set price included;
  - a `note` is in 13 muted, as written;
  - any other line is in 15, as written.

  No price is shown that the line does not carry, and the app does not group by corner or compute a cheapest dish.
- [ ] A restaurant of the day without lines for the chosen meal stays in the list with `운영하지 않아요` (new) in 14 muted under its name.
- [ ] Under the tabs, one line in 12 muted gives the oldest `collectedAt` of the day's restaurants: `{M월 d일 HH:mm}에 가져온 메뉴예요` (new), in Korea's time.
- [ ] A day answered `[]` shows P19's empty state with `이날 올라온 메뉴가 없어요` (new). While loading, P19's loading state. After a failure, P19's error state, `불러오지 못했어요` with `다시 시도`, which fetches the day again.

### The data sources screen (no frame)

- [ ] The credit on the map, `© OpenStreetMap · 국토지리정보원`, becomes a button labelled `지도 데이터 출처 보기` (new) that opens the screen. `Map` gains an optional press for its credit. The credit is drawn by the app's own view over the map, so no native module changes, and it stays visible without a press, as OpenStreetMap's guidelines ask.
- [ ] The screen is P19's full-screen panel, sliding in from the right: `뒤로` and the title `지도 데이터 출처` (new). Android's back closes it.
- [ ] A card `OpenStreetMap`: `© OpenStreetMap contributors`, `캠퍼스 경계, 셔틀버스 노선과 건물 윤곽에 쓰여요. ODbL 라이선스로 제공돼요.` (new), and the link `저작권과 라이선스 보기` (new), which opens `https://www.openstreetmap.org/copyright` in the browser.
- [ ] A card `국토지리정보원`: `국토지리정보원, 연속수치지형도 건물 ({연도}), 공공누리 제1유형` (new), with `{연도}` the year that the VWorld page gives for the files the seed was exported from; `건물 윤곽에 쓰여요. 출처를 밝히면 자유롭게 이용할 수 있는 공공저작물이에요.` (new); and the link `브이월드에서 내려받기` (new), which opens `https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162` in the browser. The screen does not suggest that either source sponsors the app.

### Records and checks

- [ ] `mobile/README.md` ("Screens and the flow between them", "Data", "Design system") describes the stack, the 식당 layer, the restaurant → Place table and how to correct it, the menu panel, the day tile and the data sources screen. P06's `todo.md` §3 gains rows for `GET /menus` (and `GET /places`, if this ticket adds it), and the 편의기능 row of §4 says that only 셔틀버스 waits, for ticket 02.
- [ ] Jest tests, through `startApp` on the real routes, against the mocks and against the fake main server of `__tests__/support/`:
  - the stack: open and close by the button, the scrim and Android's back; the toggles' names and `ON`/`OFF`; the dots; 셔틀버스's toast; the `메뉴` tile;
  - the 식당 layer: the two requests, today's date asked; a pin per Place, shared by two restaurants; no pin for a restaurant with `meals: []`, one outside the table and one whose Place is missing; the pin's text at the "names" level; the failure toast; the layer turned off;
  - the card: its kicker, title and lines for one and for two restaurants; the lists hidden while it is open; `메뉴 보기` opening the panel at the restaurant;
  - the panel: the meal chosen at 09:59, 10:00, 14:59, 15:00, 19:59 and 20:00, the last on `내일`; switching days, which asks for that date, and meals, which asks nothing; a dish with its price; a heading with a set price; a note; a line without a kind; a dish without a price shown without one; `운영하지 않아요`; the collected time; the empty day; the failure and `다시 시도`;
  - the data sources screen: opened from the credit, both cards, and each link opening its address.

  The screen tests of P06 and P19 pass.
- [ ] The frames were read again when the work started. Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - no 공부공간 toggle, and the button's label without it (no data);
  - the `메뉴` tile, which opens the panel from the stack;
  - only the restaurants with menus today, from the three Sources; no cafés, convenience stores or other restaurants, so no `카` `편` `음` marks and no clusters;
  - restaurants at one Place share a pin;
  - the card's `[메뉴 · 가격]` line becomes the meals served today, and it has no `[운영 시간]` line: hours are note lines of a meal (ADR 0001);
  - `메뉴 보기` opens the menu panel, not the placeholder sheet, and no 식당 card offers `길찾기`;
  - 셔틀버스 says "준비 중이에요" until ticket 02;
  - the menu panel and the data sources screen, which no frame draws.
- [ ] Screenshots of the web target are in the pull request under Test Results: the stack open with 식당 on, the pins at the "names" level, the 식당 card, the menu panel at a restaurant with a heading, a note and a dish, `운영하지 않아요`, the empty day, and the data sources screen. The stack, the pins and the card are compared with their frames.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.
