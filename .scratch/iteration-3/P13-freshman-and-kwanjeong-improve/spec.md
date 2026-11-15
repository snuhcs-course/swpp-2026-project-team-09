# P13: More freshman quests, the 공부공간 layer and 관정 accuracy from the P6 results

Status: ready-for-agent

Schedule row: Iteration 3 P13, "Improve AI assistant feature: freshman package, Gwanjeong (from evaluation results)". Owner: 안진영.

References:
- `references/quest-candidates.md`: the research behind the new Tutorial Quests (36 candidates, with facts, sources, places and confidence), 2026-11-04.
- `references/study-spaces.md`: the research behind the 공부공간 layer (65 spaces, with hours, who may use them, live-seat sources and confidence), 2026-11-04.
- `references/tutorial-place-pin.png`: the PM's reference for the pin that 지도에서 보기 drops (a red teardrop with a white circle).
- `main-server/eval/p6/r1.md`: P6's R1 and its reading of the failures, which this spec's accuracy work starts from.
- The P06 spec (`../P06-tutorial-and-kwanjeong/spec.md`) for the Tutorial, the Library Space catalogue, the Library Session and the P6 suite, and the A01 spec (`../A01-openrouter-to-claude-console/spec.md`) for the Anthropic path the measurements run on.
- The wireframes: the Claude Design artifact `136sh65V4Trkv5KBM78Vgr`, `project/Main.dc.html`, read at version 1793724381-9465 (the version served on 2026-11-04, newer than the 1793721418-9251 named in the brief; the 공부공간 parts below are the same in both as far as this spec uses them).

This spec writes down the PM's decisions from the grilling on 2026-11-04, and three items the PM added on the same day after the first review (markdown in the Assistant's replies, the tutorial's place pin, and choices as buttons for 관정's ASKs). Where they differ from the wireframes, the decisions win.

## Problem Statement

The 새내기 튜토리얼 has five Tutorial Quests. A freshman still misses much of what students learn by word of mouth: that 천원의 식사 is served at lunch and dinner too, where the lost-and-found is, that a laptop can be borrowed for 1,000원 a day, that ChatGPT Edu and the campus software licences are free, that a shuttle runs after the library closes, that the counselling centre exists, and that a practice room can be booked by one student. Five quests in one flat list also do not scale to fifteen.

Students look for a place to study more than for anything else, and the app does not show where one is. The 편의기능 stack has 식당 and 셔틀버스 layers and a 메뉴 tile; the wireframes replace the tile with a 공부공간 layer. Many study spaces are open to one college or department only, which a student finds out at the door.

P6's R1 (`eval/p6/r1.md`) passed 5 of its 9 frozen thresholds. Part of the gap is the harness's own: the scorer does not read the card key's `e=` equipment, one label expects a named room in the wrong field, and three cases forbid tools the rules require. The rest is the Assistant's: room-request replies say "예약하기를 눌러야" instead of 동의, ASKs call tools first, the graduate reading room is refused by guess, cancel and return ask back instead of calling their tools, a refusal says "도와드릴 수 없어요" instead of 미구현, times are written "17시 30분", and the VR room gets a useDesc it should not. Per-turn input also grew from about 44k to 70k tokens after P06-07.

The seat map does not say which seat is which, and nothing tells the User that tapping a free seat books it.

The chat shows the model's markdown raw: `**bold**` keeps its asterisks. When the Assistant needs more for a 관정 booking (the time, which space, which kind of seat), it writes a paragraph listing the options, which the User must read and answer by typing.

A Tutorial Quest's 지도에서 보기 moves the map close to the place but marks nothing, so the User does not see which building or spot is meant, least of all for a point such as the 행정관 셔틀 정류장.

Other campus facilities (the gym, the courts, the colleges' study rooms) have their own booking sites. The Assistant cannot book them, and the party it proposes for "농구 하자" leaves the User to find the site.

## Solution

Five parts and a measurement.

- **More Tutorial Quests, grouped.** Ten new Tutorial Quests join the five in `content/tutorial.yaml`, each with sourced facts. The fifteen are grouped into five categories (생활, 공부·학사, 이동, 건강, 문화·여가), shown in the pager and the quest list in the current tutorial UI. Every quest, 관정 included, is completed with 완료했어요. The phone's 관정 check (P06-05) stays in the code behind a server flag, off. The 관정 sheet keeps 어시스턴트에게 예약 부탁하기. 지도에서 보기 drops a red pin on the quest's place; a tap on it opens what the map shows there, if anything.
- **The 공부공간 layer.** The 편의기능 stack becomes 식당 · 셔틀버스 · 공부공간. The 메뉴 tile goes; the menus are reached from a 식당 pin's 메뉴 보기. Study Spaces come from a server file beside the Places seed, one pin per building. 관정관 shows live seats from the User's own Library Session. A Study Space restricted to a college, a department or graduate students is grey for a User whose 내 정보 does not qualify, and tapping it says who may use it.
- **The chat's display.** The large seat view draws each seat's number. A short hint under the seats card and the Assistant's "원하는 자리를 눌러 주세요" tell the User to tap a seat. The Assistant's bubbles render the markdown the model writes (bold, italics, line breaks, lists, safe links); the User's bubbles stay plain.
- **Choices as buttons.** When a 관정 request lacks something, the Assistant asks in one short line and offers the choices (spaces by name, start times, durations) as tappable chips, through P07-02's candidate chips. A tap sends the choice.
- **Facility booking links.** A made Proposal whose Place has an online booking page carries a "시설 예약하기" link button. A research and design document records how the Assistant could book facilities later.
- **Measured accuracy.** The eval's own bugs are fixed and R1 is rescored from its saved runs, with no model calls. Twenty new cases (two per new quest) join the suite, which moves to C1. After A01 has moved the Assistant to the Anthropic API, a C1 baseline is run, the top failure causes are fixed in `LIBRARY_RULES` and the library tools, and a second run measures the fix.

Words:
- a **Study Space** (공부공간) is one place to study in the layer's data: a library, a reading room, a lounge, a PC room or a group study room, with its building, hours and who may use it. It is not a Library Space, which is an entry of 관정's booking catalogue;
- a **Tutorial Category** is one of the five groups the Tutorial Quests are shown in;
- a **restricted** Study Space is one open only to a college, a department or graduate students; it is **usable** for a User whose 내 정보 qualifies, and grey otherwise.

## Parallel waves

```
wave 1 (now)              01 quests + pin   02 공부공간   03 chat display   06 booking links   04a eval fixes + R1 rescore
                             │
wave 2 (after P07-02)        └──► 04b new cases, choices scoring, short ASK check, C1 tag
                                       │
wave 3 (after A01, P07)                └──► 05 C1 baseline (R2), fixes and choice chips, R3
```

- Wave 1 needs nothing else: 01, 02, 03, 06 and the first part of 04 touch mostly different files (below, "Files by ticket"; 01 and 02 both add a marker look to the map, and the second to merge rebases).
- 04's second part needs 01's content merged, and P07-02 (#170) merged, since the replies it scores carry P07-02's `choices`.
- 05 needs 04 (C1), A01 merged with A01's baseline (A01 ticket 03) recorded, so that R2 and R3 run on the path production uses, and P07 merged, whose candidate chips it extends.

## User Stories

### The tutorial

1. As a freshman, I want quests about 천원의 식사, the lost-and-found, laptop rental, ChatGPT Edu, campus software, the night shuttles, counselling, the practice rooms, S/U grading and the 관악산 trail, so that I learn what students otherwise learn by word of mouth.
2. As a User, I want the quests grouped as 생활, 공부·학사, 이동, 건강 and 문화·여가, so that fifteen quests stay easy to browse.
3. As a User, I want to jump in the pager to a category, so that I start with what I need first.
4. As a User, I want 완료했어요 to complete every quest, 관정 included, so that no quest makes me log in to the library to finish it.
5. As a User on the 관정 quest, I want 어시스턴트에게 예약 부탁하기 still on its sheet, so that I can book through the Assistant.
6. As a User who finished the five quests, I want 내 정보 to say "새 퀘스트가 있어요" and 진행하기 to show the new ones, so that I am not made to start again.
7. As a User, I want to ask the Assistant about a new quest ("노트북 빌리는 곳이 어디야?", "심야셔틀 몇 시까지 있어?") and get an answer from the quest's facts, or its link and "확인되지 않아요" when the facts lack it, so that it never invents hours or prices.
7a. As a User, I want 지도에서 보기 to drop a red pin on the quest's place, so that I see exactly which building or spot is meant.
7b. As a User, I want a tap on that pin to open what the map shows at that Place, such as its 식당 or 공부공간 card, and the pin's label alone where there is nothing (the 행정관 셔틀 정류장), so that the pin is never a dead end.

### The 공부공간 layer

8. As a User, I want a 공부공간 toggle in the 편의기능 stack, above 식당 and 셔틀버스, so that I see where to study.
9. As a User, I want one rounded-square pin per building, merged as "공부공간 N곳 묶음" while the whole campus is in view, so that the map stays readable.
10. As a User, I want a pin's card to list its Study Spaces with their hours, so that I know whether it is open now.
11. As a User, I want 관정관's card to show the free and total seats when I am logged in to the library, and "로그인하면 좌석 현황을 볼 수 있어요" when I am not, so that I know before I walk there.
12. As a 경영학과 student, I want the 경영학도서관 열람실 shown as usable, and as a 국어국문학과 student I want it grey, so that I do not walk to a room I cannot enter.
13. As a User who taps a grey Study Space, I want "○○ 학생만 사용할 수 있어요", so that I know why.
14. As a User whose 내 정보 has no department or no 소속, I want restricted Study Spaces grey, so that the app never says a room is open to me when it does not know.
15. As a User, I want a building whose spaces are all restricted to me to have a grey pin, and a building with some usable spaces to keep its normal pin with only those rows grey, so that I see at a glance where I can go.
16. As a User, I want the menus from a 식당 pin's 메뉴 보기, now that the 메뉴 tile is gone, so that I still find them.

### The seat map

17. As a User looking at the large seat view, I want each seat's number, so that I can pick the seat I know.
18. As a User, I want "빈자리를 누르면 그 자리로 예약할 수 있어요" under the seats card and the Assistant saying "원하는 자리를 눌러 주세요", so that I know a tap books.

### The chat

25. As a User, I want the Assistant's **bold**, italics, line breaks, lists and links shown as such, not as asterisks, so that its replies read cleanly.
26. As a User, I want my own messages shown exactly as I typed them, so that nothing I wrote is reformatted.
27. As a User whose 관정 request misses the time, the space or the kind of seat, I want one short question with the choices as buttons (such as "17:00", "17:30", "1시간", "2시간", or the spaces by name), so that I answer with a tap instead of reading a paragraph and typing.

### Facility booking links

19. As a User who made the Assistant's party "민수랑 종합운동장에서 축구", I want a "시설 예약하기" button on the card that opens the field's booking page, so that I book without looking for the site.
20. As a User whose party is at a place with no online booking, I want no such button, so that the card never points to a page that cannot book it.

### The team

21. As the PM, I want the eval's own bugs fixed and R1 rescored without model calls, so that R1's verdict is read from the right numbers.
22. As the PM, I want two eval cases per new quest, drafted blind and reviewed by me and 함재현, and the suite tagged C1, so that the new content is measured like the old.
23. As the PM, I want a C1 baseline on the Anthropic path and a run after the fixes, so that the accuracy gain is measured, not assumed.
24. As the PM, I want a document of how the Assistant could book facilities later, so that the next step is planned.

## Implementation Decisions

### Files by ticket

| Ticket | Main files |
|---|---|
| 01 | `main-server/content/tutorial.yaml`, `main-server/src/tutorial/tutorial-content.ts`, `tutorial.module.ts`, `tutorial.service.ts`, `main-server/src/common/settings.ts`, `mobile/src/api/tutorial-types.ts`, `mobile/src/screens/main/tutorial/*`, `mobile/src/screens/main/quest-list-rows.ts`, `main-screen.tsx` (`showOnMap`), the map's marker looks (`mobile/src/map/`, `use-things.ts`), `GLOSSARY.md` (Tutorial Category) |
| 02 | `main-server/seed/study-spaces.json`, `main-server/seed/department-colleges.json`, `main-server/src/study-spaces/*`, `main-server/src/app.module.ts`, `mobile/src/screens/main/layers.tsx`, `map-bottom.tsx`, `mobile/src/features/study/*`, `mobile/src/features/map/adapter.ts`, `place-groups.ts`, `mobile/src/screens/main/use-things.ts`, `mobile/src/design-system/map-pin.tsx`, the API mocks, `GLOSSARY.md` (Study Space) |
| 03 | `mobile/src/screens/main/library/seat-map.tsx`, `seats-card.tsx`, `mobile/src/screens/main/chat-bubbles.tsx`, a new `chat-markdown.tsx` |
| 04 | `main-server/eval/library-card.ts`, `main-server/eval/expect.ts` and `score.ts` (choices, the short-ASK check), `main-server/eval/p6/*` (cases, suite.yaml, labels, `tutorial.yaml`, world), new `main-server/test/eval-*.test.ts` |
| 05 | `main-server/src/assistant/library/library-rules.ts`, `find-library-space.ts`, `propose-library-booking.ts` and the library tools, `main-server/src/assistant/feature.ts` and `chosen.ts` (P07-02's `Choice`), `main-server/src/assistant/tools/resolve-friend.ts` if the 학과 is not in its result, `mobile/src/api/assistant-types.ts`, `mobile/src/screens/main/chat-choices.tsx`, `main-server/eval/p6/r2.md`, `r3.md` |
| 06 | `main-server/seed/facility-booking.json`, `main-server/src/assistant/proposal.ts`, `main-server/src/assistant/tools/propose-quest.ts`, `mobile/src/screens/main/chat-proposal-card.tsx`, `mobile/src/api/assistant-types.ts`, `references/ai-facility-booking.md` |

`GLOSSARY.md` is touched by 01 and 02 in different sections, and `mobile/src/api/assistant-types.ts` by 05 and 06 in different types; the second to merge rebases.

### The Tutorial Quests

**Content.** Ten entries join `main-server/content/tutorial.yaml`, taken from `references/quest-candidates.md` (the numbers there). Each keeps the P06 shape (`key`, `order`, `title`, `brief`, `body`, `condition`, `completion`, `completionMessage`, `places`, `links`, `facts`), and each fact carries its `source` and `checked` date.

| Category | order | key | title | from | places | completion |
|---|---|---|---|---|---|---|
| 생활 | 1 | `s-card` | 학생증(S-CARD) 발급받기 | existing | 67, 4 | button |
| 생활 | 2 | `thousand-won-meals` | 천원의 식사 이용하기 | 6 | 63 | button |
| 생활 | 3 | `lost-and-found` | 분실물센터 위치 알아두기 | 35 | 101 (아시아연구소 1층) | button |
| 생활 | 4 | `laptop-rental` | 노트북 대여 서비스 알아두기 | 4 | 102 (정보화본부 101호) | button |
| 공부·학사 | 5 | `kwanjeong` | 관정도서관 예약하기 | existing | 62-1 | button (check behind the flag) |
| 공부·학사 | 6 | `su-grading-option` | 성적평가방법 선택제(S/U) 신청하기 | 22 | none (mySNU) | button |
| 공부·학사 | 7 | `chatgpt-edu` | ChatGPT Edu 무료로 쓰기 | 25 | none | button |
| 공부·학사 | 8 | `ms365-campus-software` | 캠퍼스 라이선스 소프트웨어 받기 | 26 | none | button |
| 이동 | 9 | `admin-shuttle` | 행정관 셔틀 이용하기 | existing | the existing point | button |
| 이동 | 10 | `night-shuttle` | 야간 셔틀 타기 | 9 + 10 | the 행정관 point (탈출셔틀), 302 (심야셔틀, exam period) | button |
| 건강 | 11 | `health-clinic` | 서울대 보건진료소 이용 | existing | 63, floor 3 | button |
| 건강 | 12 | `counseling-center` | 대학생활문화원 상담 알아두기 | 16 | 63 only once its floor is confirmed; else none | button |
| 문화·여가 | 13 | `art-museum` | 서울대 미술관/파워플랜트 관람 | existing | 151, 68 | button |
| 문화·여가 | 14 | `dure-practice-room` | 두레문예관 연습실 예약하기 | 33 | 67 | button |
| 문화·여가 | 15 | `gwanaksan-engineering-trail` | 공학관 코스로 관악산 오르기 | 29 | 301/302 trail entrance point, 연주대 point | button |

- `order` is renumbered so that each category is contiguous. A User's progress is keyed by `key`, so renumbering keeps it.
- `night-shuttle` merges the 탈출셔틀 (from 행정관, 21:10–23:10 every 30 minutes, all year) and the 심야셔틀 (during semesters, 24:00–02:00 every 30 minutes; in the 2026 exam periods from 302동 at 23:40, 00:15, 00:50, 01:25, 02:00). It does not repeat `admin-shuttle`'s daytime line.
- **Re-verified before they are written:** `ms365-campus-software` (whether the licences may be installed on a personal laptop, which 정보화본부 and snu.ac.kr state differently) and `gwanaksan-engineering-trail` (the course, the times, and the trailhead's position). The implementer reads the official pages again and records each fact with the day it was read. A fact the sources still disagree on is left out of `body` and `facts`, so that the Assistant answers it as 확인되지 않아요 with the link. `counseling-center`'s floor (63동 5층 in search results only) is treated the same way.
- **Texts.** Each new quest's `brief`, `body`, `condition` and `completionMessage` are drafted from the research file and marked *drafted* in a comment, for the PM's review on the PR, as P06's were. The research file's `why missed` line is the source of each `brief`.
- **Facts.** Every fact of the research file that the implementer could check on an official page goes into `facts` with its source. Each quest keeps at least one fact the content does not state ("(콘텐츠에 없음)" in the research file, or another), so that ticket 04 has a "missing" case for it.
- Completions that the research file proposes as "앱 검증" (a geofence) or as an Assistant question are not built: every new quest is `button`.

**Categories.**
- `tutorial.yaml` gains a top-level `categories` list, in display order: `{ key, label }` for `life` 생활, `study` 공부·학사, `transit` 이동, `health` 건강, `culture` 문화·여가. Each quest gains `category: <key>`.
- `tutorial-content.ts`'s zod schema requires `category` to be one of the listed keys, every category to hold at least one quest, and a category's quests to be contiguous in `order`. The server fails to start otherwise.
- `GET /tutorial` serves `categories` beside `quests`. The app keeps no copy of the list.
- There is no wireframe frame for categories, so the current tutorial UI is extended, not redesigned:
  - **The pager** (`tutorial-pager.tsx`): the kicker stays "새내기 튜토리얼 n/N", n counting over all fifteen. Under it, a row of the five category chips (the design system's chip, the current category selected) moves the pager to that category's first quest not started, or its first quest when all are started. The title line gains the category's label as a small caption above it.
  - **The quest list** (`quest-list-rows.ts`): the started quests stay one group, "새내기 튜토리얼", sorted by `order`, so they read by category. The kicker becomes "새내기 튜토리얼 · {category label} · n/N".
  - **The sheet** (`tutorial-sheet.tsx`): its kicker gains the category the same way. The dots stay one per quest.
- `GLOSSARY.md` gains **Tutorial Category**.

**The 관정 quest completes with its button.**
- A new server setting, `TUTORIAL_KWANJEONG_CHECK` (boolean, default `false`), in `main-server/src/common/settings.ts`.
- `servedContent` in `tutorial-content.ts` serves a `kwanjeongCheck` quest as `{ kind: 'button' }` unless both `LIBRARY_BOOKING_ENABLED` and `TUTORIAL_KWANJEONG_CHECK` are on. `tutorial.module.ts` passes both. `TutorialService.complete`'s `ACCEPTED_BY` reads the served content, so the 관정 quest then accepts `button` and refuses `checked | forced | skipped`.
- `tutorial.yaml` keeps `completion: { kind: kwanjeongCheck, skipLabel }` for 관정, so that turning the flag on restores P06-05's flow unchanged. The phone's check (`mobile/src/features/tutorial/kwanjeong-check.ts`, `use-tutorial-flow.ts`) is not removed; it runs only for a quest served as `kwanjeongCheck`.
- 어시스턴트에게 예약 부탁하기 stays on the 관정 sheet when the quest is served as a button. Each quest gains an optional `ask` (the words the button sends; for 관정, "관정도서관 7층 열람실에 한 자리 예약해줘", now `KWANJEONG_ASK` in `tutorial-sheet.tsx`). `servedContent` drops `ask` when `LIBRARY_BOOKING_ENABLED` is off, as it adds the official site's link today. The sheet shows the button for any quest with `ask`, under 나중에 and 완료했어요, while `TUTORIAL_SHEET_FLAGS.askAssistantToBook` is on. The skip text button ("이미 예약 및 이용해본 적이 있어요") shows only for `kwanjeongCheck`.
- Existing progress is kept: a 관정 quest completed `checked`, `forced` or `skipped` stays completed. A User whose `finishedAt` was set by the five quests sees "새 퀘스트가 있어요" in 내 정보 and gets the ten new ones on 진행하기 (P06's rule, unchanged).

**지도에서 보기 drops a pin.** Today `showOnMap` in `main-screen.tsx` only moves the camera (`map.goTo(position, 'close')`).
- It now also puts a **tutorial place pin** on the main map at the place's point: a red teardrop with a white circle, as `references/tutorial-place-pin.png`, drawn in the design system's `color.danger` (#C42B2B) with `color.surface` for the circle, as a new marker look of `@/map` (`useMarkerImages`), above the other places. The place's words (`shownPlace` in `tutorial-places.tsx`: the Place's name and floor, or the point's label) stand under it in the map's own text, as a person's name does.
- One pin at a time. It goes when another 지도에서 보기 replaces it, when a tap on the map away from it or a selection of another thing closes it, and when the tutorial is stopped.
- **A tap on the pin.**
  - When the map has a card at that Place's position (a 식당, a 공부공간 building, a place group or any thing there, found as `place-groups.ts` finds things at one place), the tap selects that card, as a tap on its own marker does.
  - Otherwise, for a Place with no card or a point such as the 행정관 셔틀 정류장, the tap shows only the pin and its label; nothing opens. The app has no card for a bare building today, and this ticket does not add one.
- The pin is a JavaScript view rendered into the map's marker images, so there is no native change.

### The 공부공간 layer

**Data: `main-server/seed/study-spaces.json`.** Server-side, beside the Places seed, read once at start (as `RestaurantPlaces` reads `seed/restaurant-places.json`). The app keeps no copy.
- Shape: `{ checkedOn, buildings: [{ place, name, liveSeats: 'kwanjeong' | null, spaces: [{ key, name, kind: 'library' | 'reading' | 'lounge' | 'pc' | 'group', hours, restriction, link, source, confidence, note }] }] }`.
  - `place` is a Place number of the seed; the building's pin stands at that Place.
  - `hours` is display text ("07:00–23:00", "학기 중 24시간 · 방학 08:00–24:00", "평일 09:00–21:00 · 토 10:00–17:00 · 일 13:00–17:00"), or `null` when the sources do not give it (the card then says "운영 시간 확인 필요").
  - `restriction` is `null` or `{ colleges?: string[], departments?: string[], graduateOnly?: true, label }`, where `label` fills "○○ 학생만 사용할 수 있어요" ("경영대학", "화학생물공학부", "전기·정보공학부·컴퓨터공학부", "대학원").
  - `confidence` is `high | medium`; `note` holds a conflict between sources for the reviewer, not shown in the app.
- **What is included.** From `references/study-spaces.md`: the spaces of confidence 높음 or 중간 only. Dormitory spaces (55–58) and cafés (59–64) are left out. The low-confidence ones are left out until the PM checks them on site.
- **One pin per building.** 중앙도서관 (62) and 관정관 (62-1) are one entry each, "중앙도서관" and "관정관", not a row per reading room; their row's text names the main rooms and hours (for 관정관, that 8B열람실 is 대학원생 전용). Their libraries' other rooms (정보검색실, 자료실, SNU Commons, 헤리티지 라운지, 스터디가든, 그룹스터디룸, 옥상정원, 미디어플렉스) are not separate rows.
- The buildings and spaces (from the research file, by its numbers):

| Place | Pin name | Spaces (restriction) | from |
|---|---|---|---|
| 62 | 중앙도서관 | 중앙도서관 (none) | 1, 2, 5, 6, 7 |
| 62-1 | 관정관 | 관정관 (none; 8B 대학원생 전용 in its text), live seats | 8–11, 13–20 |
| 58 | 경영학도서관 | 열람실 (경영대학); 자유열람석 (none); 그룹스터디룸·세미나실 (경영대학) | 21, 22 |
| 72 | 법학도서관 | 열람실 (none; eligibility unconfirmed, `note`) | 25 |
| 15 | 제1법학관 | 열람실 (none; `note`) | 26 |
| 16 | 사회과학도서관 | 자료실 (none); 그룹스터디룸 (사회과학대학) | 27 |
| 75-1 | 농학도서관 | 상록 라키비움 (none); 1층 자료실·열람실 (none). Building 75-1 per the library's page, `note` names 202 | 28, 29 |
| 81 | 수의학도서관 | 자료실·그룹스터디룸 (none); 힐링·회복 공간 (수의과대학) | 30 |
| 74 | 음악도서관 | 열람실·그룹스터디룸 (none) | 31 |
| 140-1 | 국제학도서관 | 자료실 (none) | 32 |
| 44-1 | 공대 신양학술정보관 | 3층 자유열람실 (none); 정보화열람실·PC실 (none); 4층 그룹스터디실 (공과대학) | 33, 34, 35 |
| 300 | 유회진학술정보관 | 스터디룸 (공과대학) | 35 |
| 301 | 제1공학관 | 해동학술정보실 (전기·정보공학부, 컴퓨터공학부); 기계공학부 해동스터디홀 (기계공학부); 컴퓨터공학부 학생공간 (컴퓨터공학부). Building 301 per cse.snu.ac.kr, `note` names 310 | 37, 38, 40 |
| 302 | 제2공학관 | 화생공 해동학술정보실·학생라운지 (화학생물공학부; 복수전공·자유전공 등록 in its text); 소프트웨어실습실 (컴퓨터공학부) | 39, 40 |
| 4 | 인문대 신양학술정보관 | 1층 라운지 (none) | 50 |

- **Department → college: `main-server/seed/department-colleges.json`.** Built from the app's department list (`mobile/src/screens/onboarding/departments.ts`, `UNDERGRADUATE` and `GRADUATE`): every department name to its college ("기계공학부" → "공과대학"). A graduate group ("일반대학원 · 공학") is mapped department by department to the college that runs it; a name with no college (협동과정, most 전문·특수대학원) maps to `null`. The table is reviewed on ticket 02's PR.
- **Usable.** `GET /study-spaces` (signed in) answers the buildings with each space's `usable: boolean` and `restrictedTo: label | null`, from the User's `department` and `affiliation`:
  - no restriction: usable;
  - `departments`: usable when the User's department is listed;
  - `colleges`: usable when the table maps the User's department to a listed college;
  - `graduateOnly`: usable when `affiliation` is `graduate`;
  - an empty department, a department missing from the table, or no 소속 where `graduateOnly` needs one: **not usable**.
  - A building is `usable` when any of its spaces is.
- The service is `main-server/src/study-spaces/` (`study-spaces.module.ts`, `study-spaces.service.ts`, `study-spaces.controller.ts`, `dto/`), using `PlaceLookup` to place each building and failing the start on a Place number the seed does not hold, as the tutorial does.

**App.**
- **The stack** (`layers.tsx`): `Layers` gains `study`, `LayerStack` gains `toggleStudy`, and the toggles are, from the bottom up, 식당, 셔틀버스, 공부공간 (`book`, `color.svcStudy` #0369A1). `MenuTile` and the `onMenus` prop are removed, from `LayerControls` and from `map-bottom.tsx`. The button's label becomes "편의기능 (식당 · 셔틀버스 · 공부공간)".
- **The menus** are reached from a 식당 pin's 메뉴 보기, which `features/dining/adapter.ts` already offers; nothing else opens them from the map.
- **Pins** (`features/study/`, `features/map/adapter.ts`, `use-things.ts`): `PlaceKind` gains `library`, drawn by `map-pin.tsx`'s existing `library` category as a **rounded square** (the wireframe's study pin), one per building. A grey building (not `usable`) is drawn translucent grey. While the whole campus is in view (the `overview` level), study pins whose markers would overlap merge into one rounded-square cluster marker with its count, labelled for a screen reader "공부공간 N곳 묶음 · 눌러서 확대"; a tap zooms in on them. A building that holds other things too follows P20-04's one-marker-per-place rule (`place-groups.ts`).
- **The card** (the wireframe's pin card): the building's name, its 동, then one row per Study Space with its name and hours. A space with a `link` offers it. The primary button is "좌석 현황" for 관정관 and "길찾기" for every other building.
  - **관정관's seats.** With a Library Session, the card shows "남은 좌석 k / 전체 n", read by the phone (`mobile/src/library/client.ts`, `seats`) for each seat sector of the catalogue bookable now (8B only for a 대학원생), summed: free is STATUS 1 and USECNT 0, as the seat map reads it, and STATUS 9 is not counted. Without a session: "로그인하면 좌석 현황을 볼 수 있어요", with no login prompt from the card. A failed read shows the hours only. The counts stay on the phone (ADR 0012). 좌석 현황 opens the chat and sends "관정도서관 좌석 현황 보여줘", which the Assistant answers by its rules.
  - No other building has live seats. 중앙도서관's 3A/3B (libseat) is not used.
  - **Grey rows.** A space that is not `usable` is drawn in translucent grey in an otherwise normal card. Tapping it shows "{restrictedTo} 학생만 사용할 수 있어요" (for 대학원, "대학원생만 사용할 수 있어요"). A grey building's pin opens the same card, every row grey.
- The API mock and its fixture (`mobile/src/api/mock/`) serve a set of buildings covering: all usable, mixed, all restricted, 관정관.
- `GLOSSARY.md` gains **Study Space**, with _Avoid: Library Space_.

### The chat's display (app only)

**The seat map.**

- `SeatMap` in `seat-map.tsx` gains a `numbered` prop. `LargeSeatMap` passes it; `SmallSeatMap` does not, so the small card stays colour only.
- A numbered seat draws its `VNAME` centred in its box, in a font sized to the box (no larger than the box's height, no smaller than 8 px), dark ink on a free seat's orange and on a taken seat's pale fill. The text is not a separate accessible element; the seat's label ("{VNAME}번 빈 자리") is unchanged.
- `seats-card.tsx`: under the caption, "빈자리를 누르면 그 자리로 예약할 수 있어요" in the caption's style (`styles.caption`), shown while seats can be booked (`bookable`), not with `BOOKING_CLOSED`. A room sector does not show it.
- The Assistant's "원하는 자리를 눌러 주세요" is a prompt change and so belongs to ticket 05, which measures it.

**Markdown in the Assistant's bubbles.**
- A hand-written subset in `mobile/src/screens/main/chat-markdown.tsx`, used by `chat-bubbles.tsx` for the Assistant's bubbles only; the User's bubbles keep their plain `Text`. No dependency is added (a markdown library would bring a parser far larger than the subset needs), so there is no native change.
- What it renders: `**bold**` and `__bold__` in the semibold font; `*italic*` and `_italic_` in italics; line breaks as they are; a line starting `- `, `* ` or `1. ` as a list item with its bullet or number and a hanging indent; `[words](url)` as a link.
- **Links** are rendered as links only when the URL is `https:` (or `http:`) and parses; pressing one opens it with `expo-web-browser`, as the tutorial's links do. Any other scheme (`javascript:`, `tel:`, `intent:`, a relative path) is shown as its words in plain text, with no press. A bare URL in the text stays text.
- Anything else (headings, code, tables, images, HTML, nesting beyond bold inside a list item) is shown as its plain text with the markers that are not understood left in, never dropped, so no words are lost. An unclosed `**` is shown as written.
- The renderer is a pure function from the text to a list of styled runs and blocks, so that it is unit-tested apart from the bubble; the bubble's accessible label is the text without the markers.
- No native file changes.

### Facility booking links

- **The table: `main-server/seed/facility-booking.json`.** Each entry names a Place by number, or by name for a Place the seed holds without a number, and gives `{ site: 'athletics' | 'ssims', label, url }`.
  - athletics.snu.ac.kr: the deep links for 종합운동장 (`facility_idx=1`), 보조운동장 (2), 71-1동 301호 (17) and 101호 (18), GX룸 (19), 무용실 (20), 한국무용실 (24), 탁구장 (27), 풋살장 (30), 공대 농구장 (35), as `https://athletics.snu.ac.kr/facility/list?mode=view&facility_idx=N`. A facility inside a building whose Place holds several (71-1동) links the list page, `https://athletics.snu.ac.kr/facility/list`, and the card's label says so ("체육시설 예약 목록"). The implementer checks each facility's Place in the seed (some have no number, such as 종합운동장); one the seed does not hold is left out and listed in the PR.
  - ssims.snu.ac.kr (예약하샤): the index `https://ssims.snu.ac.kr/index.do` for the buildings whose study rooms it books (58, 44-1, 300, 301). Deep links wait for the PM's browser check (Out of Scope).
- **The Proposal** (`main-server/src/assistant/proposal.ts`): `ProposalPlace` gains `booking: { label, url } | null`, filled by `placeOf` in `tools/propose-quest.ts` from the table. `questProposalSchema`'s `place` accepts an optional `booking` (the app sends the Proposal back), which proposeQuest ignores and fills again.
- **The card** (`chat-proposal-card.tsx`): once `making` is `made`, a Proposal whose place has `booking` shows a full-width secondary "시설 예약하기" button under the two buttons, opening `booking.url` with `expo-web-browser`. Before 만들기, and for a place without `booking`, nothing is shown. The model is not told about links, so the prompt does not change.
- **The research and design document**, `references/ai-facility-booking.md`, a TODO for later: for athletics.snu.ac.kr and ssims.snu.ac.kr, how the User logs in (SNU SSO or the site's own), whether a phone-side session like 관정's (ADR 0012: a web view, the session in its cookie jar, calls through a hidden same-origin web view) works there, which requests book and cancel, what each needs (names, 학번, group size), the sites' terms, and what tools and cards the Assistant would need. It reads only public pages and does not log in or book.

### P6 eval: fixes, new cases and C1

**First part (wave 1).**
- **The scorer** (`main-server/eval/library-card.ts`): `keyParts` reads the optional `s=` and `e=` segments after the five fixed ones, as `src/assistant/library/library-card.ts` writes them, and `equipment` and `seat` are read from the key when the card has no field.
- **The labels**, each entered with `revises:` and `reason:` in `eval/p6/suite.yaml` (the P5 form):
  - `p6-spaces-alias-imac` expects Media Carrel A in `seat`, not in `equipment`;
  - `p6-common-free-time-not-library`, `p6-tutorial-exhibition-today` and `p6-tutorial-health-clinic` drop from `tools.only` what the chat's rules require (`resolvePlace`, `showGlobalEvents`, `getMyDay` as the rules make it), keeping `forbidden` for the library tools.
- **R1 rescored** from its saved results (`eval/results/…-3.json`) with `pnpm eval:score`, with no model call. `r1.md` gains a section with R1 as run and R1 after the fixes, threshold by threshold, and drops the 잠정 note's open points it answers. A threshold is never changed.
- **The plain-node test**: `eval/cli.ts` (and so `cases.ts`) loads under plain `node`, which a type-only import as a value broke at #188 (fixed at #189).

**Second part (after 01 and P07-02).**
- **Twenty cases**, two per new quest, in `eval/p6/cases/tutorial.yaml`: one asks a fact the content states (`text.mentions` the fact), one asks what the content lacks (the quest's link or 확인되지 않아요, and `text.absent` for a made-up value where one is tempting). Times in `text.mentions` are HH:MM.
- **Labels**, as at C0: an agent in a separate session drafts each `expect` blind, seeing only `rules.md`, `world.yaml`, the catalogue, the tutorial copy and the questions; the PM rules on the draft in `labels-notes.md`; 함재현 reviews the labels on the PR.
- **The tutorial copy** (`eval/p6/tutorial.yaml`) becomes the new `content/tutorial.yaml`, entered with `revises:`. Cases that read the number of quests (`p6-tutorial-progress`) and the world's tutorial progress are revised for fifteen quests.
- **Choices in scoring.** A reply's `choices` (P07-02's candidate chips, `AssistantReply.choices`) are recorded by the runner with the reply, and `text.mentions` on a case labelled ASK is checked against the reply's text **and** its choices' labels together, so that an ASK whose candidates come as buttons, not in its text, still passes its label. `text.absent` is still checked against the text and the labels both. A new assertion `expect.choices` (the labels or ids the chips must hold, in any order) is available to the labels.
- **Short ASKs.** A new check, `text.maxLength`, taken into the suite at C1 through `revises:` on every case labelled ASK: the reply's text, without its choices, is at most 80 characters and one sentence (one question mark, no line break). It is a per-case assertion, so it enters the overall and per-category thresholds as they are, and no threshold changes.
- **Tools of an ASK.** The C0 labels of the ASK cases forbid every tool before the question (`tools.only: []` or `forbidden`). Under the ASK ruling below, those cases' `tools` are revised at C1 to `only: [findLibrarySpace]`, called once, with every book, cancel or return card forbidden, each entered with `revises:` and the reason "reverses the 2026-11-02 ruling 'ASK calls no tool', decided 2026-11-04". A case whose ambiguity is not 관정's (two Friends of one name, which `resolveFriend` answers) keeps its own single resolver.
- **C1.** The suite's version moves to C1 (cases, world, rules, labels, thresholds unchanged except by `revises:`), committed and tagged `eval-freeze-iter3-p6-c1`, recorded in `suite.yaml`'s `freeze` as `c1Tag` and `c1Commit`. The tutorial category's count grows from 8 to 28 cases; the frozen thresholds apply to it as they are.

### 관정 accuracy (after A01)

- **R2: the C1 baseline** on the Anthropic path (`MODEL_PROVIDER=anthropic`, A01's caching default), on `3.0/Main` after 04 and A01, before any change below. Recorded in `eval/p6/r2.md` in `r1.md`'s form. R2 also re-reads the per-turn input growth: the input tokens of one P6 turn and one P19 turn, split into the system prompt, the tools' descriptions (with `findLibrarySpace`'s catalogue counted apart) and the conversation, from a recorded request.
- **The fixes**, each to a failure cause of R1 or R2 (`main-server/src/assistant/library/library-rules.ts` and the tools under `src/assistant/library/`):
  - a room-request card's reply says that the Friends are asked for their 동의 and the room is booked after they agree, not "예약하기를 눌러야";
  - **the ASK ruling** (PM, 2026-11-04, Q22 option A; it reverses the 2026-11-02 ruling "an ASK calls no tool"): an ASK makes no booking, cancel or return card, and it may call exactly one fixed choices tool, `findLibrarySpace`, the tool whose result fills P07-02's chips, to offer its options. Each ambiguous request has one fixed tool path, so the run stays single and deterministic: "7층 열람실" calls `findLibrarySpace` once and shows the four 7층 seat spaces as chips; a request with the space known and no time calls it once and gets time chips; a room with no duration gets duration chips. No other tool (`proposeLibraryBooking`, `showLibrarySeats`, `findLibraryFreeSlots`) runs before the User answers. Two Friends of one name are told apart by their 학과 (from `resolveFriend`'s result; the tool adds the department if it does not give it);
  - 대학원 열람실 eligibility comes from the tool (its `notEligible` from 소속), never from the catalogue's status alone: the rule that answers 대학원생 전용 without a tool is replaced;
  - "취소해줘" and "반납해줘" call `proposeLibraryCancel` and `proposeLibraryReturn` (with `findLibrarySpace` first when a space is named) instead of asking which booking;
  - an unsupported request is refused with "미구현";
  - every time in a reply is HH:MM (the clinic's 17:30);
  - the VR room's useDesc is left out (the card asks), as no stated purpose fits it;
  - with a seats card, the reply says "원하는 자리를 눌러 주세요";
  - the per-turn input: if R2 shows `findLibrarySpace`'s catalogue is the growth, the catalogue is shortened or moved to the tool's result, measured in R3; otherwise R2's reading is recorded and nothing changes.
- **Choices as buttons for 관정's ASKs.** When the Assistant needs more from the User, it asks in one short line and the choices come as chips under it, so that the User never reads a paragraph of options.
  - **Reused: P07-02's candidate chips** (#170, branch `3.0/P07-02-chips-and-resolution-events`). P07-02 adds `Choice { kind, id, label, words }` to the reply (`feature.ts`, `AssistantReply.choices`), filled from a resolver's `several` answer; `chat-choices.tsx` draws them as chips, a row per kind; a tap sends the label as the User's message with `chosen`, which the server checks again (`chosen.ts`, `checkedChoice`) and gives the next run's tools. That is the mechanism this needs, so it is extended rather than copied, and ticket 05 waits for P07.
  - `ChoiceKind` gains `librarySpace` (id: a catalogue id), `libraryStart` (id: `HH:MM`) and `libraryMinutes` (id: the minutes as a number). `checkedChoice` checks them: a catalogue id that is bookable, a start that is a half hour inside the space's hours and window today, minutes that the space allows. A choice that fails is dropped and the message stands as its text, as P07-02 does.
  - **Where the choices come from**: one tool, `findLibrarySpace`, not the model, so that the buttons are always valid and an ASK is one call. It gains optional inputs for what the User already gave (`date`, `start`, `minutes`) and answers, in this order:
    - several bookable spaces for the words: each as a `librarySpace` choice, labelled by its name ("7층 열람실 일반석", "7A 2구역"). This covers "which space or sector" and "which kind of seat";
    - one space and no start: up to six `libraryStart` choices, the next half-hour starts from now (rounded up) that are inside the space's hours and window, in order;
    - one space, a start and no duration: `libraryMinutes` choices of 1, 2 and 3 hours ("1시간", "2시간", "3시간"), those the space allows;
    - otherwise the one space with no choices, and the model goes on to `proposeLibraryBooking` as today.
  - The rule in `LIBRARY_RULES`: when a tool returns choices, ask for that one thing in one short sentence ("몇 시부터 쓸까요?", "어느 자리로 할까요?") and do not list the choices in the text: the chips show them.
  - `mobile/src/api/assistant-types.ts`'s `Choice` gains the three kinds; `chat-choices.tsx` shows them as it shows the others, a row per kind. A tap on a start sends "17:00", on a duration "2시간", on a space its name.
- **R3** runs on the commit with the fixes, with the same model, limits and caching, recorded in `eval/p6/r3.md`. The target: all 9 frozen thresholds pass, and each R1 failure cause above is gone or explained.
- **P19 regression**, as P06-07's: the P19 set three times on R2's commit and three on R3's, with a budget that runs all 75 turns; no case newly fails (fails in at least 2 later runs and at most 1 baseline run). The P4 and P5 suites once each, as a report.
- **Cost.** One-off runs; the estimate (from A01 ticket 03's measured cost per turn) is approved by the PM before each run.

## Testing Decisions

- A good test drives the feature from outside and checks what a User or a client sees: an HTTP reply, a press and the screen, a request a fake receives. It does not check internal calls or prompt wording. File names follow ADR 0007: `.unit.test.ts(x)` or `.integration.test.ts(x)`; each runner picks up only its own suffix.
- **Server, without a model:**
  - the tutorial content (unit, `test/tutorial-content.unit.test.ts`): fifteen quests load; a quest with an unknown `category`, an empty category, or a category split in `order` fails; every Place number exists in the seed (`test/tutorial-content.integration.test.ts`, which starts the module);
  - the 관정 completion (integration, `test/tutorial-progress.integration.test.ts`): with the flag off the quest is served as a button with its `ask` and completes by `button` only; with `LIBRARY_BOOKING_ENABLED` and `TUTORIAL_KWANJEONG_CHECK` on it is served as `kwanjeongCheck` and accepts `checked | forced | skipped` only; a User finished at five quests sees the new ones after `enable`;
  - the Study Spaces (unit, `test/study-spaces-file.unit.test.ts`: the file parses, keys are unique, every restriction names a college or department of the table; integration, `test/study-spaces.integration.test.ts`: `GET /study-spaces` for a 경영학과, a 국어국문학과, a 화학생물공학부 and a graduate User, for an empty department and for no 소속, and a building `usable` when any space is);
  - the department table (unit, `mobile/__tests__/department-colleges.unit.test.ts`, which reads the server's JSON beside the app's list): every department of `UNDERGRADUATE` and `GRADUATE` has an entry;
  - the facility links (unit, `test/facility-booking-file.unit.test.ts`: the file parses, every URL is on athletics.snu.ac.kr or ssims.snu.ac.kr; integration, `test/assistant-proposals.integration.test.ts` extended with the scripted model: a Proposal at 종합운동장 carries its deep link, one at 301 the ssims index, one at 63 none, and a Proposal sent back with `booking` is accepted);
  - the eval harness (reported apart from the product's pyramid, ADR 0007): `test/eval-library-card.unit.test.ts` (a key with `s=` and `e=` gives the seat and the equipment), `test/eval-cli-plain-node.integration.test.ts` (spawns `node eval/cli.ts --world p6` without `--yes`, with stdin not a terminal and a dummy key, and checks that it reaches the estimate and exits without `ERR_MODULE_NOT_FOUND`), `test/eval-cases.integration.test.ts` extended (the twenty new cases load and each names a quest of the copy), and `test/eval-ask-choices.unit.test.ts` (an ASK's `text.mentions` met by a choice's label and not by the text alone passes; `text.absent` fails on a label; `text.maxLength` fails at 81 characters and on two sentences; `expect.choices` in any order).
  - the 관정 choices (integration with the scripted model, `test/assistant-library-choices.integration.test.ts`): `findLibrarySpace` with several spaces gives `librarySpace` choices and no card; with one space and no start it gives the next half-hour starts inside the hours and window, and with no duration the allowed 1–3 hours; an ASK run calls it once and no other tool; a sent `chosen` of each kind is checked again, and a start outside the hours or an unknown id is dropped.
- **App, against its mocks and the fake library** (prior art: `tutorial-pager`, `tutorial-sheet`, `layers`, `dining-layer`, `chat-library-rooms-seats`, `chat-proposal-card` integration tests):
  - `__tests__/tutorial-pager.integration.test.tsx` and `tutorial-sheet.integration.test.tsx`: the category chips move the pager; the caption and the list's kicker name the category; the 관정 sheet served as a button shows 완료했어요 and 어시스턴트에게 예약 부탁하기, with no skip; `tutorial-kwanjeong-check.integration.test.tsx` keeps passing with the quest served as `kwanjeongCheck`;
  - `__tests__/study-layer.integration.test.tsx`: the toggle, one pin per building, the cluster at the overview level, the card's rows and hours, a grey row and its words, a grey building, 관정관 with a session (the counts from the fake library) and without (the login line, and no request to the fake library);
  - `__tests__/layers.integration.test.tsx`: three toggles, no 메뉴 tile; `dining-layer.integration.test.tsx`: 메뉴 보기 opens the menus;
  - `__tests__/chat-library-seat-numbers.integration.test.tsx`: the large view shows each seat's number, the small one none; the hint shows while bookable and not with `BOOKING_CLOSED`;
  - `__tests__/chat-markdown.unit.test.ts`: bold, italics, line breaks, `-` and `1.` lists, an https link, a `javascript:` link shown as plain words, an unclosed `**` and a heading kept as written; `__tests__/chat-markdown.integration.test.tsx`: an Assistant bubble shows **bold** without asterisks and opens an https link with `expo-web-browser`, and a User's bubble with the same text shows it unchanged;
  - `__tests__/tutorial-place-pin.integration.test.tsx`: 지도에서 보기 puts one pin with the place's words; a second replaces it; a tap on a pin at a Place with a 식당 card opens that card; a tap on the 행정관 셔틀 정류장's pin opens nothing;
  - `__tests__/chat-library-choices.integration.test.tsx`: a reply with `libraryStart`, `libraryMinutes` and `librarySpace` choices shows a row of chips per kind, and a tap sends "17:00" (or "2시간", or the space's name) with `chosen`;
  - `__tests__/chat-proposal-card.integration.test.tsx`: no 시설 예약하기 before 만들기 or without `booking`; after 만들기 it opens the URL.
- **By hand**, on one real phone: 관정관's seat count with a real Library Session against the real site (ticket 02), and the athletics deep links opening their facility (ticket 06, a check in the PR).
- **Eval with the real model**, outside CI: R2, R3 and the regressions (ticket 05).

## Out of Scope

- **Cafés in the 식당 layer** (research items 59–64). TODO: they join the 식당 layer later, not the 공부공간 layer.
- **The low-confidence Study Spaces** (research items 3, 4, 12, 23, 24, 36, 41–49, 51–54, 63, 65). TODO: the PM checks them on site, and the confirmed ones are added to `study-spaces.json`.
- Dormitory study rooms (items 55–58), which only residents use.
- Live seats anywhere but 관정관, including 중앙도서관 3A/3B through libseat.
- **ssims.snu.ac.kr deep links.** TODO: after the PM checks the site in a browser (it answered automated reads with 403), deep links replace the index.
- **The Assistant booking facilities** other than 관정. TODO: `references/ai-facility-booking.md` is the plan.
- **Moving the current time out of the system prompt** (A01's TODO). It changes the prompt's prefix, which P13's runs must hold still to compare R2 with R3; it stays A01's TODO.
- Completions checked by the app other than 관정 (geofences, the Assistant's questions), and research items not chosen here.
- Clustering in the 식당 layer.
- iOS distribution. The code is cross-platform.

## Further Notes

- **Decisions this spec made that the grilling did not cover**, for the PM to check on the PR:
  - the category keys and the order of quests within a category (the grilling's list order);
  - the category chips in the pager, and the category in the list's kicker, as the "current tutorial UI" extension;
  - the `ask` field and the `TUTORIAL_KWANJEONG_CHECK` name;
  - whether a space is usable is decided by the server, from the department table, so the app has no copy of either;
  - 관정관's 좌석 현황 opens the chat with "관정도서관 좌석 현황 보여줘";
  - the 관정관 count sums the seat sectors bookable now, with 8B for 대학원생 only;
  - spaces whose eligibility the sources leave open (법학도서관, 제1법학관) are shown as usable, with a `note`;
  - the ssims index goes on 58, 44-1, 300 and 301;
  - the seat-map hint shows only while seats can be booked;
  - the tutorial pin's tap selects the map's card at that Place, if there is one, and otherwise does nothing beyond showing the pin and label; it is drawn in `color.danger`, the design system's red, not the reference image's own red;
  - markdown is a hand-written subset, not a library, and only https and http links are live;
  - the 관정 choices are P07-02's chips extended with three kinds, made by the tools; up to six half-hour starts and 1, 2 and 3 hours;
  - the short-ASK check is 80 characters and one sentence, and it enters at C1 through `revises:` with no threshold change;
  - **the ASK ruling** reverses the 2026-11-02 ruling 'ASK calls no tool', decided 2026-11-04, chosen by the PM (Q22, option A): an ASK makes no booking, cancel or return card and may call exactly one fixed choices tool, `findLibrarySpace`, whose result fills P07-02's chips; each ambiguous request keeps one fixed tool path. Ticket 04 part B enters the ASK labels at C1 with `revises:` and this reason; ticket 05 writes it into `LIBRARY_RULES`.
- The three items added after the first review (markdown, the place pin, choices as buttons) were folded into tickets 03, 01, and 04 and 05, so that the waves stay as they were, with 04's second part and 05 also waiting for P07-02 or P07.
- R1's per-turn input growth (44k → 70k) is P19's average; the catalogue in `findLibrarySpace`'s description is the suspect (r1.md), not yet measured.
- The low-confidence space list for the PM's site visit is kept outside the repository (the PM's own list).
