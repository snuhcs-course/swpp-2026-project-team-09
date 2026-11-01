# 02: Tutorial server: content, progress and endpoints

Parent: [P06 spec](../spec.md) ("The tutorial": Content, Progress)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The server owns the 새내기 튜토리얼: its five quests' text, places and links from `main-server/content/tutorial.yaml`, each User's progress, and the derived state that decides what the app shows. A signed-in User reads the tutorial and its state, turns it on, stops it, hides the 내 정보 row, starts quests and completes them. Progress follows the User to another phone. A tutorial quest is not a Quest row and never shows on Boards or in Free Time.

The endpoints and the reply body are fixed in the spec ("Endpoints"), so ticket 03 builds against them now with mocks.

Eligibility by 소속 reads `affiliation` from ticket 01. Until 01 is merged the year rule alone applies, and the `exchange` rule and its test go in with whichever of the two lands second.

## Acceptance criteria

- [x] `main-server/content/tutorial.yaml` holds the five quests of the spec's table, in order, with the spec's texts (the *drafted* ones as drafted) and the S-CARD page URL copied from student.snu.ac.kr.
- [x] The file is loaded and checked with zod at start; a bad file stops the server with the reason.
- [x] `TutorialProgress` and `TutorialQuestProgress` tables as in the spec, with a migration. Rows for keys no longer in the YAML are ignored on read.
- [x] The timestamps follow the spec's rules: `GET /tutorial` stores `enabledAt` for a User eligible by default (`admissionYear ≥` the current Korean year by the server's clock, or `affiliation = exchange`) the first time it finds neither `enabledAt` nor `stoppedAt`; `enable` sets `enabledAt` and clears `stoppedAt` and `finishedAt`; `stop` sets `stoppedAt`.
- [x] The state is derived in the spec's order, the first that holds, by which timestamps are set and never by comparing them: `finished` (`finishedAt`), `stopped` (`stoppedAt`), `off` (no `enabledAt`), `active` (a quest started), `available`.
- [x] `GET /tutorial`, `POST /tutorial/enable`, `/stop`, `/hide-row`, `/quests/:key/start` and `/quests/:key/complete { by }` exist as the signed-in User. Each is idempotent and answers with the new `GET /tutorial` body. An unknown key is a 404.
- [x] `complete` accepts `button` only for a `button` quest and `checked | forced | skipped` only for `kwanjeongCheck`, otherwise 400. A complete that leaves no quest of the content at that time uncompleted sets `finishedAt`. Adding a quest to the YAML later does not clear it: a finished User stays `finished` (the new quest does not reappear) until they enable again in 내 정보.
- [x] Nothing here creates a `Quest`, `SubQuest` or Holder row; `UserDayService` results do not change for a User with tutorial progress (checked in a test).
- [x] Tests, named by ADR 0007:
  - unit: the YAML loads; keys are unique; each `place` number exists in the shared Place seed; each link is a URL; each completion kind is valid;
  - unit: the state derivation over a table of progress rows, including rows with only some timestamps set;
  - integration: eligibility by year and by `exchange`; each state; enable, stop and enable again keeping progress; idempotent start and complete; `by` checked against the kind; `finished` after the last quest, still `finished` after a quest is added to the content, and `enable` then showing it not started (prior art: the profile and Quest integration tests).
- [x] Privacy: the tutorial replies carry no other User's data and no 학번 or registered name.

## Comments

- **Ticket 01's `affiliation`.** Not on `3.0/Main` yet. `src/tutorial/affiliation.ts` reads `user.affiliation` when the field exists and null otherwise, so the `exchange` rule is in `eligibleByDefault` (unit-tested) and switches on by itself once 01's column lands; then replace the adapter with `user.affiliation`. The integration test "An exchange student" is `describe.skipIf` until `Prisma.UserScalarFieldEnum` has `affiliation`, and sets it with `PATCH /users/me/profile { affiliation: 'exchange' }`, which 01 must accept.
- **Choices the spec left open:**
  - `body` is a list of paragraphs (ticket 03's "the body's paragraphs").
  - A seed place may carry a `label` besides `floor`, for "우리은행 (4동)" (spec, Further Notes); Place 4 is 신양인문학술정보관 in the seed.
  - The POSTs answer 200, not 201. Start, complete and stop are accepted in any state (complete starts a quest not started; stop while off reads as `stopped`). A quest completed once keeps its first `completedBy`.
  - `finishedAt` is set by one conditional `UPDATE` after the quest's own write, so two last completions sent together still finish (tested).
  - The S-CARD link is `https://student.snu.ac.kr/대학생활/기타/s-card/발급-절차/` (percent-encoded, "발급 절차 - 서울대학교 학생처", checked 200 on 2026-11-01).
  - `yaml` moved from devDependencies to dependencies, since the server reads the file at runtime.
  - `startApp` gained an optional `tutorialFile`, overriding the `TUTORIAL_FILE_PATH` provider, for the content-change tests.
- **Not here:** `LIBRARY_BOOKING_ENABLED` serving the 관정 quest as `button` (spec, Further Notes) belongs with the flag's ticket.
- **Places checked against the seed:** 67 NH농협두레문예관, 4 신양인문학술정보관, 62-1 중앙도서관 관정관, 63 학생회관, 151 미술관, 68 파워플랜트. The shuttle point 37.460938, 126.950312 is the middle of plus code 8Q98FX62+94, about 130 m south-west of 행정관 (60).

### Agent usage (2026-11-01)

- Agent time: about 2 hours, one session, of which about 50 minutes running the full suite on a machine loaded by the other worktrees (estimate).
- Tokens: about 4.5M input, of which about 4.3M cache reads and 0.15M cache writes, and about 50k output (estimate, no subagents).

### Full suite (2026-11-01)

The tutorial's 5 test files pass (unit 34, integration 41 with 1 skipped until 01's `affiliation`). The full `pnpm test` ran while the other P06 worktrees ran Expo, Jest and Vitest on the same machine (load average 27–44 on 8 cores): 57 files failed, all with the 5 s test or 60 s hook timeouts and the connection errors that follow them, also in serial reruns. `quest-join-requests` and `assistant-free-time` passed when run alone. Run the full suite again on a quiet machine or in CI before merging.
