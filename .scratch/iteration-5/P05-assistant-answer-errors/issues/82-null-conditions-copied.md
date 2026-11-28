# 82: A condition said after an answer plans again when the conditions on screen hold nulls

Parent: [P05 spec](../spec.md). Found on 2026-11-28 at 16:01 on the user's phone (released app 26.11.28-11/12, the real server). After "월요일 점심 뭐 먹지", answered with 모레(월) 점심 11:30–12:30 until 13:00, "6천원 이하로" got only "죄송해요, 6천원 이하 조건으로 식사를 다시 찾지 못했어요. 가격 조건을 넣는 과정에서 계속 오류가 나고 있어요…". The old answer stayed on screen.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only.

## Cause

Read from the code; the Production log of the run was not read.

- The model reads the answer on screen as a [Plan on screen] line. An unset condition is written there as null: `"from":null,"placeId":null`.
- The rules for a follow-up (a price, a kind of food, an end, a start, a Friend) say to call planMeal again with the conditions on screen "as they are", and only the change.
- Copied as they are, the nulls reach planMeal. Its `from`, `until` and `placeId` take a string or nothing, so the SDK refused the call's input as a tool error, and again on each retry.

## Fix

One place for every tool (`adapter.ts`): the SDK's documented `repairToolCall`, which runs only on a tool call whose input was refused. It makes the call again with the fields the model gave null left out.

- A field that takes null is never repaired, since its call is not refused.
- An input still wrong after that is refused as before, with its own error.
- The tools' schemas, and so what the model reads of them, are unchanged.

`runFeature`'s tool context moved into `toolContextOf`, to keep it under its line limit.

## The class

- **Conditions:** every condition a follow-up says passes through the same planMeal call: a price (5천원 이하, 만원 안쪽, 6천원 정도), 싼 데 and 제일 싼 데, a kind of food, an end, a start, and a Friend added. Each is tested on today's lunch and on a later day's.
- **Kinds:** every kind's line on screen holds nulls: a meal's from, until and placeId; a meet's the same; a study's from and until; events' eventIds; 파티's globalEventId and questIds; a new 파티's globalEventId, title, placeId and time. The repair is the SDK's for every tool, so it covers each kind's follow-up as well.

## Tests

- `main-server/test/assistant-follow-up-nulls.integration.test.ts` (new, 20 tests, the endpoint with the scripted model). For each of ten follow-ups ("6천원 이하로", "5천원 이하", "만원 안쪽", "6천원 정도", "싼 데", "제일 싼 데", "한식으로", "12:30까지만", "12시부터", "민수도 불러 줘"), after today's lunch and after a later day's (until 13:00), planMeal is called with the line's conditions as they are, nulls included, and the change. The new answer holds the change. Before the fix, all 20 failed: the reply drew no answer.
- `main-server/test/tool-input-nulls.unit.test.ts` (new, 3 tests): a null on a field that takes none is read as left out; a field that takes null keeps it; a value of the wrong type is still refused. Before the fix, the first failed.

## Acceptance criteria

- [x] The tests above pass. So do the unit tests that run the adapter, and `assistant-meal-price`, `eval-tool-errors`, `assistant-meal-plan` and `assistant-plan-steps` (integration), each run once.
- [x] main-server's lint, types and format pass.
- [ ] On the phone after the Release: after a meal's answer, "6천원 이하로" plans again with the price.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 40 minutes (an estimate), in one session, from 16:05 KST.
- Tokens: not measured apart; a share of the session of tickets 80 and 81.
