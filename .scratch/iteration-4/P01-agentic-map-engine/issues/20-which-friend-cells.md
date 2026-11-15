# 20: When the words fit several Friends, the reply asks with a cell for each

Parent: [P01 spec](../spec.md) ("The Assistant"); the same-name Friends seam agreed with package C (`same-name-friends/seam.md` in the coordinator's notes); [16](16-friends-of-the-same-name.md)
Status: ready-for-agent
Blocked by: None. The app side is package C's P02-17 (#293), on `4.0/Main`.

## What to build

"배고파, 민수랑 같이", when 김민수 (컴퓨터공학부) and 이민수 (경영학과) are both my Friends, is answered in an app that draws answers with no answer and no Lookup, and a `which-friend` refusal: the lines "민수가 두 명이에요." / "누구와 먹을까요?", and one `pick-friend` offer per candidate, which the app draws as a cell with the full name and the department beside it. A press sends the cell's `text` with `tapped: { kind: 'friend', userId }`, and the server takes that Friend by id. Ticket 16 made `resolveFriend` answer 'several' and the guard refuse the contested ids; the question was in the model's words. An app without the `answer` capability, and the model, keep the question in words, now naming every candidate by full name and department.

## Acceptance criteria

- [x] The server's refusal types match the app's `refusal-types.ts`: `REFUSAL_KINDS` has `which-friend`, and `RefusalOffer` has `pick-friend` (`userId`, `label`, `aside: string | null`, `text`). `refuse` still takes only the ten cases the model names. The app's reply check (`mobile/src/api/server/refusal-answers.ts`) accepts what the server sends, with no app change.
- [x] On `resolveFriend`'s 'several', the reply of an app that draws answers carries `refusal: { kind: 'which-friend', lines, offers }`, with no answer and no Lookup:
  - line 1 is the User's words with the subject particle and the count in words: "민수가 두 명이에요." for 민수, "김민수가 두 명이에요." when two share the full name 김민수, and digits past 열 ("민수가 11명이에요.");
  - line 2 fits what was asked: "누구와 먹을까요?" for planMeal, "누구와 만날까요?" for planMeet, "누구인가요?" for any other tool or when unknown;
  - one offer per candidate in `resolveFriend`'s order: `{ kind: 'pick-friend', userId, label: full name, aside: department or null, text: full name }`. No line holds a department.
- [x] Where planMeal's or planMeet's guard refuses a contested id, the question's second line becomes that tool's. Every other guard (findFriend, proposeQuest, planNewQuest, findFreeFriends, the library's) leaves `resolveFriend`'s question as it is.
- [x] The model's text is handled as #271's refusals handle it: the 'several' answer tells the model the app asks and to write nothing more, and the reply's text falls back to the lines. The app draws the refusal in place of the text, so the question is never shown twice.
- [x] Only an app with the `answer` capability gets the refusal, as `withRefusals` gives `refuse` only to it. The older chat's `resolveFriend` answer is unchanged, and `WHICH_FRIEND` (`tools/which-friend.ts`) names every candidate by full name and department: "김민수(경영학과)와 이민수(물리천문학부) 중 누구와 먹을까요?".
- [x] A press, the follow-up with `tapped: { kind: 'friend', userId }`, takes the Friend by id and meets no guard again, also when two Friends share the full name the press sends.
- [x] The candidates are only the asker's Friends, read through the Friend view as `resolveFriend` reads them. Nothing names or reveals a non-Friend.
- [x] Tests:
  - unit: the lines (particles, counts, each tool's second line), the offers, when the reply carries the question, the guard's second line, and a later 'one' dropping it;
  - integration at `POST /assistant/messages` with the scripted model: two Friends called 민수 asked with cells, planMeal's guard asking for a meal, the press planning with the tapped one, two named 김민수 asked and the press taken by id, "민수 어디야?" asking "누구인가요?", planMeet's guard asking "누구와 만날까요?", and an older app getting no refusal.

## Decisions (2026-11-15)

1. **The lines** are written by the server, never the model: "민수가 두 명이에요" / "누구와 먹을까요?". Line 1 uses the User's words, not a computed given name.
2. **The second line fits what was asked**: "누구와 먹을까요?" for planMeal, "누구와 만날까요?" for planMeet, "누구인가요?" for any other tool or when unknown.
3. **Names are full names everywhere**, with no computed label and no label change on a clash: `label` and `text` are the full name, `aside` the department. The department appears in the cell only, never in a line, chip, or tag.
4. **Where no cells exist**, the sentence names every candidate by full name and department ("김민수(경영학과)와 이민수(물리천문학부) 중 누구와 먹을까요?"). This replaces ticket 16's decision 6, the department only when two share a full name.
5. **The final wording** is confirmed by the user after pictures. It lives in `refusals/friend-question.ts` (the cells' lines) and `tools/which-friend.ts` (the words).

## Comments

### Decided in the build (2026-11-15)

- **What was asked.** The usual flow asks right after `resolveFriend` and calls no planner, so the resolver cannot tell a meal from a meet by itself. It takes an optional `forTool` ("The tool the Friend is found for, such as planMeal or planMeet"), a lenient string: planMeal and planMeet pick their line, anything else or none "누구인가요?". When the model calls planMeal or planMeet with a contested id anyway, their guard sets their line.
- **Line 2 is "누구와 먹을까요?" only when the model passes `forTool`**; otherwise it is "누구인가요?". The schema's description asks for `forTool`, and no rule does. A value the schema cannot take (null, a non-string, over 50 characters) is left out, as when none is given, so it never fails the call.
- **The model's text.** The 'several' answer of an app that shows the question carries `note` (`QUESTION_SHOWN`): the app asks with a cell for each, write nothing more and call nothing else. `REFUSAL_RULES` gains the same rule. With no text, the reply's text is the two lines (`textBeside`), which the conversation sends back. Text the model writes anyway stays the reply's text; the app shows the refusal in its place.
- **The first line ends with a period**, as the other refusals' first lines and ticket 16's wording do.
- **A tapped Friend among the matches is the one.** When the request's tapped Friend is among those the words fit, `resolveFriend` answers 'one' with them. So a press on one of two Friends named 김민수, whose `text` fits both, settles that one also where the model resolves the name again, as for proposeQuest, planNewQuest, and the library booking, which take no tapped id.
- **A later 'one' answers the question.** A 'one' that names a candidate of the question drops it ("민수", then "민수" with "경영" in one message). A 'one' for another Friend keeps it.
- **Beside an answer or a Lookup** no question is put, as `refuse` puts none, and the 'several' answer then carries no note.
- **The count** is every Friend the words fit; the cells are the first ten, the resolver's cap of candidates.
- **The kinds.** `REFUSE_KINDS` are the ten cases `refuse` takes; `REFUSAL_KINDS` adds `which-friend`, matching the app's list.
- **Gating by `answer`.** No release since 26.11.04 holds #271's reply check without #293's `which-friend` kind, so no installed app rejects the kind.
- **Files.** `refusals/friend-question.ts` (new: the lines, the offers, when the reply carries the question, the guard's line, and a later 'one'); `refusals/refusal.dto.ts` (the kinds and the offer); `refusals/refusals.ts` and `refusals/refusal-tools.ts` (`REFUSE_KINDS`, the rule); `tools/resolve-friend.ts` (`forTool`, the tapped Friend, the question); `gathering/plan-tools.ts` and `gathering/meet-tools.ts` (the guard's line); `tools/which-friend.ts` (the words).
- **Tests.** Unit: `test/assistant-friend-question.unit.test.ts`, and `test/resolve-friend-tool.unit.test.ts` (the input the model reads, a forTool it cannot take, one match with no note and no question, a tapped Friend outside the matches still asked about, and one inside them taken alone). Integration: `test/assistant-which-friend.integration.test.ts`. `test/assistant-same-name-friends.integration.test.ts` expects the note in the 'several' of an app that draws answers, and `test/fixtures/library/text-chat-rules.txt` holds the new words.

### Agent usage (2026-11-15)

- Agent time: about 1 hour 20 minutes, an estimate from the session transcripts: the build about 64 minutes, a review of the diff about 12, and the coordinating session about 6.
- Tokens, subagents included (the coordinating session's figures cover its whole stretch, most of which went to other pull requests):
  - Input: 498 uncached, plus 54,891,523 cache reads and 454,129 cache writes.
  - Output: 165,670.
