# 06: Undo a done mark, and keep Quests listed when every Sub Quest is done

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)

## What to build

A Holder who marked a Sub Quest done can press it again to unmark it. The mark and its undoing are the Holder's own and tell no other Holder, as marking does today. A done Sub Quest stays faded.

Done marks no longer take a Quest out of the Holder's lists. A Sub Quest is ended only when cancelled or past its end time; its done mark is shown but does not end it. So a Quest leaves 내 파티 and the main screen's Quest list only when its Sub Quests are all cancelled or past their end time, as for every other Holder. When a Quest is deleted does not change: when the Leader ends it, or when its last Holder leaves. No schema changes.

The main server gains the undoing of a done mark, and the mock API follows both rules.

## Acceptance criteria

- [x] The main server removes the Holder's done mark for a Sub Quest on request; undoing a mark that does not exist succeeds and changes nothing; another Holder's marks are untouched.
- [x] A Sub Quest's `ended` is true only when it is cancelled or its end time has passed; `done` is the Holder's mark alone.
- [x] A Quest whose Sub Quests the Holder has all marked done is still in `GET /quests`; one whose Sub Quests are all cancelled or past their end is not.
- [x] In the room, pressing a done Sub Quest unmarks it and it is no longer faded.
- [x] After marking every Sub Quest done, the Quest stays in 내 파티 and in the main screen's Quest list.
- [x] Server end-to-end tests and screen tests cover the above; `quest-progress`, which asserted that done marks hide a Quest, changes with it and the PR names it.

## Comments

### 구현 전 정리 (2026-10-08)

- 현재 동작: 메인 서버는 `POST /quests/:questId/sub-quests/:subQuestId/done`으로 완료 표시만 할 수 있고(`SubQuestsService.markDone`), 되돌리는 경로는 없다. `toSubQuestDto`가 `ended: done || passed(...)`로 계산해서, Holder가 모든 Sub Quest를 완료로 표시하면 `QuestsService.list`의 `subQuests.some(!ended)` 필터에서 Quest가 빠진다. 앱은 `ended`만 보고 내 파티·메인 화면 퀘스트 목록에서 Quest를 거르므로(`shownSubQuest`, `toQuestGroups`, `quests-screen`) 같이 사라진다. 방(`plan-section.tsx`)의 Sub Quest 줄은 `over`(done·ended·cancelled)이면 흐리게 보이고 `완료로 표시` 버튼이 사라져서 되돌릴 수 없다. 목 API의 `markSubQuestDone`은 아무것도 하지 않는다.
- 바꿀 동작: `DELETE /quests/:questId/sub-quests/:subQuestId/done`이 그 Holder의 완료 표시를 지우고 204로 답한다(없으면 그대로 204, 다른 Holder 것은 그대로, 아무에게도 알리지 않음). `ended`는 취소됐거나 끝 시간이 지난 경우에만 true이고 `done`은 Holder의 표시일 뿐이다. 그래서 모든 Sub Quest를 완료로 표시해도 Quest는 `GET /quests`와 앱의 두 목록에 남는다. 방에서는 완료된 Sub Quest에 `완료 취소` 버튼이 보이고, 누르면 표시가 지워지고 더는 흐리지 않다. 완료된 줄은 여전히 흐리다.
- 고칠 곳: `main-server/src/quests/dto/quest.dto.ts`(`ended`), `sub-quests.service.ts`·`quests.controller.ts`(되돌리기), `test/quests.ts`·`test/quest-progress.e2e-spec.ts`, `main-server/README.md`; 앱의 `api/client.ts`·`api/server/room-client.ts`·`api/mock/room.ts`(`unmarkSubQuestDone`), `screens/room/use-room-actions.ts`·`plan-section.tsx`, `__tests__/room-plan-test.tsx`·내 파티/퀘스트 목록 화면 테스트, `mobile/README.md`.

### 바꾼 기존 테스트

- `main-server/test/quest-progress.e2e-spec.ts` (티켓이 허용한 테스트):
  - `Marking a Sub Quest as done > ends it for the User` → `marks it done for the User without ending it`: 표시 뒤 `ended: true`를 기대하던 것을 `ended: false`로. 완료 표시는 더는 Sub Quest를 끝내지 않는다.
  - `Marking a Sub Quest as done > leaves the other Holders as they were`: 표시한 Holder의 `ended: true` 기대를 `ended: false`로. 같은 이유.
  - `The Quest list > leaves out a Quest whose Sub Quests have all ended for the User, which can still be read`: 완료 표시로 Quest가 목록에서 빠진다고 단언하던 테스트. `keeps a Quest whose Sub Quests the User marked all done`(완료 표시로는 남는다)와 `leaves out a Quest whose Sub Quests are all cancelled, which can still be read`(취소되면 빠지고 여전히 읽힌다)로 바꿨다.
- `main-server/test/class-quest-refusals.e2e-spec.ts`: 기존 단언은 그대로 두고, 표의 경로 목록에 `undoing a mark of done`(새 `DELETE …/done`) 한 줄만 더했다. Class Quest에 대한 새 경로도 `CLASS_QUEST`로 거절됨을 확인하기 위해서다.
- `main-server/test/meetup-quests.e2e-spec.ts` (스펙이 이름을 대지 않은 테스트): `Progress on the Shared Quest of an accepted Meetup > keeps a mark of done to the Holder who made it`가 완료 표시 뒤 `ended: true`와 `GET /quests`에서 빠지는 것을 단언했다. 같은 규칙 변경이므로 `ended: false`와 목록에 남는 것으로 바꿨다. PR에서 이 테스트도 이름을 대야 한다.
- 앱의 기존 테스트는 바꾸지 않았다. 새 화면 테스트는 `room-plan-test.tsx`가 파일 길이 lint 한도(300줄)에 걸려 새 파일 `mobile/__tests__/room-done-test.tsx`에 두었다.

### Agent usage (2026-10-09)

- Agent time: about 2 hours 45 minutes (the resumed implementer, and half of the merge with 04) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 144 thousand in all, all subagents: the resumed implementer (88 thousand) and half of the merger shared with 04 (20 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
