# Scorecard: 2026-11-18-cb069635-dirty-openrouter-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-cacheoff

## Action recall

A turn counts toward the kinds of the action it took when the case accepts it, else of the first action the case accepts; it is recalled when the action it took is accepted and, when it asks, the text holds the case's mentions. Known failures are included.

| Kind | Expected | Recalled | Recall |
| --- | --- | --- | --- |
| TOOL | 18 | 17 | 94.4% |
| ASK | 4 | 2 | 50.0% |
| PROPOSE | 17 | 15 | 88.2% |
| REFUSE | 0 | 0 | — |
| CHAT | 0 | 0 | — |

## Expected and observed actions

For diagnosis only: the observed action is read without the case, the last sentence asking back by a fixed list of cues (`ASK_CUES` in eval/observed.ts) or the trace calling for a question. NO_TOOL is a reply with no tool and no question, REFUSE and CHAT alike; NONE called tools and took none of the kinds.

| Expected | TOOL | TOOL+ASK | PROPOSE | PROPOSE+ASK | ASK |
| --- | --- | --- | --- | --- | --- |
| TOOL+ASK | 1 | 0 | 0 | 0 | 0 |
| TOOL | 14 | 3 | 0 | 0 | 0 |
| PROPOSE | 1 | 0 | 11 | 3 | 0 |
| PROPOSE+ASK | 0 | 0 | 2 | 0 | 0 |
| ASK | 0 | 0 | 0 | 0 | 1 |

## Tools

| Measure | Value |
| --- | --- |
| Tool selection accuracy | 35/36 (97.2%) |
| Argument accuracy | 28/29 (96.6%) |
| Over-calling | 5/36 (13.9%) of turns, 8 calls |
| Under-calling | 1/36 (2.8%) of turns, 1 tools |

## Pass rate per category

Known failures are counted apart and never as regressions. Failure kinds count the scored turns that failed so.

| Category | Passed | Known failures passed | STEP_LIMIT | TIMEOUT | ERROR |
| --- | --- | --- | --- | --- | --- |
| ambiguous-intent | 0/0 (—) | 0/1 | 0 | 0 | 0 |
| compound | 3/3 (100.0%) | 0/0 | 0 | 0 | 0 |
| follow-ups | 2/4 (50.0%) | 1/1 | 0 | 0 | 0 |
| global-events | 1/2 (50.0%) | 0/0 | 0 | 0 | 0 |
| live | 3/3 (100.0%) | 0/0 | 0 | 0 | 0 |
| making-parties | 7/7 (100.0%) | 1/1 | 0 | 0 | 0 |
| menus | 6/6 (100.0%) | 1/1 | 0 | 0 | 0 |
| no-data | 4/4 (100.0%) | 0/0 | 0 | 0 | 0 |
| **All** | 26/29 (89.7%) | 3/4 | 0 | 0 | 0 |

Known failures that now pass, whose `knownFailure` mark is to be removed:

- follow-up-second-same-name-friend: Resolving 박서준 again answers both, and nothing tells them apart, until improvement 3-4 and a resolveFriend that returns something distinguishing
- making-parties-abbreviation-hakgwan: "학관" is not read as 학생회관 (63동): resolvePlace matches substrings, and 학생회관 does not hold 학관
- menus-abbreviation-hakgwan: "학관" is not read as 학생회관: names are matched as substrings, and 학생회관식당 does not hold 학관

## pass^3

2/2 (100.0%) of the repeated cases passed every run.

| Case | Runs passed |
| --- | --- |
| making-parties-lunch-with-friend | 3/3 |
| menus-today-lunch | 3/3 |

## Steps, latency and cost

| Turns | Average steps | Average latency | Tokens in | Cache read | Cache write | Tokens out | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 2.89 | 4.6 s | 2,868,685 | 0 | 0 | 22,469 | USD 0.2981 |

## Settings

| Setting | Value |
| --- | --- |
| provider | openrouter |
| cache | off |
| model | anthropic/claude-haiku-5.5 |
| temperature | default |
| topP | default |
| maxSteps | 8 |
| timeoutMs | 30000 |
| maxOutputTokens | 4000 |
| repeat | default |
| categories | all |
| caseIds | ambiguous-intent-lunch-at-student-center, compound-menus-and-shuttle, compound-this-week-menus, compound-proposal-two-friends-place-event, follow-up-chosen-minsu, follow-up-second-same-name-friend, follow-up-seven-oclock, follow-up-make-instead, follow-up-yes-after-menus, global-events-tonight-talk, global-events-weekend-festival, live-lunch-then-seven, live-which-minsu, live-menus-then-tomorrow, making-parties-lunch-with-friend, making-parties-breakfast-by-building-number, making-parties-open-dinner, making-parties-approval-tennis, making-parties-abbreviation-hakgwan, making-parties-friday-dinner, menus-today-lunch, menus-tomorrow-breakfast, menus-today-dinner-restaurant, menus-tomorrow-whole-day, menus-abbreviation-hakgwan, no-data-menus-day-after-tomorrow, no-data-restaurant-breakfast, no-data-events-day-after-tomorrow, no-data-meal-parties-day-after-tomorrow |
| budgetUsd | 1.5 |
| world | small |
| commit | cb069635-dirty |

## Failed cases

### ambiguous-intent-lunch-at-student-center (ambiguous-intent, known failure: No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other))

- Turn 1, "내일 학생회관에서 점심": took TOOL, accepted TOOL+ASK
  - action: took TOOL, expected TOOL+ASK
  - text.mentions: missing ["잡아 드릴까","약속을 잡을까","만들어 드릴까","모집해 드릴까","만들까요"]
  - Steps:
  1. finish tool-calls, 2438 ms
     - getMenus `{"date":"2026-10-22","meal":"lunch","restaurant":"학생회관"}` → found: `{"result":"found","date":"2026-10-22","restaurants":[{"name":"학생회관식당","collectedAt":"2026-10-21T07:00:00+09:00","meals":[{"meal":"lunch","lines":["닭갈비덮밥 : 6,000원"]}]}]}`
  2. finish tool-calls, 991 ms
     - showOnMap `{"layer":"dining"}` → shown: `{"result":"shown","layer":"dining"}`
  3. finish stop, 1188 ms
  - Reply (75 characters):

> 내일(10/22) 학생회관식당 점심 메뉴는 닭갈비덮밥(6,000원) 하나예요. 메뉴는 2026-10-21 07:00에 수집된 정보예요.


### follow-up-seven-oclock (follow-ups)

- Turn 2, "7시로 바꿔줘": took PROPOSE, accepted PROPOSE+ASK
  - action: took PROPOSE, expected PROPOSE+ASK
  - text.mentions: missing ["오전 7시","아침 7시","오전","아침","07:00","7:00"]
  - Steps:
  1. finish tool-calls, 3783 ms
     - proposeQuest `{"title":"이민수와 점심","description":"학생회관에서 저녁 먹기","joinPolicy":"closed","capacity":2,"startsAt":"2026-10-22T19:00:00+09:00","placeId":"e3b13da4-ec15-5b6e-ba98-a0fd4346e08b","inviteeIds":["245c182c-d8a8-4c58-98f7-9cec56f8f97d"]}` → proposed: `{"result":"proposed","proposal":{"title":"이민수와 점심","description":"학생회관에서 저녁 먹기","joinPolicy":"closed","board":null,"capacity":2,"startsAt":"2026-10-22T19:00:00+09:00","place":{"id":"e3b13da4-ec15-5b6e-ba98-a0fd4346e08b","name":"학생회관"},"globalEvent":null,"invitees":[{"id":"245c182c-d8a8-4c58-98f7-9ce…`
  2. finish stop, 1191 ms
  - Reply (87 characters):

> 시간을 내일 저녁 7시(19:00)로 바꿨어요. 점심 약속이었던 만큼 저녁 7시가 맞는지 확인해 주세요. 아직 만들어지지 않았고, 만들기를 누르면 생성돼요.


### follow-up-yes-after-menus (follow-ups)

- Turn 2, "응 김지은이랑": took TOOL, accepted PROPOSE
  - action: took TOOL, expected PROPOSE
  - tools.required: proposeQuest not called
  - proposal: wrong or missing: joinPolicy, capacity, startsAt, place, invitees
  - Steps:
  1. finish tool-calls, 2152 ms
     - resolveFriend `{"name":"김지은","forTool":"findMealRestaurants"}` → one: `{"result":"one","candidate":{"id":"033b545d-e5cf-4a5b-aea9-464c34b9cf70","name":"<data label=\"friend.name\">김지은</data>"}}`
     - getMenus `{"date":"2026-10-22","meal":"lunch","restaurant":"학생회관"}` → found: `{"result":"found","date":"2026-10-22","restaurants":[{"name":"학생회관식당","collectedAt":"2026-10-21T07:00:00+09:00","meals":[{"meal":"lunch","lines":["닭갈비덮밥 : 6,000원"]}]}]}`
  2. finish tool-calls, 1170 ms
     - findMealRestaurants `{"date":"2026-10-22","meal":"lunch","friendIds":["033b545d-e5cf-4a5b-aea9-464c34b9cf70"]}` → found: `{"result":"found","collectedAt":"2026-10-21T07:00:00+09:00","shared":[{"start":"11:00","end":"14:30"}],"restaurants":[{"key":"학생회관식당","name":"학생회관식당","place":{"id":"e3b13da4-ec15-5b6e-ba98-a0fd4346e08b","name":"학생회관"},"lines":["<data label=\"menu.line\">닭갈비덮밥 : 6,000원</data>"],"start":"2026-10-22T11…`
  3. finish tool-calls, 1023 ms
     - showRestaurants `{"keys":["학생회관식당"]}` → shown: `{"result":"shown","keys":["학생회관식당"]}`
     - showOnMap `{"layer":"dining"}` → shown: `{"result":"shown","layer":"dining"}`
  4. finish stop, 2081 ms
  - Reply (212 characters):

> 김지은 님과 내일(10/22) 점심에 학생회관식당에서 드실 수 있어요. 두 분이 함께 가능한 시간은 11:00~14:30이고, 메뉴는 닭갈비덮밥(6,000원)이에요. 메뉴는 2026-10-21 07:00에 수집된 정보예요.
> 
> 앞서 드린 메뉴 안내는 제가 확인하지 않고 말씀드린 것이라 정정할게요. 위 내용이 확인된 정보예요. 카드에서 파티 만들기를 누르면 약속을 만들 수 있어요.


### global-events-tonight-talk (global-events)

- Turn 1, "오늘 저녁에 들을 만한 강연 있어?": took TOOL, accepted TOOL
  - args: no searchGlobalEvents call with {"from":"2026-10-21","to":"2026-10-21"}
  - Steps:
  1. finish tool-calls, 2711 ms
     - searchGlobalEvents `{"after":"2026-10-21T17:00","before":"2026-10-21T22:00","words":["강연","강의","특강","세미나","토크","강좌"]}` → found: `{"result":"found","more":false,"events":[{"id":"ead490ef-8979-484c-b345-787031867b67","title":"<data label=\"globalEvent.title\">AI 시대의 진로 특강</data>","startsAt":"2026-10-21T18:00:00+09:00","endsAt":"2026-10-21T20:00:00+09:00","place":"<data label=\"globalEvent.place\">제1공학관(301동) 118호</data>","descr…`
     - searchRecruitingQuests `{"after":"2026-10-21T17:00","before":"2026-10-21T22:00","words":["강연","강의","특강","세미나","토크"]}` → found: `{"result":"found","more":false,"quests":[{"id":"1c71dcba-9297-4bf2-9a0a-d5052d7594d5","title":"<data label=\"quest.title\">오늘 저녁 고기 먹을 사람</data>","board":"meal","globalEvent":null,"joinPolicy":"open","join":"open","placesLeft":3,"holderCount":1,"next":{"startsAt":"2026-10-21T18:30:00+09:00","endsAt"…`
  2. finish tool-calls, 1745 ms
     - showGlobalEvents `{"ids":["ead490ef-8979-484c-b345-787031867b67"]}` → shown: `{"result":"shown","ids":["ead490ef-8979-484c-b345-787031867b67"]}`
  3. finish stop, 1011 ms
  - Reply (166 characters):

> 오늘 저녁에는 **AI 시대의 진로 특강**이 있어요. 18:00부터 20:00까지 제1공학관(301동) 118호에서 열려요.
> 
> 오늘 저녁에는 **AI 시대의 진로 특강**이 있어요. 18:00부터 20:00까지 제1공학관(301동) 118호에서 열려요. 카드를 눌러 자세한 내용을 볼 수 있어요.


## Replies to review

Every reply of a case that accepts REFUSE or CHAT, and of the ambiguous-intent category, in full.

### ambiguous-intent-lunch-at-student-center (ambiguous-intent, known failure: No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other)), turn 1

Accepted TOOL+ASK, took TOOL, failed. "내일 학생회관에서 점심"

> 내일(10/22) 학생회관식당 점심 메뉴는 닭갈비덮밥(6,000원) 하나예요. 메뉴는 2026-10-21 07:00에 수집된 정보예요.

75 characters
