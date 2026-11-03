# 01: Ten new Tutorial Quests in five categories, and 관정 completed by its button

Parent: [P13 spec](../spec.md) ("The Tutorial Quests")
Status: ready-for-agent
Blocked by: none

## What to build

The 새내기 튜토리얼 grows from five Tutorial Quests to fifteen, grouped into five Tutorial Categories (생활, 공부·학사, 이동, 건강, 문화·여가). The ten new quests come from `references/quest-candidates.md` (4, 6, 9+10 merged as 야간 셔틀 타기, 16, 22, 25, 26, 29, 33, 35), each with sourced facts the Assistant answers from. The pager, the quest list and the sheet show the categories within the current tutorial UI. Every quest, 관정 included, is completed by 완료했어요; the phone's 관정 check stays in the code behind a server flag, off, and 어시스턴트에게 예약 부탁하기 stays on the 관정 sheet.

This ticket changes no prompt. The Assistant reads the new quests through `getTutorial` as it reads the old ones.

## Acceptance criteria

- [ ] `main-server/content/tutorial.yaml` holds the fifteen quests of the spec's table, in its `order`, each with `category`; a top-level `categories` list gives the five `{ key, label }` in display order.
- [ ] Each new quest has `title`, `brief`, `body`, `condition`, `completion: { kind: button }`, `completionMessage`, `places` (Place numbers of the seed, or points with labels) and `links`, and its texts are marked *drafted* in a comment for the PM's review.
- [ ] Each new quest has `facts`, each with `source` and `checked`, from official pages where the research file has them, and at least one fact a User might ask that the content does not state is left out (recorded in the PR for ticket 04).
- [ ] `ms365-campus-software` and `gwanaksan-engineering-trail` are re-verified on their sources before they are written; a fact the sources disagree on (such as installing the licences on a personal laptop) is left out of `body` and `facts`, and the PR lists what was read, when, and what was left out. `counseling-center`'s place is 63 only if its floor is confirmed on an official page; otherwise it has no place.
- [ ] `night-shuttle` covers the 탈출셔틀 (행정관, 21:10–23:10) and the 심야셔틀 (24:00–02:00 during semesters, and the 2026 exam-period times from 302동) and does not repeat `admin-shuttle`.
- [ ] `tutorial-content.ts` rejects, so that the server does not start: a `category` not in `categories`, a category with no quest, and a category whose quests are not contiguous in `order`.
- [ ] `GET /tutorial` serves `categories` beside `quests`; the app's `mobile/src/api/tutorial-types.ts` and its mock follow.
- [ ] New setting `TUTORIAL_KWANJEONG_CHECK` (default `false`) in `main-server/src/common/settings.ts`. `servedContent` serves the 관정 quest as `{ kind: 'button' }` unless both `LIBRARY_BOOKING_ENABLED` and `TUTORIAL_KWANJEONG_CHECK` are on; the 관정 quest then completes by `button` and refuses `checked | forced | skipped`, and the reverse with both on. `tutorial.yaml` keeps 관정's `kwanjeongCheck` completion.
- [ ] Quests gain an optional `ask`; 관정's is "관정도서관 7층 열람실에 한 자리 예약해줘". `servedContent` drops it when `LIBRARY_BOOKING_ENABLED` is off. The sheet shows 어시스턴트에게 예약 부탁하기 for any quest with `ask` (while `TUTORIAL_SHEET_FLAGS.askAssistantToBook` is on), and the skip text button only for `kwanjeongCheck`.
- [ ] The pager keeps "새내기 튜토리얼 n/N" over all fifteen, shows a row of the five category chips that moves to that category's first quest not started (or its first quest), and shows the category's label above the title. The quest list's kicker and the sheet's kicker read "새내기 튜토리얼 · {category} · n/N".
- [ ] Existing progress is kept: completed quests stay completed, and a User finished at five quests gets "새 퀘스트가 있어요" and the new quests on 진행하기.
- [ ] `GLOSSARY.md` gains **Tutorial Category**.
- [ ] Tests, named by ADR 0007: `main-server/test/tutorial-content.unit.test.ts` (the category rules, fifteen quests load), `tutorial-content.integration.test.ts` (every Place exists), `tutorial-progress.integration.test.ts` (관정 by button with the flag off, by check with it on; a finished User sees the new quests); `mobile/__tests__/tutorial-pager.integration.test.tsx` (chips, captions), `tutorial-sheet.integration.test.tsx` (관정 served as a button: 완료했어요 and 어시스턴트에게 예약 부탁하기, no skip), and `tutorial-kwanjeong-check.integration.test.tsx` still passing with the quest served as `kwanjeongCheck`.
- [ ] Screenshots of the pager with the chips, the quest list and a new quest's sheet, from the web target, in the PR.
- [ ] No native file changes (CLAUDE.md § The app's native files).

## Comments
