# 03: The dataset: the fixed world and the cases

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the case format for turns and history), 02 (the `expect` format)

## What to build

The benchmark's fixed world and its first set of cases, so that one `pnpm eval` measures the Assistant's agentic performance across everything it does today. All cases come in one pull request, so the team agrees on what "right" means before the numbers count. The world and the categories are those of the spec's "The fixed world" and "Cases". Prompt injection and security cases are not part of it.

## Acceptance criteria

- [x] The fixed world is seeded for the benchmark (not the demo seed): the asking User; Friends 이민수 and 김민수 (two match "민수"), a pair with the same name and a Friend with a unique name (김지은); Places 학생회관 (63동) and 301동; Global Events in the week of 2026-10-21 of several kinds, one that ended; recruiting Quests on several Boards (hobby with a 운동 one, meal, study), some full or ended; menus for 10-21 and 10-22 with every meal; shuttle stops and vehicles; and a day with no menus and no events for the "no data" cases.
- [x] 62 hand-written cases in the spec's 13 categories and counts, one file per category, each with its id, category, turns and `expect`.
- [x] Follow-ups are mostly fixed history ("이민수" after an ask, "두 번째 거", "7시로 바꿔줘"); 3 live cases whose first reply leaves one right path.
- [x] Ambiguous-intent cases expect TOOL+ASK only; "can't do" cases expect REFUSE; ambiguous targets and missing fields expect ASK naming the candidates or the missing fields, including "오늘 점심 약속 잡아줘" at 14:05 (`proposeQuest` refuses the past time); "7시로 바꿔줘" on a lunch Proposal expects PROPOSE+ASK (19:00, asking whether 07:00 was meant).
- [ ] Five compound requests (menus and the shuttle; this week's menus; a festival and a 파티 to it; a Proposal with two Friends, a Place and an event; "운동 파티 있으면 보여주고 없으면 하나 만들어줘"), run at both 8 steps / 30 s and 30 steps / 60 s with their STEP_LIMIT and TIMEOUT counts written in this ticket's comments.
- [x] Cases expecting behaviour the Assistant lacks today carry `knownFailure`: "학관" for 학생회관 (63동), only in the abbreviation cases (ambiguous-intent cases say "학생회관"); same-name Friends (ASK telling them apart by something other than the name, then "두 번째 거" → PROPOSE with that Friend); ambiguous intent.
- [x] The expected behaviours are checked against `references/ai-chat-improvement.md` (P20's plan): ask on `several` and never pick, show one reading and ask about the other, state a computed date with its weekday.
- [x] Each P07 open question has at least one case: map buttons after menus and shuttle; picking among event candidates; 운동 → the hobby Board and at most 3 cards for "파티 찾기"; the 08/12/18 defaults; every resolver before `proposeQuest`, asking on `several`.
- [x] About 5 cases are marked `repeat: 3`.
- [x] CI loads every case, checks it against the case schema, and checks that every seed name it refers to exists in the world.
- [ ] A 5-case run against the real model passes through the runner and the scorer, and its real cost per turn is written in this ticket's comments.
- [x] The pull request lists the cases in a form the team can review in one read (for example a table of id, user message and expected behaviour).

## Comments

### Dataset built (2026-10-22)

Built on `2.0/P19-03-dataset`, on `2.0/P19-02-scorer` at `4f5b5e2` (01 and 02 not merged yet). Not pushed; no PR yet.

- The world: `eval/world-data.ts` holds what it is, by seed name; `eval/world.ts` seeds it with the e2e helpers
  (`signInUser`, `befriend`, `storeEvent`, `ownQuest`, `attend`, `joinQuest`, `sendAsWorker` with menus and the
  shuttle) into the app's database, through a connection of its own (`startApp` imports the app afresh, so the
  benchmark cannot ask Nest for its `PrismaService` by class). 2026-10-23 (금) is the "no data" day: no menus, no
  Global Event, no 식사 파티.
- The shuttle: the server keeps a set of vehicles for a minute only, so `World.refresh()` stores the two vehicles
  again, and `run.eval.ts` calls it before each case. Their `collectedAt` is 14:04:45, just before the run's clock.
- The cases: one file per category, 62 in all, the categories named `menus`, `shuttle`, `global-events`,
  `finding-parties`, `making-parties`, `missing-or-ambiguous-target`, `ambiguous-intent`, `no-data`, `out-of-scope`,
  `small-talk`, `follow-ups`, `live`, `compound`. The repeated set: `menus-today-lunch`, `shuttle-where-now`,
  `finding-parties-no-condition`, `making-parties-lunch-with-friend`, `ask-which-minsu`. The table for review is
  [cases.md](../cases.md), generated from the YAML.
- Known failures (8): the 4 ambiguous-intent cases (until 3-1); "학관" in `menus-abbreviation-hakgwan` and
  `making-parties-abbreviation-hakgwan`; same-name Friends in `ask-which-same-name-friend` and
  `follow-up-second-same-name-friend`. A case asking the reply to state the computed date with its weekday waits for
  P20's 3-5 (today's prompt says not to repeat a Proposal's fields); `making-parties-friday-dinner` checks only the
  Proposal's date, 2026-10-23 19:00.
- Decided where the spec left room:
  - "7시로 바꿔줘" is PROPOSE+ASK with 19:00 and a mention of 오전/아침/07:00; the history's Proposal is sent back as the
    app does, so its ids are accepted.
  - The fixed-history follow-ups require only `proposeQuest` or the search they need; the resolvers are `allowed`,
    so that 3-4 needs no edit.
  - In the same-name pair's history the first turn tells them apart by department, the ideal answer; "두 번째 거"
    expects 박서준 (물리천문학부).
  - "a festival and a 파티 to it" is read as showing the festival's card and the 파티 going to it.
  - `eval-runner.e2e-spec.ts` now seeds the world into a database of its own too, since the full world (events in
    this real week, 파티, menus) should reach no other test.
- CI: `test/eval-cases.e2e-spec.ts` loads every case through the schema, checks the categories and counts (62), the
  live and repeated sets, the actions of the ambiguous-intent, out-of-scope and small-talk cases, that "학관" (as a
  word) appears only in known failures, that every seed name a case gives is in the world as that kind of thing, and
  17 facts of the world that the right answers rest on, by calling the tools through the scripted model (for example
  that 민수 and 축제 answer several, that 학관 does not find 학생회관 and that 2026-10-23 has no menus).
- Not done, and not ticked: the 5-case trial run against the real model and the compound cases at both limit
  settings. Both call OpenRouter, which needs the team's approval to spend credit; their cost per turn and the
  STEP_LIMIT and TIMEOUT counts go here once run (`pnpm eval --case <5 ids>`, then `pnpm eval --category compound`
  and again with `--max-steps 30 --timeout 60000`).

### Review fixes (2026-10-22)

From the two-axis review of `301c0b6`, as a second commit:

- Cases: the ambiguous-intent mentions are question forms for the other reading (만들어 드릴까, 모집해 드릴까, 잡아
  드릴까, …), so that a plain lookup no longer passes as TOOL+ASK. `ask-which-same-name-friend` must name both
  departments (경영학과 and 물리천문학부, or their short forms). The meal recommendation's mentions are taste
  questions (좋아하, 취향, 당기, …). `resolveGlobalEvent` is allowed, not required, wherever `searchGlobalEvents` also
  gives ids proposeQuest accepts. `global-events-this-week-shows` and `finding-parties-study` check only the cards.
  `ask-lunch-already-past` takes "the time has passed" or a question about the time as one any-of mention.
  `no-data-events-day-after-tomorrow` allows showGlobalEvents. `menus-abbreviation-hakgwan` expected getMenus with
  the restaurant 학생회관; changed again in the review by 함재현, below.
- A known limitation: in `no-data-restaurant-breakfast`, a getMenus for every restaurant finds 학생회관식당's
  breakfast, and a reply that then says 자하연식당 has none without the dining button is no action under the scorer
  (a lookup that found something with nothing shown). Left as it is.
- Code: the world's remaining data (the leader and joiner, the menus' collectedAt) is in `eval/world-data.ts`;
  `seedOf` in `eval/world.ts` is the one seed lookup, which the runner uses too; `seedWorld(app, databaseUrl)` takes
  the database's URL; `seededDatabase(settings)` in `test/containers.ts` gives a test file its own seeded database;
  English prose says Quest, not 파티.

### Review by 함재현 (2026-10-22)

From the review of #111, as a third commit:

- `compound-proposal-two-friends-place-event`: the User now says "5시에 학생회관에서 모여서 가는 걸로". resolvePlace is
  told to pass the User's words exactly, and "학생회관 앞" names no Place. The case checks no resolvePlace argument, so
  nothing else changed: the Proposal still expects 학생회관.
- `menus-abbreviation-hakgwan`: getMenus is checked for its date and meal only, no longer for its restaurant, so that
  a model passing 학생회관식당 can pass once abbreviations are read. The outcome keeps right from wrong: the mention
  제육볶음 is 학생회관식당's lunch, which 자하연식당 (비빔밥) does not serve, and the dining button. A call for every
  restaurant that lists both lunches passes too, as it answers the question.
- Still open: `no-data-restaurant-breakfast` is checked again after the scorer's next change (a found lookup answered
  in words counts as TOOL).

### Agent usage (2026-10-22)

- Agent time: about 1 hour 40 minutes (estimate), one subagent session in its worktree, both reviews' fixes included.
- Tokens (estimate, this session only): about 18M input, of which about 17.1M cache reads and 0.7M cache writes, and
  about 90k output. No subagents.
