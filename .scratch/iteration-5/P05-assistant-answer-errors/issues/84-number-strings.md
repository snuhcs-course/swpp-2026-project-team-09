# 84: A number the model writes as a string is read as that number

Parent: [P05 spec](../spec.md). Found on 2026-11-28 on the user's phone (preview app, the real server with tickets 82 and 83). After a lunch answer for 모레(월), "7000원 이하" ended with the cheapest first and no ceiling: "7,000원 이하로 거르는 건 적용되지 않아서, 대신 가장 싼 곳부터 보여 드려요". The list read "12곳 · 싼 순".
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only.

## Cause

Read from the code and tests; the Production log of the run was not read (see Comments).

- The server plans a ceiling of 7000 on a later day's lunch. The schema takes any whole number from 1 to 100,000, and ticket 82's tests pass "6천원 이하로" after a later day's answer. Ticket 82's repair only leaves null fields out.
- The final answer held `cheapFirst` and no `maxPrice`. A ceiling that had been planned would have read some plans fitting, as 2,000 ≤ 7,000.
- The likeliest cause: `maxPrice` is a whole number or the word 'any', and its JSON Schema offers a string. A ceiling written "7000" or "7,000" is refused, with no null for the repair to leave out, and the model fell back to `cheapFirst`.

## What changes

- **The repair.** The SDK's `repairToolCall` now makes a refused call again with what the model meant. It leaves out a field given null (ticket 82). It also reads a number written as a string ("7000", "7,000", "7000원") as that number, on a field whose JSON Schema takes a number. The SDK checks the repaired call again. The reading is `meantInput` (`tool-input-repair.ts`, with no model library), and the SDK's side stays in `adapter.ts`, the one file that knows it (ADR 0005).
- **One log line per refused call.** No line was written before: in Production nothing observes a run. Each refused call now logs one warning (it reaches `#team9-main-server-error`) through Nest's logger, so it carries the request's `req_id`. It holds:
  - the tool;
  - each refused field with its zod issue code and the type it expected;
  - what was changed, by field names alone.

  It never holds a value the model gave, which may hold the User's words. For example: `The model's planMeal call was refused: maxPrice invalid_union; made again with read as a number: maxPrice`, or `… ; not made again`. The main server's README documents it beside the model-call line.

## The class

- **Fields:** every number a tool takes is a top-level field the repair reads by its schema: planMeal's `maxPrice`, choosePlan's `number`, `minutes` of findLibraryFreeSlots, showLibrarySeats and proposeLibraryBooking, and proposeQuest's `capacity`.
- **Untouched:** a field that takes a string keeps its digits ("301"); 'any' stays as it is; a word is still refused.
- **Price wordings:** every wording in the rule (5천원 이하, 만원 안쪽, 6천원 정도, 싼 데, 제일 싼 데) reaches planMeal as these fields. With a number string, the ceiling is planned today and on a later day.

## Tests

`main-server/test/tool-input-numbers.unit.test.ts` (new, 29 tests, `runFeature` with the scripted model):

- "7000", "7,000", "7000원" and " 7,000 원 " are read as 7000.
- A whole-number field is read, beside a null left out, while a string field keeps "301".
- 'any' is kept, and "많이" is still refused.
- planMeal plans with `maxPrice: '7,000'` read as 7000, today and on a later day.
- Every price wording of the rule that names a number (5천원 이하, 5천원까지, 만원 안쪽, 6천원 정도, 7000원 이하), written as a string, in the same message and in the next with the lunch on screen, today and on a later day: 20 tests.

Before the first nine ran against `5.0/Main`, 7 of 9 failed; the two guards passed.

`main-server/test/tool-input-log.unit.test.ts` (new, 2 tests): a repaired call and one not made again each leave one line with the tool, the field, its code and the change, and neither the User's words nor the value. Both failed on this PR's first commit, which logged nothing.

## Acceptance criteria

- [x] The tests above pass. So do `tool-input-nulls`, `choose-plan`, `assistant-asked-reply`, `assistant-cached-prefix`, `screen-facts-tools` and `model-port` (unit), 90 in all.
- [x] main-server's lint, types and format pass.
- [ ] `assistant-follow-up-nulls` (integration) once the machine is free.
- [ ] On the phone after the Release, "7000원 이하" after a meal's answer plans with the ceiling.

## Comments

- **The log:** reading the Production log was denied by the session's permission check, and the user's leave passed on through another session does not lift it here. The log would tell this cause from the other likely one, another copied field refused.
- **Not changed, put to the user:** 싼 순 orders by price alone, so 아워홈(901동), a 34-minute shuttle ride at 2,000원, came first for a lunch between Classes.

### Agent usage (2026-11-28)

- Agent time: about 30 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 83.
