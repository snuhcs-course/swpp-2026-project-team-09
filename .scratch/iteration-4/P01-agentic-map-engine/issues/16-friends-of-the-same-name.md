# 16: When the words fit several Friends, the Assistant asks and never picks

Parent: [P01 spec](../spec.md) ("The Assistant")
Status: ready-for-agent
Blocked by: None (can start immediately). The one-press question waits for package C's reply offers (#271).

## What to build

"배고파, 민수랑 같이", when 김민수 (컴퓨터공학부) and 이민수 (경영학과) are both my Friends, is answered with one question that names each by full name and department: "민수가 두 명이에요. 김민수(컴퓨터공학부)와 이민수(경영학과) 중 누구와 먹을까요?" Nothing is planned and nothing is drawn until I answer ("이민수", "경영", or "두 번째"). Today `resolveFriend` matches by substring and adds every candidate's id to the ids the tools accept (`tools/resolve-friend.ts`, `tools/resolved.ts`). So the model may go on with either one, and a wrong 민수 can be invited. `findFreeFriends` adds the ids again (`free-time/meal-tools.ts`).

## Acceptance criteria

- [ ] On 'several', the candidates' ids are contested. Every tool that takes a Friend refuses a contested id until a later 'one' from `resolveFriend` in the same message, with a reason that tells the model to ask which one. The tools are `planMeal`, `findFreeFriends` (with Friends), `findFriend`, `proposeQuest`, `planNewQuest`, and the library booking's companions. `findFreeFriends` adding the same id again does not settle it.
- [ ] An id of the plan on screen, or a tapped Friend, stays accepted as today.
- [ ] A candidate carries the full name (inside the delimiters for others' text, as today) and the department.
- [ ] `resolveFriend` takes an optional `department`: a Friend matches when the name holds the name's words and the department holds the department's words, spaces ignored. "민수" with "경영" answers 'one' with 이민수.
- [ ] An exact full name wins over names that only hold the words, unless another matching Friend's given name equals the words. "김민수" answers 'one'. "민수" still asks when one Friend's whole name is 민수 and another is 김민수.
- [ ] The prompt lines that say "listing the names" say "naming each by full name and department". The rule that sends the model to `findFreeFriends` to read departments is removed: the candidates carry them now, and that detour is how the ids leaked.
- [ ] Tests:
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

## Comments
