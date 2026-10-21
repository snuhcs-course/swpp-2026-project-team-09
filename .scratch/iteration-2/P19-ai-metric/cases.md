# P19 benchmark cases

The 62 cases of `main-server/eval/cases/`, for review in one read. The clock stands at 2026-10-21 (수) 14:05 in Korea; the world is `main-server/eval/world-data.ts`. "Expected" is the case's `expect`: the accepted actions, the tools it must call (`calls`) or must not (`never`), their arguments, and the outcome (`/` separates words of which any one counts). Generated from the YAML files; the YAML is the source.

## The world

- Asker 김하늘. Friends 이민수, 김민수 (both match "민수"), 김지은, and two named 박서준 (경영학과, 물리천문학부).
- Places from the shared seed: 학생회관 (63동) and 제1공학관 (301동). "학관" matches 약학관, 공학관, 법학관 … but not 학생회관.
- Menus: 10-21 학생회관식당 김치볶음밥 / 제육볶음 / 돈까스, 자하연식당 비빔밥 / 순두부찌개; 10-22 학생회관식당 토스트 / 닭갈비덮밥 / 카레라이스, 자하연식당 lunch 김치찌개. None on 10-23 or later.
- Global Events: 취업 박람회 (10-20, ended), 미술대학 졸업 전시 (10-20 – 10-22 18:00), AI 시대의 진로 특강 (10-21 18:00, 301동), 가을 재즈 콘서트 (10-22 19:00), 관악 가을 축제 (10-24 12:00 – 10-25), 축제 개막 공연 (10-24 18:00), 총장배 농구 대회 (10-25). None on 10-23.
- 파티 (another User leads them): hobby 저녁 농구 한 판 (10-22 19:00), 주말 배드민턴 (10-24 10:00, approval), 아침 러닝 크루 (10-22 07:00, full), 보드게임 모임 (10-24 19:00); meal 내일 점심 학식 같이 (10-22 12:00, 학생회관), 오늘 저녁 고기 먹을 사람 (10-21 18:30), 어제 점심 번개 (10-20, ended); career 알고리즘 스터디 (10-24 20:00, approval), 토익 스터디 (10-26); show 재즈 콘서트 같이 가요 (to the concert), 축제 같이 즐겨요 (to the festival).
- Shuttle: two vehicles, at 정문 and 301동.

## menus (5)

| id | User says | Expected | Known failure |
|---|---|---|---|
| menus-today-lunch (×3) | **U:** 오늘 점심 학식 뭐 나와? | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-21, meal: lunch}; buttons dining; text holds 제육볶음 |  |
| menus-tomorrow-breakfast | **U:** 내일 아침 학식 메뉴 알려줘 | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-22, meal: breakfast}; buttons dining; text holds 토스트 |  |
| menus-today-dinner-restaurant | **U:** 오늘 저녁 자하연식당 뭐 나와? | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-21, meal: dinner}; buttons dining; text holds 순두부찌개 |  |
| menus-tomorrow-whole-day | **U:** 내일 학식 하루치 전부 보여줘 | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-22}; buttons dining; text holds 토스트 & 닭갈비덮밥 & 카레라이스 |  |
| menus-abbreviation-hakgwan | **U:** 학관 점심 뭐야? | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-21, meal: lunch}; buttons dining; text holds 제육볶음 | "학관" is not read as 학생회관: names are matched as substrings, and 학생회관식당 does not hold 학관 |

## shuttle (3)

| id | User says | Expected | Known failure |
|---|---|---|---|
| shuttle-where-now (×3) | **U:** 셔틀 지금 어디쯤 있어? | TOOL; calls getShuttle, showOnMap; never proposeQuest; buttons shuttle; text holds 정문 & 301동 |  |
| shuttle-near-stop | **U:** 순환셔틀 301동 쪽에 와 있어? | TOOL; calls getShuttle, showOnMap; never proposeQuest; buttons shuttle; text holds 301동 |  |
| shuttle-how-many | **U:** 교내 셔틀 지금 몇 대 운행 중이야? | TOOL; calls getShuttle, showOnMap; never proposeQuest; buttons shuttle; text holds 2대/두 대/2 대 |  |

## global-events (5)

| id | User says | Expected | Known failure |
|---|---|---|---|
| global-events-this-week-shows | **U:** 이번 주에 공연 뭐 있어? | TOOL; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; searchGlobalEvents {from: 2026-10-21, to: 2026-10-25}; globalEvent cards incl. 가을 재즈 콘서트, 축제 개막 공연, ≤3 |  |
| global-events-tonight-talk | **U:** 오늘 저녁에 들을 만한 강연 있어? | TOOL; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; searchGlobalEvents {from: 2026-10-21, to: 2026-10-21}; globalEvent cards incl. AI 시대의 진로 특강, ≤1 |  |
| global-events-weekend-festival | **U:** 이번 주말에 축제 해? | TOOL; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; searchGlobalEvents {from: 2026-10-24, to: 2026-10-25}; globalEvent cards incl. 관악 가을 축제, ≤2 |  |
| global-events-thursday | **U:** 목요일에 하는 행사 다 알려줘 | TOOL; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; searchGlobalEvents {from: 2026-10-22, to: 2026-10-22}; globalEvent cards incl. 가을 재즈 콘서트, 미술대학 졸업 전시, ≤2 |  |
| global-events-career-this-week | **U:** 이번 주에 진로나 취업 관련 행사 있어? | TOOL; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; globalEvent cards incl. AI 시대의 진로 특강, ≤1 |  |

## finding-parties (5)

| id | User says | Expected | Known failure |
|---|---|---|---|
| finding-parties-no-condition (×3) | **U:** 파티 찾기 | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; quest cards, ≥1, ≤3 |  |
| finding-parties-exercise | **U:** 같이 운동할 파티 있어? | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; searchRecruitingQuests {board: hobby}; quest cards incl. 저녁 농구 한 판, 주말 배드민턴, ≤3 |  |
| finding-parties-tomorrow-meal | **U:** 내일 같이 밥 먹을 파티 있어? | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; searchRecruitingQuests {board: meal}; quest cards incl. 내일 점심 학식 같이, ≤1 |  |
| finding-parties-study | **U:** 스터디 모집하는 파티 찾아줘 | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; searchRecruitingQuests {board: career}; quest cards incl. 알고리즘 스터디, 토익 스터디, ≤2 |  |
| finding-parties-for-event | **U:** 재즈 콘서트 같이 갈 파티 있어? | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; quest cards incl. 재즈 콘서트 같이 가요, ≤1 |  |

## making-parties (7)

| id | User says | Expected | Known failure |
|---|---|---|---|
| making-parties-lunch-with-friend (×3) | **U:** 내일 점심 학생회관에서 이민수랑 밥 약속 잡아줘 | PROPOSE; calls resolveFriend, resolvePlace, proposeQuest; resolveFriend {name: 이민수}; resolvePlace {words: 학생회관}; Proposal joinPolicy: closed, board: None, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 이민수 |  |
| making-parties-breakfast-by-building-number | **U:** 모레 아침에 301동에서 김지은이랑 같이 공부하기로 했어. 약속 잡아줘 | PROPOSE; calls resolveFriend, resolvePlace, proposeQuest; resolveFriend {name: 김지은}; resolvePlace {words: 301동}; Proposal joinPolicy: closed, board: None, capacity: 2, startsAt: 2026-10-23 08:00, place: 제1공학관, invitees: 김지은 |  |
| making-parties-open-dinner | **U:** 내일 저녁에 같이 고기 먹을 사람 나 포함 4명 모집해줘 | PROPOSE; calls proposeQuest; Proposal joinPolicy: open, board: meal, capacity: 4, startsAt: 2026-10-22 18:00, invitees:  |  |
| making-parties-approval-tennis | **U:** 토요일 오전 10시에 테니스 칠 사람 나까지 6명 모집해줘. 신청 오면 내가 승인하고 받을게 | PROPOSE; calls proposeQuest; Proposal joinPolicy: approval, board: hobby, capacity: 6, startsAt: 2026-10-24 10:00 |  |
| making-parties-for-event | **U:** 가을 재즈 콘서트 같이 갈 사람 나 포함 3명, 공개로 모집해줘 | PROPOSE; calls resolveGlobalEvent, proposeQuest; Proposal joinPolicy: open, board: show, capacity: 3, startsAt: 2026-10-22 19:00, globalEvent: 가을 재즈 콘서트 |  |
| making-parties-abbreviation-hakgwan | **U:** 내일 점심 학관에서 이민수랑 밥 약속 잡아줘 | PROPOSE; calls resolveFriend, resolvePlace, proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 이민수 | "학관" is not read as 학생회관 (63동): resolvePlace matches substrings, and 학생회관 does not hold 학관 |
| making-parties-states-date-and-weekday | **U:** 금요일 저녁 7시에 김지은이랑 저녁 약속 잡아줘 | PROPOSE; calls resolveFriend, proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-23 19:00, invitees: 김지은; text holds 10월 23일/10/23/23일 & 금요일/(금)/금) | The reply does not state the computed date with its weekday until improvement 3-5; the prompt says not to repeat the fields |

## missing-or-ambiguous-target (8)

| id | User says | Expected | Known failure |
|---|---|---|---|
| ask-which-minsu (×3) | **U:** 내일 점심에 학생회관에서 민수랑 밥 약속 잡아줘 | ASK; calls resolveFriend; resolveFriend {name: 민수}; text holds 이민수 & 김민수 |  |
| ask-which-same-name-friend | **U:** 내일 저녁 6시에 서준이랑 학생회관에서 밥 약속 잡아줘 | ASK; calls resolveFriend; text holds 박서준 & 경영/물리/학과/아이디/ID | resolveFriend returns only names and ids, so nothing tells two Friends named 박서준 apart (proposed for P20) |
| ask-which-festival-event | **U:** 축제 같이 갈 파티 만들어줘. 이민수랑 김지은 초대해서 | ASK; calls resolveGlobalEvent; text holds 관악 가을 축제/가을 축제 & 개막 공연 |  |
| ask-which-engineering-building | **U:** 내일 저녁 7시에 공학관에서 김지은이랑 스터디 약속 잡아줘 | ASK; calls resolvePlace; text holds 제1공학관/제2공학관/공학관1/공학관2/공학관3/301동/302동/어느 공학관/어떤 공학관/몇 동 |  |
| ask-missing-time | **U:** 이민수랑 밥 약속 잡아줘 | ASK; text holds 언제/몇 시/날짜/시간 |  |
| ask-lunch-already-past | **U:** 오늘 점심 약속 잡아줘 | ASK; text holds 지났/지난/이미 & 몇 시/언제/시간 |  |
| ask-unknown-friend | **U:** 내일 점심에 박지훈이랑 밥 약속 잡아줘 | ASK; calls resolveFriend; text holds 박지훈 & 없/찾을 수 없/찾지 못 |  |
| ask-missing-fields-in-one-question | **U:** 운동 파티 하나 모집해줘 | ASK; text holds 언제/몇 시/날짜/시간 & 몇 명/인원/몇 분 |  |

## ambiguous-intent (4)

| id | User says | Expected | Known failure |
|---|---|---|---|
| ambiguous-intent-lunch-at-student-center | **U:** 내일 학생회관에서 점심 | TOOL+ASK; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-22, meal: lunch}; buttons dining; text holds 약속/파티/같이 드실/같이 먹 | No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other) |
| ambiguous-intent-festival-company | **U:** 이번 주 토요일 축제 같이 갈 사람 | TOOL+ASK; calls searchRecruitingQuests, showQuests; never proposeQuest; quest cards incl. 축제 같이 즐겨요; text holds 만들/모집 | No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other) |
| ambiguous-intent-basketball-tomorrow | **U:** 내일 저녁 농구 | TOOL+ASK; calls searchRecruitingQuests, showQuests; never proposeQuest; quest cards incl. 저녁 농구 한 판; text holds 만들/모집 | No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other) |
| ambiguous-intent-jazz-concert | **U:** 목요일 재즈 콘서트 | TOOL+ASK; calls searchGlobalEvents, showGlobalEvents; never proposeQuest; globalEvent cards incl. 가을 재즈 콘서트; text holds 파티 | No rule for ambiguous intent until improvement 3-1 (show one reading, ask about the other) |

## no-data (4)

| id | User says | Expected | Known failure |
|---|---|---|---|
| no-data-menus-day-after-tomorrow | **U:** 모레 학식 뭐 나와? | TOOL; calls getMenus; never proposeQuest; getMenus {date: 2026-10-23}; text holds 없/않 |  |
| no-data-restaurant-breakfast | **U:** 내일 자하연식당 아침 메뉴 뭐야? | TOOL; calls getMenus; never proposeQuest; getMenus {date: 2026-10-22}; text holds 없/않 |  |
| no-data-events-day-after-tomorrow | **U:** 모레 학교에서 열리는 행사 있어? | TOOL; calls searchGlobalEvents; never proposeQuest, showGlobalEvents; searchGlobalEvents {from: 2026-10-23, to: 2026-10-23}; text holds 없/않 |  |
| no-data-meal-parties-day-after-tomorrow | **U:** 모레 같이 밥 먹는 파티 있어? | TOOL; calls searchRecruitingQuests; never proposeQuest, showQuests; searchRecruitingQuests {board: meal, from: 2026-10-23, to: 2026-10-23}; text holds 없/않 |  |

## out-of-scope (4)

| id | User says | Expected | Known failure |
|---|---|---|---|
| out-of-scope-report | **U:** 사회학개론 기말 리포트 3000자로 써줘 | REFUSE; no tool |  |
| out-of-scope-code | **U:** 파이썬으로 피보나치 수열 출력하는 코드 짜줘 | REFUSE; no tool |  |
| out-of-scope-library-seats | **U:** 중앙도서관 열람실 지금 빈자리 몇 개야? | REFUSE; no tool; text holds 지원/아직/없/못 |  |
| out-of-scope-where-is-friend | **U:** 이민수 지금 어디 있어? | REFUSE; no tool; text holds 지도 |  |

## small-talk (3)

| id | User says | Expected | Known failure |
|---|---|---|---|
| small-talk-greeting | **U:** 안녕! 넌 누구야? | CHAT; no tool |  |
| small-talk-tired | **U:** 아 오늘 수업 너무 많아서 피곤하다 | CHAT; no tool |  |
| small-talk-meal-recommendation-asks-taste | **U:** 저녁 뭐 먹을지 추천해줘 | CHAT; no tool; text holds 한식/일식/양식/중식/어떤/당기/땡기 |  |

## follow-ups (6)

| id | User says | Expected | Known failure |
|---|---|---|---|
| follow-up-chosen-minsu | **U:** 내일 점심에 학생회관에서 민수랑 밥 약속 잡아줘<br>**A:** 민수라는 친구가 두 명 있어요. 이민수, 김민수 중 누구와 약속을 잡을까요?<br>**U:** 이민수 | PROPOSE; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 이민수 |  |
| follow-up-second-same-name-friend | **U:** 내일 저녁 6시에 서준이랑 학생회관에서 밥 약속 잡아줘<br>**A:** 박서준이라는 친구가 두 명 있어요. 1. 박서준 (경영학과) 2. 박서준 (물리천문학부) 중 누구와 약속을 잡을까요?<br>**U:** 두 번째 거 | PROPOSE; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 18:00, place: 학생회관, invitees: 박서준 (물리천문학부) | Resolving 박서준 again answers both, and nothing tells them apart, until improvement 3-4 and a resolveFriend that returns something distinguishing |
| follow-up-seven-oclock | **U:** 내일 점심 학생회관에서 이민수랑 밥 약속 잡아줘<br>**A:** 내일 점심 약속을 제안했어요. 만들기를 누르기 전에는 아무것도 만들어지지 않아요. [Proposal: 2026-10-22T12:00:00+09:00, 학생회관, 이민수]<br>**U:** 7시로 바꿔줘 | PROPOSE+ASK; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 19:00, place: 학생회관, invitees: 이민수; text holds 오전 7시/아침 7시/오전/아침/07:00/7:00 |  |
| follow-up-narrow-to-weekend | **U:** 운동 파티 있어?<br>**A:** 운동 파티를 찾았어요. [cards: 저녁 농구 한 판, 아침 러닝 크루, 주말 배드민턴]<br>**U:** 그중에 주말 거만 보여줘 | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; quest cards incl. 주말 배드민턴, ≤1 |  |
| follow-up-make-instead | **U:** 내일 저녁에 농구하는 파티 있어?<br>**A:** 내일 저녁 7시 농구 파티가 하나 있어요. [cards: 저녁 농구 한 판]<br>**U:** 이거 말고 내가 새로 하나 만들래. 내일 저녁 8시, 나 포함 6명, 공개로 | PROPOSE; calls proposeQuest; Proposal joinPolicy: open, board: hobby, capacity: 6, startsAt: 2026-10-22 20:00 |  |
| follow-up-yes-after-menus | **U:** 내일 학생회관에서 점심<br>**A:** 내일 학생회관식당 점심은 닭갈비덮밥(6,000원)이에요. 혹시 내일 점심 약속을 잡아 드릴까요? 같이 갈 친구를 알려 주세요.<br>**U:** 응 김지은이랑 | PROPOSE; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 김지은 |  |

## live (3)

| id | User says | Expected | Known failure |
|---|---|---|---|
| live-lunch-then-seven (live) | **U:** 내일 점심 학생회관에서 이민수랑 밥 약속 잡아줘<br>**U:** 7시로 바꿔줘 | turn 1: PROPOSE; calls resolveFriend, resolvePlace, proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 이민수<br>turn 2: PROPOSE+ASK; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 19:00, place: 학생회관, invitees: 이민수; text holds 오전 7시/아침 7시/오전/아침/07:00/7:00 |  |
| live-which-minsu (live) | **U:** 내일 점심에 학생회관에서 민수랑 밥 약속 잡아줘<br>**U:** 이민수 | turn 1: ASK; calls resolveFriend; text holds 이민수 & 김민수<br>turn 2: PROPOSE; calls proposeQuest; Proposal joinPolicy: closed, capacity: 2, startsAt: 2026-10-22 12:00, place: 학생회관, invitees: 이민수 |  |
| live-menus-then-tomorrow (live) | **U:** 오늘 점심 학식 뭐야?<br>**U:** 내일은? | turn 1: TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-21, meal: lunch}; buttons dining; text holds 제육볶음<br>turn 2: TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-22, meal: lunch}; buttons dining; text holds 닭갈비덮밥 |  |

## compound (5)

| id | User says | Expected | Known failure |
|---|---|---|---|
| compound-menus-and-shuttle | **U:** 오늘 저녁 학식 메뉴랑 지금 셔틀 어디 있는지 같이 알려줘 | TOOL; calls getMenus, getShuttle, showOnMap; never proposeQuest; getMenus {date: 2026-10-21, meal: dinner}; buttons dining, shuttle; text holds 돈까스 & 정문/301동 |  |
| compound-this-week-menus | **U:** 이번 주 학식 메뉴 전부 알려줘 | TOOL; calls getMenus, showOnMap; never proposeQuest; getMenus {date: 2026-10-21} & {date: 2026-10-22}; buttons dining; text holds 제육볶음 & 닭갈비덮밥 |  |
| compound-festival-and-party | **U:** 이번 주말 축제 뭐 있는지 보여주고, 같이 갈 파티도 찾아줘 | TOOL; calls searchGlobalEvents, showGlobalEvents, searchRecruitingQuests, showQuests; never proposeQuest; globalEvent cards incl. 관악 가을 축제; quest cards incl. 축제 같이 즐겨요 |  |
| compound-proposal-two-friends-place-event | **U:** 토요일 축제 개막 공연 이민수, 김지은이랑 보러 갈래. 5시에 학생회관 앞에서 모여서 가는 걸로 파티 만들어줘 | PROPOSE; calls resolveFriend, resolvePlace, resolveGlobalEvent, proposeQuest; resolveFriend {name: 이민수} & {name: 김지은}; Proposal joinPolicy: closed, board: None, capacity: 3, startsAt: 2026-10-24 17:00, place: 학생회관, globalEvent: 축제 개막 공연, invitees: 이민수/김지은 |  |
| compound-exercise-or-make | **U:** 운동 파티 있으면 보여주고 없으면 하나 만들어줘 | TOOL; calls searchRecruitingQuests, showQuests; never proposeQuest; searchRecruitingQuests {board: hobby}; quest cards incl. 저녁 농구 한 판, 주말 배드민턴, ≤3 |  |

