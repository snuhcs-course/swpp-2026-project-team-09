# 16: Each Restaurant's own hours are data, so that a plan knows when a place closes

Parent: [P02 spec](../spec.md); the design's row 8, boards n10, n12, n13, n15 ("14:00까지", "19:00까지", "14:00 닫아요")
Status: ready-for-agent
Blocked by: nothing; its migration takes the next schema turn

## What to build

The co-op's menu pages already carry each Restaurant's hours, and the worker keeps them only as a free-text note line of the day ("※ 운영시간 : 11:00~14:30"). The worker now reads those lines into structured hours and keeps them, and the main server reads them, so that a plan can say "{HH:MM}까지" on a Restaurant's card and "{HH:MM} 닫아요" for a place the asker reaches too late (ticket 14 uses it).

- **Read from the page**: each meal's hours line of a Restaurant, the opening and closing time, as the page writes it; a line the worker cannot read for sure stays a note, as today.
- **Kept**: one row per Restaurant (by its source and name), meal, and kind of day (weekday, Saturday, Sunday or holiday), with the opening and closing time, the line it was read from, and when it was read. Hours rarely change, so a later crawl replaces a row only when it reads a different time, and a day whose page gives no hours line leaves the kept hours as they are.
- **Read by the main server**: a service that answers a Restaurant's hours for a meal on a date, or none when none were read; nothing guesses hours that were never read.

## Acceptance criteria

- [x] The worker parses the hours lines the co-op pages carry (the forms found in the stored menu lines and the crawler's fixtures), with a unit test of each form and of lines it must leave alone.
- [ ] One migration for the table of kept hours, made at the next schema turn from the iteration branch's schema.
- [x] A crawl keeps new hours, replaces them only when they differ, and leaves them when a day has no hours line; an integration test against the worker's stored days.
- [x] The main server's service answers the hours for a Restaurant, meal, and date, and none for one never read; an integration test.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The user's decision (2026-11-15 22:47, relayed): "운영 시간은 사실 지금도 크롤링 하는 것으로 아는데 좀 개선해서 모으도록 해줘. 아마 변경될 데이터도 아닐 것 같고". This settles the triage: P01's spec had left a Restaurant's own closing time out of scope.
- Using the hours in a plan (the candidates, n12's drop reason, the "{HH:MM}까지" words of n10, n13, n15) is ticket 14's, in package A's engine.

### Decisions (2026-11-15)

- **Where it lives.** The worker reaches the database only through the main server, so it reads the hours as it reads a line's kind, name and price, and sends them with each restaurant as `hours` in its message to `/menus/collected` (`worker-server/src/menu/menu-hours.ts`). The main server keeps them in the transaction that stores the day's menus (`main-server/src/menus/restaurant-hours.ts`), in the table `restaurant_hours`. The note line is stored and served as before.
- **The forms the pages write**, in the stored lines of 2026-10-01 (`main-server/test/menu-lines-2026-10-01.json`) and the saved pages (`worker-server/test/pages/`): `※ 운영시간 : 11:00~14:30`, `※운영시간 : 08:00~09:30`, `※운영시간: 11:30~13:30`, `※ 운영시간 11:30~13:30`, `※ 운영시간 : 11:30 ~ 14:00` and `※ 운영시간 :  08:30~16:00`, and, only at the fixed-menu restaurants the collector leaves out, `※ 운영시간 : 11 : 00 ~ 18 : 30` and `※ 운영 시간 9 : 30 ~ 19 : 00`. All of them are read. No page writes `11:00-14:30` or `11시~14시30분`, so neither is.
- **Left as notes only:** busy times (`※ 혼잡시간 : 11:50~12:20`), last orders (`※주문식 라스트 오더 : 19:15`), times for one group (`※ 교직원이용시간 : 11:30~12:15`), an opening without a closing (`※ 08:20~준비수량 소진시까지`), and hours with conditions (`※ 운영시간 : 학기중 평일, 주말 09 ~ 20시 / 라스트오더 19시:40분`).
- **A cell with several hours lines gives that meal none.** 예술계식당's lunch gives A코너 11:30~14:00 and B코너 11:30~13:00, and 301동식당's lunch three (식사 11:30~13:30, TAKE-OUT 10:30~16:00, the café 08:30~16:00). Which is the Restaurant's is not sure, and the widest would tell a plan that 301동식당 serves lunch until 16:00.
- **What the pages give for kinds of day.** Each day's page gives that day's hours in each meal's cell, so a Saturday's page gives Saturday's. On a public holiday the Co-op lists few restaurants and writes the closure in the cell (`개천절 휴무` on 2026-10-03); no page gives holiday hours. The Co-op's restaurant information page has hours by `평일 | 토요일 | 휴일`, but it is not collected. So a holiday has no kind of its own.
- **A holiday is read by its day of the week.** The project keeps no calendar of public holidays (the shuttle reads holidays as weekdays too, ADR 0010), so `hoursOf` cannot count a weekday holiday as `sunday`; that a Restaurant is closed on one is in that day's cell (ADR 0011). Counting it as `sunday` needs such a calendar, which is not built here.
- **Several days of one message.** A Collection carries seven days; when two days of one kind read different times, the earliest day's are kept, since today's page is filled in and later days may not be.
- **The same times keep the row.** A Collection that reads the kept times, even written another way, leaves the row's line and `readAt` as they are.
- **A message without `hours`** is taken as none read, so the tests and benchmark worlds that post menus without them, and a worker of the previous release during a deploy, change no hours.
- **`hoursOf(restaurant, meal, date)`** takes the Restaurant's name as `GET /menus` and the plans' candidates (`openRestaurants`' `key`) have it, a meal and a `YYYY-MM-DD` day in Asia/Seoul. `MenusModule` exports `RestaurantHours` for ticket 14.
- **Migration**, provisional until the schema turn: `20261115230202_add_restaurant_hours`, made with `prisma migrate diff` from the schema at `fe5f8b98`.
