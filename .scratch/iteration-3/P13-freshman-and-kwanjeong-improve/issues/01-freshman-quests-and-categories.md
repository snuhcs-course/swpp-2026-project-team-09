# 01: Ten new Tutorial Quests in five categories, 관정 completed by its button, and a pin for 지도에서 보기

Parent: [P13 spec](../spec.md) ("The Tutorial Quests", "지도에서 보기 drops a pin")
Status: ready-for-human
Blocked by: none

## What to build

The 새내기 튜토리얼 grows from five Tutorial Quests to fifteen, grouped into five Tutorial Categories (생활, 공부·학사, 이동, 건강, 문화·여가). The ten new quests come from `references/quest-candidates.md` (4, 6, 9+10 merged as 야간 셔틀 타기, 16, 22, 25, 26, 29, 33, 35), each with sourced facts the Assistant answers from. The pager, the quest list and the sheet show the categories within the current tutorial UI. Every quest, 관정 included, is completed by 완료했어요; the phone's 관정 check stays in the code behind a server flag, off, and 어시스턴트에게 예약 부탁하기 stays on the 관정 sheet.

지도에서 보기 also drops a red pin on the quest's place (`references/tutorial-place-pin.png`), which today only moves the camera. A tap on it opens the map's card at that Place if there is one; otherwise it is the pin and its label alone.

This ticket changes no prompt. The Assistant reads the new quests through `getTutorial` as it reads the old ones.

## Acceptance criteria

- [x] `main-server/content/tutorial.yaml` holds the fifteen quests of the spec's table, in its `order`, each with `category`; a top-level `categories` list gives the five `{ key, label }` in display order.
- [x] Each new quest has `title`, `brief`, `body`, `condition`, `completion: { kind: button }`, `completionMessage`, `places` (Place numbers of the seed, or points with labels) and `links`, and its texts are marked *drafted* in a comment for the PM's review.
- [x] Each new quest has `facts`, each with `source` and `checked`, from official pages where the research file has them, and at least one fact a User might ask that the content does not state is left out (recorded in the PR for ticket 04).
- [x] `ms365-campus-software` and `gwanaksan-engineering-trail` are re-verified on their sources before they are written; a fact the sources disagree on (such as installing the licences on a personal laptop) is left out of `body` and `facts`, and the PR lists what was read, when, and what was left out. `counseling-center`'s place is 63 only if its floor is confirmed on an official page; otherwise it has no place.
- [x] `night-shuttle` covers the 탈출셔틀 (행정관, 21:10–23:10) and the 심야셔틀 (24:00–02:00 during semesters, and the 2026 exam-period times from 302동) and does not repeat `admin-shuttle`.
- [x] `tutorial-content.ts` rejects, so that the server does not start: a `category` not in `categories`, a category with no quest, and a category whose quests are not contiguous in `order`.
- [x] `GET /tutorial` serves `categories` beside `quests`; the app's `mobile/src/api/tutorial-types.ts` and its mock follow.
- [x] New setting `TUTORIAL_KWANJEONG_CHECK` (default `false`) in `main-server/src/common/settings.ts`. `servedContent` serves the 관정 quest as `{ kind: 'button' }` unless both `LIBRARY_BOOKING_ENABLED` and `TUTORIAL_KWANJEONG_CHECK` are on; the 관정 quest then completes by `button` and refuses `checked | forced | skipped`, and the reverse with both on. `tutorial.yaml` keeps 관정's `kwanjeongCheck` completion.
- [x] Quests gain an optional `ask`; 관정's is "관정도서관 7층 열람실에 한 자리 예약해줘". `servedContent` drops it when `LIBRARY_BOOKING_ENABLED` is off. The sheet shows 어시스턴트에게 예약 부탁하기 for any quest with `ask` (while `TUTORIAL_SHEET_FLAGS.askAssistantToBook` is on), and the skip text button only for `kwanjeongCheck`.
- [x] The pager keeps "새내기 튜토리얼 n/N" over all fifteen, shows a row of the five category chips that moves to that category's first quest not started (or its first quest), and shows the category's label above the title. The quest list's kicker and the sheet's kicker read "새내기 튜토리얼 · {category} · n/N".
- [x] Existing progress is kept: completed quests stay completed, and a User finished at five quests gets "새 퀘스트가 있어요" and the new quests on 진행하기.
- [ ] 지도에서 보기 puts one tutorial place pin on the main map at the place's point: a red teardrop with a white circle as in `references/tutorial-place-pin.png`, in `color.danger` and `color.surface`, as a new marker look of `@/map`, with the place's words (`shownPlace`) under it. Another 지도에서 보기 replaces it; a tap on the map away from it, selecting another thing, or stopping the tutorial removes it.
- [x] A tap on the pin at a Place where the map has a card (a 식당, a 공부공간 building once 02 is in, a place group or any thing there) selects that card, as a tap on its marker does. At a Place with no card, or a point such as the 행정관 셔틀 정류장, the tap opens nothing; the pin and its label stay.
- [x] `GLOSSARY.md` gains **Tutorial Category**.
- [x] Tests, named by ADR 0007: `main-server/test/tutorial-content.unit.test.ts` (the category rules, fifteen quests load), `tutorial-content.integration.test.ts` (every Place exists), `tutorial-progress.integration.test.ts` (관정 by button with the flag off, by check with it on; a finished User sees the new quests); `mobile/__tests__/tutorial-pager.integration.test.tsx` (chips, captions), `tutorial-sheet.integration.test.tsx` (관정 served as a button: 완료했어요 and 어시스턴트에게 예약 부탁하기, no skip), `tutorial-kwanjeong-check.integration.test.tsx` still passing with the quest served as `kwanjeongCheck`, and `mobile/__tests__/tutorial-place-pin.integration.test.tsx` (one pin with its words; a second replaces it; a tap at a Place with a 식당 card opens it; a tap on the 행정관 셔틀 정류장's pin opens nothing).
- [ ] Screenshots of the pager with the chips, the quest list, a new quest's sheet, and the pin on a building and on the shuttle stop, from the web target, in the PR.
- [x] No native file changes (CLAUDE.md § The app's native files).

## Comments

### Implementation notes (2026-11-04)

- **Pin removal by a tap on the map, not met**: `@/map` sends no press on the map's ground, and the native map
  module (`modules/snu-now-map`) has no such event, so adding one is a native change, which this ticket may not make.
  The pin goes with another 지도에서 보기, with a selection of another thing, and when the tutorial is stopped or off.
  A press on the pin itself at a point opens nothing and keeps it.
- **Screenshots, not taken**: the load rules of 2026-11-04 (the WSL VM crashed under the agents' load) forbid expo web
  and headless browsers. They need a phone or device build.
- **The mock** serves the 관정 quest as a button quest, as the main server does by default
  (`MOCK_TUTORIAL_SWITCHES.kwanjeongCheck`, which `tutorial-kwanjeong-check.integration.test.tsx` turns on), and the
  mock's Places gain 101 (아시아연구소) and 102 (정보화본부) from the seed, so that their quests have 지도에서 보기.
- **A finished User** (five quests of P06) staying finished and getting the ten new quests on 진행하기 is tested on the
  main server (`tutorial-progress.integration.test.ts`); the app's 내 정보 row already reads "새 퀘스트가 있어요" from
  the answer.
- **Wireframe**: read at version 1793787519-2c48 (last reviewed 1793724381-9465). Its tutorial frames still have no
  categories, so the chips and captions follow the current tutorial UI, as the PM decided.

### Agent usage (2026-11-04)

- Agent time: about 2 hours 30 minutes over two sessions (the first stopped by the VM crash). An estimate.
- Tokens: about 6.5M input, of which about 6.0M cache reads and 0.4M cache writes, and about 120k output, subagents
  included (none were used). An estimate.
