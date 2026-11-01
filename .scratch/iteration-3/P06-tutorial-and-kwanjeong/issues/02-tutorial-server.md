# 02: Tutorial server: content, progress and endpoints

Parent: [P06 spec](../spec.md) ("The tutorial": Content, Progress)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The server owns the 새내기 튜토리얼: its five quests' text, places and links from `main-server/content/tutorial.yaml`, each User's progress, and the derived state that decides what the app shows. A signed-in User reads the tutorial and its state, turns it on, stops it, hides the 내 정보 row, starts quests and completes them. Progress follows the User to another phone. A tutorial quest is not a Quest row and never shows on Boards or in Free Time.

The endpoints and the reply body are fixed in the spec ("Endpoints"), so ticket 03 builds against them now with mocks.

Eligibility by 소속 reads `affiliation` from ticket 01. Until 01 is merged the year rule alone applies, and the `exchange` rule and its test go in with whichever of the two lands second.

## Acceptance criteria

- [ ] `main-server/content/tutorial.yaml` holds the five quests of the spec's table, in order, with the spec's texts (the *drafted* ones as drafted) and the S-CARD page URL copied from student.snu.ac.kr.
- [ ] The file is loaded and checked with zod at start; a bad file stops the server with the reason.
- [ ] `TutorialProgress` and `TutorialQuestProgress` tables as in the spec, with a migration. Rows for keys no longer in the YAML are ignored on read.
- [ ] The timestamps follow the spec's rules: `GET /tutorial` stores `enabledAt` for a User eligible by default (`admissionYear ≥` the current Korean year by the server's clock, or `affiliation = exchange`) the first time it finds neither `enabledAt` nor `stoppedAt`; `enable` sets `enabledAt` and clears `stoppedAt` and `finishedAt`; `stop` sets `stoppedAt`.
- [ ] The state is derived in the spec's order, the first that holds, by which timestamps are set and never by comparing them: `finished` (`finishedAt`), `stopped` (`stoppedAt`), `off` (no `enabledAt`), `active` (a quest started), `available`.
- [ ] `GET /tutorial`, `POST /tutorial/enable`, `/stop`, `/hide-row`, `/quests/:key/start` and `/quests/:key/complete { by }` exist as the signed-in User. Each is idempotent and answers with the new `GET /tutorial` body. An unknown key is a 404.
- [ ] `complete` accepts `button` only for a `button` quest and `checked | forced | skipped` only for `kwanjeongCheck`, otherwise 400. A complete that leaves no quest of the content at that time uncompleted sets `finishedAt`. Adding a quest to the YAML later does not clear it: a finished User stays `finished` (the new quest does not reappear) until they enable again in 내 정보.
- [ ] Nothing here creates a `Quest`, `SubQuest` or Holder row; `UserDayService` results do not change for a User with tutorial progress (checked in a test).
- [ ] Tests, named by ADR 0007:
  - unit: the YAML loads; keys are unique; each `place` number exists in the shared Place seed; each link is a URL; each completion kind is valid;
  - unit: the state derivation over a table of progress rows, including rows with only some timestamps set;
  - integration: eligibility by year and by `exchange`; each state; enable, stop and enable again keeping progress; idempotent start and complete; `by` checked against the kind; `finished` after the last quest, still `finished` after a quest is added to the content, and `enable` then showing it not started (prior art: the profile and Quest integration tests).
- [ ] Privacy: the tutorial replies carry no other User's data and no 학번 or registered name.
