# 16: When the words fit several Friends, the Assistant asks and never picks

Parent: [P01 spec](../spec.md) ("The Assistant")
Status: ready-for-agent
Blocked by: None (can start immediately). The one-press question waits for package C's reply offers (#271).

## What to build

"배고파, 민수랑 같이", when 김민수 (컴퓨터공학부) and 이민수 (경영학과) are both my Friends, is answered with one question in two short lines that names each by full name: "민수가 두 명이에요." / "김민수와 이민수 중 누구와 먹을까요?" Nothing is planned and nothing is drawn until I answer ("이민수", "경영", or "두 번째"). Today `resolveFriend` matches by substring and adds every candidate's id to the ids the tools accept (`tools/resolve-friend.ts`, `tools/resolved.ts`). So the model may go on with either one, and a wrong 민수 can be invited. `findFreeFriends` adds the ids again (`free-time/meal-tools.ts`).

## Acceptance criteria

- [x] On 'several', the candidates' ids are contested. Every tool that takes a Friend refuses a contested id until a later 'one' from `resolveFriend` in the same message, with a reason that tells the model to ask which one. The tools are `planMeal`, `findFreeFriends` (with Friends), `findFriend`, `proposeQuest`, `planNewQuest`, and the library booking's companions. `findFreeFriends` adding the same id again does not settle it.
- [x] An id of the plan on screen, or a tapped Friend, stays accepted as today.
- [x] A candidate carries the full name (inside the delimiters for others' text, as today) and the department.
- [x] `resolveFriend` takes an optional `department`: a Friend matches when the name holds the name's words and the department holds the department's words, spaces ignored. "민수" with "경영" answers 'one' with 이민수.
- [x] An exact full name wins over names that only hold the words, unless another matching Friend's given name equals the words. "김민수" answers 'one'. "민수" still asks when one Friend's whole name is 민수 and another is 김민수.
- [x] The prompt lines that say "listing the names" ask in two short lines and name each candidate by full name, adding the department only when two share a full name (decision 6). The rule that sends the model to `findFreeFriends` to read departments is removed: the candidates carry them now, and that detour is how the ids leaked.
- [x] Tests:
  - unit tests of the resolver and of the contested ids;
  - integration tests at the endpoint with the scripted model:
    - two Friends called 민수: one question, nothing planned;
    - two with one identical full name: asked, then answered by department;
    - `findFreeFriends` after 'several', then `planMeal` refused;
    - "민수 어디야?": the same question, then `findFriend` after the answer.

## Decisions (2026-11-15)

1. **The given name** is the full name less its first character (one-syllable surnames), for names of three or more characters. A two-character name is its own given name.
2. **Two Friends with the same full name and the same department**: the question names them in the resolver's order ("첫 번째 · 두 번째"). Package C's label (a computed "경영학과 김민수", or "10월 3일부터 친구인 김민수") replaces the full name in the candidates when it lands (C's ticket), with no change here but the field read.
3. **The chat of an app without the `answer` capability** gets the same fix. Its prompt changes only in these lines, and its tools only in the resolver's answer. It is a fix of a wrong invitation, not a new feature, so today's flows are not kept as they were in this one respect.
4. **The evaluation case** `main-server/eval/cases/follow-ups.yaml` ("두 번째 거", `knownFailure`) is left as it is. Lifting it needs a run with the real model, which this ticket does not make.
5. **One press instead of typing**: once package C's #271 is on `4.0/Main`, the question goes out as a reply with lines and offers, one offer per candidate (the full name at the left, the department at the right). The kind's name is settled with C through the shared notes file. Until then, the question is in words.
6. **Less text in the question** (2026-11-15): the question is two short lines, such as "민수가 두 명이에요." / "누구와 먹을까요?", the second fitting what was asked ("누구인가요?" fits any). It names the candidates by full name only ("김민수와 이민수 중 누구와 먹을까요?"), and adds the department only when two of them share a full name ("김민수(경영학과)와 김민수(물리천문학부)"). The candidates still carry the department in the resolver's answer, so that the model can tell them apart and the User can answer "경영", and `department` stays an input of `resolveFriend`. No other sentence, chip or tag carries a department. The wording is one constant (`main-server/src/assistant/tools/which-friend.ts`), so that the final words can replace it once the user has seen pictures.

## Comments

### Decided in the build (2026-11-15)

- **Contested ids in `FoundIds`.** `contest` marks the ids of a 'several', `settle` takes the id of a 'one' and ends its contest, and `add` (findFreeFriends, and every other lookup) never ends one. `has` is false and `refuseUnfound` throws for a contested id, before the check of ids no tool returned. The refusal says the words fit several Friends, names the ids, says nothing was done, and tells the model to ask which one in the question's words and call nothing else. `proposeQuest` gives the same reason as its `inviteeIds` failure. The ids of a 'several' are no longer accepted at all until a 'one'; ids on screen or tapped bypass the guard as before, since each tool checks them before `FoundIds`.
- **Two answers in one message.** The last answer about an id decides. A 'one' settles only its own id, so after "민수" answered both, "민수" with "경영" takes 이민수 and 김민수 stays refused. A later 'several' contests its candidates again, also one settled before. Two 'several' answers add up.
- **An exact full name among several.** When two or more Friends are named exactly the words and no other match's given name is the words, the candidates are those exactly named ("김민수" asks between two 김민수, not also 김민수진). The given name is counted in UTF-16 units, which is the character for every Hangul syllable.
- **The department in the candidate** is others' text inside the delimiters (`friend.department`), as findFreeFriends already gives it. The 'none' reason names the department words when they were given.
- **The question's wording** lives in `WHICH_FRIEND`, used by the resolver's description, the chat's resolver rule, the Friend lookup rule, the library rule, the meal plan rule, the old chat's meal rule and the refusal. The findFreeFriends detour in `PLAN_RULES` and `FREE_TIME_MEAL_RULES` became "ask which one … and wait for the answer", so a meal still has a rule for 'several' in both chats.
- **Two Friends of one full name and one department** cannot be told apart by words until package C's label: `department` narrows nothing, so the answer stays 'several'. A press on a face (tapped) still picks one.
- **Tests.** Unit: `test/resolve-friend-words.unit.test.ts` (`friendsNamed`), `test/assistant-contested-ids.unit.test.ts` (`FoundIds`). Integration: `test/assistant-same-name-friends.integration.test.ts` (two 민수 and nothing planned, a tapped one planned, findFreeFriends then planMeal refused and a later 'one' planned, two 김민수 answered by "경영", "민수 어디야?" then findFriend, and the old chat's proposeQuest refused). `test/assistant-resolvers.integration.test.ts` now expects the department in each candidate. `MealPlanStage.friend` takes a department.

### Agent usage (2026-11-15)

This session (the ticket, the review, and the pull request) and the implementer subagent.

- Agent time: about 21 minutes, an estimate from the transcripts' timestamps (the union of active stretches, gaps over 5 minutes left out).
- Tokens: output 96,162; input 41,958,517, of which 41,684,623 were cache reads, 273,638 cache writes, and 256 uncached. Without cache reads: 370,056.
