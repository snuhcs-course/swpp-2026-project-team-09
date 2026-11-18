# 53: The 새내기 튜토리얼 as drawn: fewer words, guides on the map

Parent: [P15 spec](../spec.md), item 53; the owner's request of 2026-11-18 ("Cut the text, starting with the 새내기 튜토리얼 … Build it exactly as drawn"); the team canvas's row "새내기 튜토리얼" (y = 9640), left to right: `MainTutorialStart`, `ProfileTutorial`, `MainTutorialPager`, `MainTutorialList`, `MainTutorialSheet`, `MainTutorialPin`, `MainTutorialOk`, `MainTutorialNext`, `MainTutorialDone`, `MainTutorialKwOk`, `MainTutorialFail`, `MainTutorialCard1`–`6`, `MainTutorialMeal`, `MainTutLost`, `MainTutLaptop1`–`2`, `MainTutKw1`–`3`, `MainTutSU`, `MainTutGPT`, `MainTutSW1`–`2`, `MainTutAdmin`, `MainTutNight1`–`3`, `MainTutClinic`, `MainTutCounsel1`–`4`, `MainTutArt1`–`2`, `MainTutDure1`–`2`, `MainTutTrail1`–`2`
Status: ready-for-human
Owner: AhnJinYoung
Blocked by: none

Every board of the row is drawn by the canvas's `Main` board with a `tutorial` or `guideKey` prop (`project/Main.dc.html`, lines 593–745 for the markup and 964–1099, 1730–1869 for the data and the logic), and `ProfileTutorial` by `Profile.dc.html` (`tutRow`). The boards are the specification: the words below in quotes are theirs. `LocA7-Freshman` and `AmMore-q10` belong to the Assistant's answers and do not constrain this ticket.

## What is on screen now

- **Start** (`MainTutorialStart`): "새내기 튜토리얼 시작하기" at the bottom left of the map, while the tutorial is `available`, or `active` with a quest not started. It opens the pager.
- **Pager**: one quest per page between ◀ and ▶, the category chips over it, the quest's title and brief, 퀘스트 시작 or 내용 보기, 튜토리얼 그만하기 and 닫기. After a quest is completed the pager opens on the next one ("퀘스트 완료! 다음 퀘스트 · n/N"), and on "튜토리얼을 모두 마쳤어요" after the last.
- **Quest list**: every started quest sits on top of the map's Quest list and of the whole-screen 퀘스트 list, "새내기 튜토리얼 · {category} · n/N"; a press opens its sheet.
- **Sheet**: the kicker with the dots, the title, the body's paragraphs (up to four), a 완료 조건 box, each place with 지도에서 보기, each link as a ghost button, and [나중에][완료했어요]; then the completion message and 퀘스트 완료. The 관정 quest has its check (off by default) and skip.
- **Pin**: 지도에서 보기 drops a red pin with the place's words. A tap on the map elsewhere removes it, a press on it opens the card at its Place.
- **내 정보 row** (`ProfileTutorial`): its line and buttons by the state; while `active`: "진행 중 · 완료 n/N · 지도의 퀘스트 목록에서 이어서 해요".

## What changes, board by board

- **`MainTutorialStart`**: the same button and words. It shows while the tutorial is `available`, or `active` with a quest not completed (today: not started), since the quest list no longer carries the started ones. It opens the tutorial's list, not the pager. It hides while a card, the chat or a guide is open.
- **`ProfileTutorial`**: the same row. The `active` line becomes "진행 중 · 완료 n/15 · 지도 화면 아래 버튼으로 이어서 해요" (n/N with N the number of quests). The other lines and buttons stay.
- **`MainTutorialPager`** (the list, "페이저 대신"): the pager is replaced by a card over a scrim: the flag and "새내기 튜토리얼" with ✕; the shown category's label and its count ("생활 1/4") in the category's colour, "✓ {done} / {total}" at the right; a bar of one segment per quest (completed: its category's colour; of the shown category: its soft colour; else grey); the five category tabs, each with its colour's dot, the shown one filled in its soft colour; the shown category's quests, each a row with its icon on a 52-point tile in the category's soft colour, its title, a green ✓ once completed (the tile faded), "진행 중" once started, a chevron; at the bottom "튜토리얼 그만하기". The list opens on the category of the first quest not completed. A press on a row starts the quest if it is not started and opens its guide (or its sheet when it has no guide). No brief, no 퀘스트 시작, no ◀ ▶.
- **`MainTutorialList`** ("퀘스트 목록에는 안 뜸"): started quests are no longer on the map's Quest list nor on the whole-screen 퀘스트 list; the start button continues the tutorial.
- **`MainTutorialSheet`** (a quest without a guide; "완료 조건 없음 · 링크는 🌐 · [나중에][✓ 완료]"): the kicker with the dots and a 🌐 button at the right that opens a small card of the quest's links; the title; the body; the places with 지도에서 보기; the links; the buttons [나중에][✓ 완료] (완료 green with a check). No 완료 조건 box. 어시스턴트에게 예약 부탁하기 stays for a quest with `ask`.
- **`MainTutorialPin`**: as today (the red pin with the place's words; a tap on empty map removes it; a press on it opens the card at its Place).
- **`MainTutorialOk`**: ✓ 완료 shows the completion message in the Assistant's bubble with [✓ 퀘스트 완료], as today but with the check.
- **`MainTutorialNext`**: completing a quest (from its sheet or its guide) opens the list on the next quest's category, with a green banner "✓ {completed quest's title}" under the head, and the next quest's row highlighted (2-point border in the category's colour, its soft fill, a navy "다음" tag). The next quest is today's `nextAfter`.
- **`MainTutorialDone`**: after the last quest the list shows a green check in a 64-point round, "15 / 15" (n / n) and 닫기.
- **`MainTutorialKwOk`, `MainTutorialFail`** ("(비활성)", only with `TUTORIAL_KWANJEONG_CHECK` on): the sheet's check stays as built; its buttons take the same look: [다시 확인][✓ 그냥 완료]. The guide's ✓ 완료 of a quest served as `kwanjeongCheck` opens this sheet's check instead of completing it.
- **The map guides** (`MainTutorialCard1`–`6`, `MainTutorialMeal`, `MainTut*`): every one of the 15 quests opens a guide on the map in place of the sheet. One frame draws them all:
  - a bar at the top: ← (back to the list), the quest's icon on a 34-point tile in the category's colours, its title, the chosen kind's chip (학생증: "일반" or "금융", which chooses again), 🌐 (the quest's links in a small card) when it has links, ✕;
  - the map shows only the guide: its places as round pins in the category's colour, the current one larger with a ring inside a rounded square and its tag "n · {step}", the others smaller with the place's name under them, a step passed as a green ✓; numbered steps are joined by a dashed line from the User; the map fits every place of the guide (and the User, but for 관악산) under the bubble; the lists, the input, the buttons, the zoom control and the tab bar give way;
  - a bubble under the bar: the guide's or the step's description, then the step's number and title (with "선택" for an optional step), its place and sub-line, a 🌐 link button, the spots' chips, the online steps as numbered rows (a link row underlined with 🌐, the last outlined, a note at its right such as "여기서 신청"), the chips (icon and words) and the step's buttons: 길찾기 (the walking route to the step's place), 🌐 links (navy) and 어시스턴트에게 부탁;
  - a panel at the bottom: the step tabs (✓ for a passed step) when the guide has more than one step, ← for the previous step, and 다음 → or ✓ 완료 (green). A guide of places side by side (천원의 식사, 캠퍼스 SW, 야간 셔틀, 상담, 미술관) has no numbers, no ←, and ✓ 완료 on every tab; with three tabs or fewer they sit in one row with 완료.
  - ✓ 완료 completes the quest (`button`) and opens the list as `MainTutorialNext`.
- Board by board, the guides' steps (the words are the boards'):
  - `MainTutorialCard1`: 학생증 — the choice "일반 학생증" (MySNU → 학생지원센터) or "금융 학생증 (체크카드)" (우리은행 → 학생지원센터), both places as dim dots with names, the main button "종류를 골라 주세요" (off).
  - `Card2`–`3`, `Card6` (일반): ① 온라인 신청 (MySNU 로그인 › 캠퍼스·복지 › S-CARD(학생증) › S-CARD 분실신고 "여기서 신청", 🌐 MySNU), ② 방문 수령 at 학생지원센터, 67동 · 두레문예관 2층 (신청 다음 날부터 · 평일 09:00–17:50 · 신분증; 길찾기), ③ 모바일 학생증 "선택" (서울대학교 앱 › 하단 가운데 '샤' › 모바일 S-CARD 발급; 카드형 없으면 1개월만).
  - `Card4`–`5`, `Card6` (금융): ① 은행에서 발급 at 우리은행, 4동 · 신양학술정보관 (신분증 · 교환학생은 불가), ② 학생 정보 넣기 at 학생지원센터 (평일 09:00–17:50 · 신청서 작성), ③ 모바일 학생증.
  - `MainTutorialMeal`: 학생회관 (아침 · 점심 · 저녁) and 윗공대 (301동, 아침만), 🍚 pins, 길찾기 and 🌐 생협 식단, with the two-paragraph description.
  - `MainTutLost`: 분실물센터, 101동 1층 · 국민은행 옆 (09:00–18:00 · 02-880-8114 · 신분증 · 서약서 · 1개월 보관 뒤 경찰로).
  - `MainTutLaptop1`–`2`: ① 온라인 신청 (마이스누 › 캠퍼스·복지 › IT서비스 › 장비/SW대여 › 장비신청), ② 방문 대여 at IT Service Center, 102동 정보화본부 101호.
  - `MainTutKw1`–`3`: ① 좌석 예약 at 관정도서관 (키오스크 · 관정 앱 · SNU Now 어시스턴트; 어시스턴트에게 부탁, 길찾기), ② 30분 안에 확인, ③ 다 쓰면 반납 (어시스턴트에게 반납).
  - `MainTutSU`: MySNU에서 직접 신청, with the 🌐 "MySNU에서 신청하기" button and its description.
  - `MainTutGPT`: 바로 로그인 (chatgpt.com › 마이스누 ID · 비밀번호).
  - `MainTutSW1`–`2`: 캠퍼스 라이선스 SW and Microsoft 365, side by side.
  - `MainTutAdmin`: 행정관 셔틀 정류장, 행정관 잔디광장 아래.
  - `MainTutNight1`–`3`: 탈출셔틀 (행정관 앞), 심야셔틀 (no pin), 시험기간 (302동 앞), side by side, 🌙 pins.
  - `MainTutClinic`: 보건진료소, 63동 학생회관 3층 (접수·수납 329호, hours), 길찾기 and 🌐 진료 예약.
  - `MainTutCounsel1`–`4`: 대학생활문화원, 인권센터, 단과대 상담실 (eleven spots, a chip each, two without a pin) and 생활 · 진로 (three spots), side by side, 💬 pins.
  - `MainTutArt1`–`2`: 미술관 (151동) and 파워플랜트 (68동), 🖼 pins, 길찾기 and 🌐 지금 전시.
  - `MainTutDure1`–`2`: ① 예약하샤에서 신청 (🌐 예약하샤), ② 연습실 가기 at 두레문예관.
  - `MainTutTrail1`–`2`: ① 등산로 입구 (5513 · 편한 신발), ② 연주대까지 (해 지기 전에 하산); the map leaves the User out.

## Content changes (`main-server/content/tutorial.yaml`)

- The same 15 quests, keys, order and categories (생활 4, 공부·학사 4, 이동 2, 건강 2, 문화·여가 3). No quest is added or removed, so no progress changes.
- Each quest gets an `icon` (the list's and the guide's): idcard, bowl, box, laptop, book, grade, spark, download, bus, moon, cross, heart, art, music, mountain.
- Each quest gets a `guide`: the steps above with their words, each place a Place of the seed by its number (or a point, as the quest's own places), its chips with their icons, its online steps, its buttons. The step places are all Places of the seed: 67, 4, 63, 301, 101, 102, 62-1, 302, 153, 39, 4, 16-1, 58, 75-1, 74, 10, 85, 17, 919, 152-1, 151, 68; the points are the quests' own (행정관 셔틀 정류장, 등산로 입구, 연주대). Two spots have no Place and no pin, as drawn: 공존 and 자우리 (501동).
- 천원의 식사: its body is cut to the board's two lines ("아침·점심·저녁, 1,000원에 먹을 수 있어요." / "윗공대(301동)는 아침만 운영해요.") and it gains the place 301 as "윗공대 301동 · 아침만".
- The guides' links: MySNU (https://my.snu.ac.kr), 생협 식단 (https://snuco.snu.ac.kr/foodmenu/), chatgpt.com, mso365.snu.ac.kr, 진료 예약 (the quest's own link), 지금 전시 (the quest's two links), 예약하샤 (https://ssims.snu.ac.kr/index.do, the 학생처 page's "예약하샤 바로가기"). Each was answered on 2026-11-18.
- The other bodies, briefs, conditions and completion messages stay: the sheet of a quest without a guide, the Assistant (`getTutorial`) and an older app read them. The text a User sees shrinks because the guide replaces the sheet.

## What stays as it is

- The tutorial's states, eligibility, the server's routes and the progress table. GET /tutorial serves the two new fields as the file holds them; the Assistant's `getTutorial` picks its fields by name, so it does not see them; the 관정 ask buttons follow `LIBRARY_BOOKING_ENABLED` as `ask` does.
- The P6 eval suite reads its own frozen copy (`eval/p6/tutorial.yaml`), which this ticket does not touch.
- The 관정 check and skip, `TUTORIAL_KWANJEONG_CHECK`, the pin of 지도에서 보기, the `/main?tutorial=…` address (it now opens the quest's guide or sheet), and every other screen.

## Server, Release and migration

- `tutorial-content.ts` accepts the optional `icon` and `guide`; the DTO passes them through. No database change, so **no migration**. The change needs a **Release of the main server** (the content and its schema ship with it), before or with the app's.
- The app reads both fields as optional: against a server without them it shows the list with flags for icons and opens the sheet for every quest. An older app ignores them.
- **No native file is touched**: the guide is drawn with the map's markers and lines and the design system's views. The app's change goes out as a JS update.

## Acceptance criteria

- [x] The start button shows while the tutorial is `available` or `active` with a quest not completed, not while a card, the chat or a guide is open, and opens the list (unit test of the rule; integration test of the press).
- [x] The 내 정보 row's `active` line is "진행 중 · 완료 n/N · 지도 화면 아래 버튼으로 이어서 해요" (unit test).
- [x] No started tutorial quest is on the map's Quest list or the whole-screen 퀘스트 list (integration test).
- [x] The list shows the head, the category's count and "✓ n / N", one bar segment per quest, the five category tabs, the shown category's rows with icon, title, ✓ and "진행 중", and 튜토리얼 그만하기; a tab shows its category; a row's press starts the quest and opens its guide, or its sheet without a guide (integration test).
- [x] Completing a quest opens the list on the next quest's category with "✓ {title}" and that quest's row marked "다음"; after the last, "n / n" with 닫기 (integration test).
- [x] The sheet has no 완료 조건 box, has the 🌐 button with the quest's links, and [나중에][✓ 완료] (integration test).
- [x] A guide shows its bar, its step's words, its chips, its online steps and its buttons, moves between steps with 다음, ←, and the tabs, and ✓ 완료 completes the quest; 학생증 starts with the choice of two kinds and its chip chooses again; a side-by-side guide has ✓ 완료 on every tab (integration test over the mock's content).
- [x] While a guide is open the map draws only its pins and lines and the User; the lists, the input and the tab bar give way (integration test).
- [x] `content/tutorial.yaml` holds an `icon` and a `guide` for each of the 15 quests, and every guide place is a Place of the seed or a point (unit test of the content).
- [x] GET /tutorial serves `icon` and `guide`; the guide's ask buttons are left out while 관정 booking is off; `getTutorial` does not serve them (unit tests of `servedContent` and the tool).
- [x] oxlint, Prettier, tsc and the touched tests pass for `mobile` and `main-server`; no native file changes (`git diff --stat`).

## Open questions for the owner

The owner gave no answer on 2026-11-18, so questions 2–7 stand as built, unless the owner says otherwise. Question 1 stays open, and its line stays marked _unsourced_ in `tutorial.yaml`.

1. (Open.) 천원의 식사 at 윗공대 (301동) "아침만": the board says so, but the quest's sources (학생처, 생협) as written in `tutorial.yaml` do not say which restaurant serves which meal. Built as drawn and marked _unsourced_ in the file. The file cannot keep words on screen away from the Assistant: `getTutorial` hands it the body and the places as the quest's text (not as a fact). Two choices: (a) keep the board's line in the body and the place's label, as now, with a source to add as a fact if there is one; or (b) put the body and the label back to the sourced words, so that "아침만" stays only in the guide, which the Assistant does not read.
2. (As built, unless the owner says otherwise.) `MainTutSU`'s link button shows the host "mysnu.ac.kr", but MySNU is my.snu.ac.kr. Built with my.snu.ac.kr. Right?
3. (As built, unless the owner says otherwise.) `MainTutorialFail`'s title says "그냥 완료하기"; its button says "그냥 완료". Built as the button.
4. (As built, unless the owner says otherwise.) `MainTutorialDone` draws "15 / 15" as fixed words; built as the count of quests (n / n), which is 15 now.
5. (As built, unless the owner says otherwise.) 관심 (생활 · 진로) says "기숙사 919A동 1층"; the seed has no 919A, and the board's pin stands on Place 919 (관악사 학부 생활관). Built on 919.
6. (As built, unless the owner says otherwise.) The guides' places as the boards' map draws them are the seed's Places exactly (checked by fitting the board's map to the seed); 공존 and 자우리 (501동) have none, so they have no pin, as drawn.
7. (As built, unless the owner says otherwise.) The start button keeps "새내기 튜토리얼 시작하기" for a tutorial already started, as `MainTutorialList` and `MainTutorialStart` both draw it. Should it say something else, such as "이어서 하기", once a quest is started?

## Comments

### Notes from the implementation (2026-11-18)

- Built in PR #359. The 45 boards share one frame in the canvas's `Main` board, so one renderer draws every guide, and each quest's guide is data in `content/tutorial.yaml` (`icon`, `guide`; schema in `main-server/src/tutorial/tutorial-guide.ts`). The app's mock copies it whole in `mobile/src/api/mock/data/tutorial-guides.json`.
- Every place the boards' map draws was matched to the seed by fitting the board's map to the seed's Places: they are the seed's Places exactly, so each guide names Places by number. 관심's pin is Place 919.
- The sheet is now reached only for a quest without a guide (an older main server), and for the 관정 check when `TUTORIAL_KWANJEONG_CHECK` is on.
- Differences from the boards, each because it needs a pin's screen position, an animated marker or line opacity that the map does not give: the bubble always sits under the bar and has no tail, and it is full width; the current pin's tag is the map's own text and its ring does not pulse; the way between steps is straight and not faded. Also: the 🌐 link of `MainTutSU` shows the real host `my.snu.ac.kr`; "15 / 15" is counted.
- The sheet tests turn the mock's guides off (`MOCK_TUTORIAL_SWITCHES.guides`), as an older server serves the tutorial.
- From the review of #359: the Assistant's tutorial rules (`tutorial-rules.ts`) now name the start button, the list, the guide and ✓ 완료 in place of the pager and the Quest list; the P6 tutorial cases were not run again (no model calls in this ticket). A guide the app cannot read leaves only that quest without its guide (`withReadableGuides`). A guide closes when a card, an invitation's card or the answer frame opens (`useGuideGivesWay`). The bubble and the list scroll within the screen. Closing a guide brings the camera back to where it was when the guide opened. The Places list is read only while a guide is open. The AI input stays mounted, hidden, while a guide is open, so its draft is kept. Only `http(s)` links open. `/main?tutorial=` and `openSheet` are removed. The exam-period shuttle step shows its 2026 dates.
- Left from the review: a 어시스턴트에게 부탁 from a guide makes the answer frame keep the guide's camera as its way back (the frame saves the camera when it opens, as the guide closes; changing that needs the frame's camera store to take the guide's). The mock copy of the guides is in the app's bundle as every mock is. The 🌐 icon is named `web`; #358 adds the same paths as `globe`, so whichever merges second takes the other's name. 미술관's link stays `http://www.snumoa.org/`: its `https` does not answer.
- Each tutorial integration file, run alone under the 3 GB cap with `--logHeapUsage` (2026-11-18): `tutorial-list` 220 s, 437 MB; `tutorial-sheet` 184 s, 372 MB; `tutorial-kwanjeong-check` 282 s, 488 MB; `tutorial-place-pin` 219 s, 532 MB; `answer-frame-tutorial` 58 s, 297 MB; `api/server-tutorial` 5 s, 92 MB; `tutorial-guide` 274 s, 471 MB. All pass. No file climbs or loops. The VM's crash at 17:04 came from running seven of them in one Jest process, which kept each file's whole app (about 0.4–0.5 GB) in one heap.
- The tutorial's integration tests reach each quest through the start button, the list and its tab, which takes longer than a press on a Quest list row did. Their timeout is 150 s.

### Agent usage (2026-11-18)

Estimates from this ticket's sessions (Opus 5.5, no subagents; the work moved from `/workspace/a02-05` to `/workspace/a02-04` after the VM restarted), with the waits for test runs counted, since the agent waited on them:

- Agent time: about 7 hours, through three rounds of review and the merge of `4.0/Main`.
- Tokens: output about 250,000. Input about 62 million: about 59.5 million cache reads, about 2.4 million cache writes, and a few thousand uncached.
