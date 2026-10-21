# 03: The dataset: the fixed world and the cases

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the case format for turns and history), 02 (the `expect` format)

## What to build

The benchmark's fixed world and its first set of cases, so that one `pnpm eval` measures the Assistant's agentic performance across everything it does today. All cases come in one pull request, so the team agrees on what "right" means before the numbers count. The world and the categories are those of the spec's "The fixed world" and "Cases". Prompt injection and security cases are not part of it.

## Acceptance criteria

- [ ] The fixed world is seeded for the benchmark (not the demo seed): the asking User; Friends 이민수 and 김민수 (two match "민수"), a pair with the same name and a Friend with a unique name (김지은); Places 학생회관 (63동) and 301동; Global Events in the week of 2026-10-21 of several kinds, one that ended; recruiting Quests on several Boards (hobby with a 운동 one, meal, study), some full or ended; menus for 10-21 and 10-22 with every meal; shuttle stops and vehicles; and a day with no menus and no events for the "no data" cases.
- [ ] 62 hand-written cases in the spec's 13 categories and counts, one file per category, each with its id, category, turns and `expect`.
- [ ] Follow-ups are mostly fixed history ("이민수" after an ask, "두 번째 거", "7시로 바꿔줘"); 3 live cases whose first reply leaves one right path.
- [ ] Ambiguous-intent cases expect TOOL+ASK only; "can't do" cases expect REFUSE; ambiguous targets and missing fields expect ASK naming the candidates or the missing fields, including "오늘 점심 약속 잡아줘" at 14:05 (`proposeQuest` refuses the past time); "7시로 바꿔줘" on a lunch Proposal expects PROPOSE+ASK (19:00, asking whether 07:00 was meant).
- [ ] Five compound requests (menus and the shuttle; this week's menus; a festival and a 파티 to it; a Proposal with two Friends, a Place and an event; "운동 파티 있으면 보여주고 없으면 하나 만들어줘"), run at both 8 steps / 30 s and 30 steps / 60 s with their STEP_LIMIT and TIMEOUT counts written in this ticket's comments.
- [ ] Cases expecting behaviour the Assistant lacks today carry `knownFailure`: "학관" for 학생회관 (63동); same-name Friends (ASK telling them apart by something other than the name, then "두 번째 거" → PROPOSE with that Friend); ambiguous intent.
- [ ] The expected behaviours are checked against `references/ai-chat-improvement.md` (P20's plan): ask on `several` and never pick, show one reading and ask about the other, state a computed date with its weekday.
- [ ] Each P07 open question has at least one case: map buttons after menus and shuttle; picking among event candidates; 운동 → the hobby Board and at most 3 cards for "파티 찾기"; the 08/12/18 defaults; every resolver before `proposeQuest`, asking on `several`.
- [ ] About 5 cases are marked `repeat: 3`.
- [ ] CI loads every case, checks it against the case schema, and checks that every seed name it refers to exists in the world.
- [ ] A 5-case run against the real model passes through the runner and the scorer, and its real cost per turn is written in this ticket's comments.
- [ ] The pull request lists the cases in a form the team can review in one read (for example a table of id, user message and expected behaviour).

## Comments
