# 07: A 공개 파티 is for two or more

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
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

## Acceptance criteria

- [ ] Making an open Quest with capacity 1 is refused; a Closed one with capacity 1 is made. (Main server integration test, which fails before the change.)
- [ ] Changing an open Quest's capacity to 1, or making a Closed Quest of capacity 1 open, is refused with the new code. (Main server integration test, which fails before the change.)
- [ ] The Assistant does not propose an open 파티 of one: asked for one, its Proposal carries the capacity's message. (Main server Assistant test, which fails before the change.)
- [ ] Changing only the title of an open Quest stored with capacity 1 is accepted. (Main server integration test.)
- [ ] Under 공개 the form's − stops at 2, and choosing 공개 raises 1 to 2. (App integration test, which fails before the change.)
- [ ] The form under 공개 and 비공개 on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app and the main server.

## Comments
