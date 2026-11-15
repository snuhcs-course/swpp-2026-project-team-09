# 12: The topics step reads the words in use once a step and loads only recruiting Quests

Parent: [P05 spec](../spec.md) ("Part 2", "Watched interests")
Status: ready-for-agent
Blocked by: 08 (merged).
Native files: no

## What to build

Ticket 08's topics step wastes work in every pod every minute, in two ways. It reads the topics in use (an `unnest` scan of `watched_interests`, `global_events` and `quests`) once for every text it reads, up to 20 times a step. And it loads up to 100 Open or Approval Quests with all their relations, newest first, and drops those without a Sub Quest ahead: those are never claimed, so every pod loads them again every minute, and once more than 100 newer ones without a Sub Quest ahead exist, an older recruiting Quest is never reached. Both are fixed now. What Users see does not change.

It also asks the model twice about one text when two servers step at once. A claim counts a try but leaves the topics empty until they are stored, so another server's step lists the text as a failed first try and claims the second while the first call is still running; and since the claim checks only the try count, a step that listed the text during the first call can claim it even after the topics were stored. That is fixed in the same change.

## Behaviour

- **The topics in use are read once a step**, when the step has an event or a Quest to read, and handed to each call. After a text is given its topics they join that list, so that two texts of one step that mean the same still get the same word. `InterestsService.watch` still reads the list once per call.
- **Only recruiting Quests are loaded.** The step's query asks for an Open or Approval Quest on a Board that has a Sub Quest ahead, the rule of `hasSubQuestsAhead` written as a where: a Sub Quest that is not attending whose end is unset or after now, or the attending Sub Quest while its Global Event is published and that event's end is unset or after now. It loads at most 10. `toRecruitingQuestDto` stays as the last guard.
- **A Quest without a Sub Quest ahead is not marked as tried**: a new Sub Quest can make it recruiting, and it is read then.
- **A text whose call may still be running is not asked about again.** A text is unread when it was never read (`topicsReadAt` null), or when its topics are empty, it was tried fewer than 2 times, and its last try is older than the topics call's time limit (`ASSISTANT_TIMEOUT_MS`) and a minute. The selection and the claim go by this one rule, and the claim's conditional update also requires the try count unchanged, so two steps at once claim a text once. A failed call is still tried once more, at a later step once that time has passed.
- **An edited post keeps its topics.** An event or a Quest edited after its topics were stored keeps them, and the step does not read it again. The code did this before; the README now says so.

## Files

- `main-server/src/interests/topics-reader.ts`: `inUse()` is public, and `read(text, inUse?)` reads the list only when none is given.
- `main-server/src/interests/topics-step.service.ts`: the list once per `run()`, each text's topics added after they are stored; the Quests' where, and a `take` of 10; the unread rule, used by the selection and the claim.
- `main-server/src/quests/dto/quest.dto.ts`: `subQuestsAheadWhere(now)`, beside `hasSubQuestsAhead`.
- `main-server/test/interest-topics.integration.test.ts`, `test/interests.ts`, and `test/topics-model.ts`: the tests, and a stand-in answer that depends on the topics in use.
- `main-server/README.md`, "Interests": the step's sentences.

## Must not change

- The topics read, the Notifications told, and every route's answers.
- `InterestsService.watch`.
- The schema. GIN indexes on the `topics` arrays are not in this ticket.
- Native files, and anything about deployment.

## Acceptance criteria

- [x] A step that reads several texts reads the topics in use once (a spy on `TopicsReader.inUse`).
- [x] Two events of one step that the stand-in model reads alike get the same word.
- [x] A Quest whose one Sub Quest has ended is not among the rows the step's Quest query gives.
- [x] A recruiting Quest behind 101 newer Open Quests whose Sub Quests have ended is read.
- [x] An event in the state a running call leaves it in (topics empty, one try, last tried just now) is not claimed by a second step, and the model is not asked about it.
- [x] A failed call is tried once more only after the step's clock has passed the call's time limit and the minute, and never a third time.
- [x] The step's other tests and those of the matches and Notifications pass, within the files' 30 s timeout.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **"Recruiting" in the where** is the Quest-level twin of `hasSubQuestsAhead`, `subQuestsAheadWhere(now)` in `quest.dto.ts`: some Sub Quest with `attending` false and `endsAt` null or after now, or some attending Sub Quest and a Global Event whose state is `published` and whose `endsAt` is null or after now. The step adds it to Open or Approval, on a Board, and unread. The two functions sit side by side with a note that they change together; the recruiting list itself still filters in code and is unchanged.
2. **An attending Sub Quest without a Global Event** is not covered by the where. The database stores no time on an attending Sub Quest and a Quest's Global Event never changes, so the case does not occur.
3. **The query takes 10**, as many as a step reads, instead of 100 cut to 10 after the check: the where and the check now agree.
4. **The list is read only when there is something to read.** A failed read now fails the step before any try is counted, where before it burned the try of each text as a text with no topics.
5. **New topics join the end of the list**, in the order given, so the list can pass 200 topics within a step.
6. **`TopicsReader.read` still reads the list itself when none is given**, so `InterestsService.watch` is unchanged and, as before, reads nothing without `OPENROUTER_API_KEY`.
7. **The tests' stand-in model can answer by the topics in use**: `TopicsModel.answer(text, (inUse) => …)`. The two tennis texts are registered for every stage, so that a step in another test file answers them alike.
8. **The rows the step's Quest query gave** are read from a spy on the app's `quest.findMany`. A Prisma query is not a `Promise`, so the spy leaves it unsettled; the test awaits each again, which gives the rows the step got without asking the database again.
9. **A second try waits until the first call is over.** The double ask showed when `interest-topics` and `interest-news` ran side by side (a job fair with `topicsTries` 2), on the base as well. The rule lives in one place, `TopicsStep.unread(now)`; the wait is `ASSISTANT_TIMEOUT_MS`, the setting the topics call's timeout comes from, plus one minute, read when the step is made. With the tests' 30 s that is 90 s, so the failed-call test moves the app's clock 2 minutes ahead before the second try.
10. **A try's time is when it is claimed**, read from the clock at the claim, not when the step began: with the real model a step's last texts are claimed long after it began, and the wait counts from the start of their own call. The claim's check of the rule uses that time too.
