# 07: A 공개 파티 is for two or more

Parent: [P06 spec](../spec.md)
Status: done
Blocked by: [06](06-ended-parties-leave-the-lists.md), which changes the 파티 form's send path (`screens/party/form/use-send.ts`).

Native files: none. Releases: the main server and an app OTA update. The main server's change also reaches what the Assistant proposes.

## What happens now

Received: "지금 공개로 1인 정원 파티 (나만)를 게시판에 올릴 수 있음. 비공개는 약간 나 스스로 퀘스트 생성용?이라 칠 수 있어도 공개는 2인부터 하긴 해야 할 듯" (no screen).

- Main server: `capacitySchema = z.int().min(1).max(8)` (`main-server/src/quests/dto/quest-requests.dto.ts:16`). `makeQuestSchema` (:57-70) checks only the Board and the Join Policy; in `updateQuestSchema` (:75-81) everything is optional. `LeaderService.update` (`leader.service.ts:69-87`) checks `CAPACITY_BELOW_HOLDERS` and the Board. Turning a 비공개 파티 공개 goes the same way, as does an event's attend `PATCH` (`recruitingOf`, `mobile/src/features/party/making.ts:240`).
- App: `MIN_CAPACITY = 1`, `MAX_CAPACITY = 8` (`making.ts:42-43`; the comment "for 공개 and 비공개 alike" is at :28). The least is `leastCapacity` (:156), used by `screens/party/form/use-form-state.ts:222`; `CapacityField`'s − stops there (`party-form-fields.tsx:73`). `VisibilityField` (:117) does not raise the capacity when 공개 is chosen, and `isReady` (`making.ts:162`) does not check it.

## What to build

Decided 2026-11-22: a 공개 파티 (Join Policy Open or Approval) has a capacity of 2 or more; a 비공개 파티 (Closed) 1 or more.

- Main server: `makeQuestSchema` refuses an open Quest with capacity 1, by a refinement with `path: ['capacity']` and an English message. The Assistant's Proposal runs the same schema and keeps an issue only by its first path element, sending its message to the model as it is (`main-server/src/assistant/tools/propose-quest.ts:207-227`); so the Assistant then stops proposing an open 파티 of one, whose 만들기 would fail. The PR says that it changes what the Assistant answers.
- `LeaderService.update` checks the rule only when the request changes the capacity or the Join Policy, on the values after the change (`changes.capacity ?? quest.capacity` with the Join Policy after the change), and refuses with a new conflict code, so that the app can word it; a schema refinement alone would answer a plain 400 the app cannot word. A change of the title or the Board alone never meets the check.
- App: under 공개, the form's least capacity is 2 (− stops at 2), and choosing 공개 raises a capacity of 1 to 2. The new code's words go in `refusals.ts`; they show only when the server refuses (an older app, for one), are decided while building and shown at the screen review.
- An open Quest stored with capacity 1 before this change is left as it is, and its Leader can still change anything but the capacity and the Join Policy. Its edit form shows 2.
- Parties keep their own minimum of 1 (`main-server/src/parties/dto/party-requests.dto.ts:13`): a Party is not a 공개 파티, and `party-entry`'s open Party of one stays.
- Server tests that make a 공개 파티 of one to have it Full change to capacity 2 with a second Holder: `quest-joining:90`, `quest-join-requests:202`, `assistant-search-room:82`, :156. `assistant-search-room` is the Assistant's test: only its fixture changes, and the PR says so. (`quest-invitations:169` and :201 make a Closed Quest, the default of `makeQuestSchema`, `quest-requests.dto.ts:56`; `party-invitations:212` makes a Party, with its own capacity. Neither changes.)

## Must not break

- Making and editing a 비공개 파티 of one; making a 공개 파티 of two to eight; `CAPACITY_BELOW_HOLDERS`; the Board check; an event's attend `PATCH`.
- Tests: main server `quest-settings`, `own-quests`, `quests`, `assistant-proposals`, `assistant-closed-proposals`, `party-entry` (`.integration`); app `party-form`, `party-form-edit`, `party-form-parts`, `events-party-form` (`.integration`).
- `party-form-edit.integration.test.tsx:89-95` ("goes down to the User alone with no Friend invited") presses − down to 1명 on the form's default, 공개. It moves to 비공개, or expects 2명 under 공개.

## Decided while building (2026-11-22)

- The new conflict code is `OPEN_QUEST_OF_ONE` (409, "An Open or an Approval Quest has a capacity of 2 or more."). Its words in `refusals.ts` are "공개 파티는 2명 이상으로 정해 주세요", worded as `BOARD_REQUIRED`'s "게시판을 골라 주세요" asks for what the form needs.
- `makeQuestSchema`'s new message, which the Assistant's Proposal gives the model as it is, is "An Open or an Approval Quest has a capacity of 2 or more, and a Closed Quest 1 or more", worded as the Board's refinement beside it. A capacity left out (4) never meets it.
- One rule, `fitsJoinPolicy` in `quest-requests.dto.ts`, serves both the schema and `LeaderService.update`. The update's check comes after `CAPACITY_BELOW_HOLDERS`, so a capacity below the Holders still answers that code.
- App: `making.ts` holds the least. `leastCapacity` takes the visibility, `withVisibility` raises 1 to 2 when 공개 is chosen, and `formOf` shows 2 for an open Quest stored with 1. Saving that edit form sends capacity 2, which the main server takes: the Leader sees 2 and saves 2.
- `isReady` is unchanged: under 공개 the form never holds less than 2 (the empty form's 4, the − stopping at 2, 공개 raising 1, the edit form's 2).
- `proposalForm`, the form a Proposal fills, is left as it is: the Assistant no longer proposes an open 파티 of one, and one proposed before this change and made from its card is refused by the main server with a plain 400 ("저장하지 못했어요").
- Server fixtures: `quest-joining`'s full Quest leaves its `it.each` for a test of its own, because its second Holder changes the Holders the table checks; `assistant-search-room`'s 31 Full Quests each get a second Holder of their own, joined in parallel.
- From the screen review (2026-11-22): the three screens and the refusal words accepted as taken.

## Acceptance criteria

- [x] Making an open Quest with capacity 1 is refused; a Closed one with capacity 1 is made. (Main server integration test, which fails before the change.)
- [x] Changing an open Quest's capacity to 1, or making a Closed Quest of capacity 1 open, is refused with the new code. (Main server integration test, which fails before the change.)
- [x] The Assistant does not propose an open 파티 of one: asked for one, its Proposal carries the capacity's message. (Main server Assistant test, which fails before the change.)
- [x] Changing only the title of an open Quest stored with capacity 1 is accepted. (Main server integration test.)
- [x] Under 공개 the form's − stops at 2, and choosing 공개 raises 1 to 2. (App integration test, which fails before the change.)
- [x] The form under 공개 and 비공개 on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app and the main server.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 25 minutes, in one implementation session (screen review and pull request included). This is an estimate: gaps under 5 minutes between transcript entries, summed. The orchestrator session's own time is not counted here.
- Tokens: input 22,657,089 (cache reads 22,434,279, cache writes 222,588, uncached 222); output 73,925. Without cache reads, 222,810. No subagents. Counted up to the writing of this entry, so the last few messages are left out.
