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

- [ ] The worker parses the hours lines the co-op pages carry (the forms found in the stored menu lines and the crawler's fixtures), with a unit test of each form and of lines it must leave alone.
- [ ] One migration for the table of kept hours, made at the next schema turn from the iteration branch's schema.
- [ ] A crawl keeps new hours, replaces them only when they differ, and leaves them when a day has no hours line; an integration test against the worker's stored days.
- [ ] The main server's service answers the hours for a Restaurant, meal, and date, and none for one never read; an integration test.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The user's decision (2026-11-15 22:47, relayed): "운영 시간은 사실 지금도 크롤링 하는 것으로 아는데 좀 개선해서 모으도록 해줘. 아마 변경될 데이터도 아닐 것 같고". This settles the triage: P01's spec had left a Restaurant's own closing time out of scope.
- Using the hours in a plan (the candidates, n12's drop reason, the "{HH:MM}까지" words of n10, n13, n15) is ticket 14's, in package A's engine.
