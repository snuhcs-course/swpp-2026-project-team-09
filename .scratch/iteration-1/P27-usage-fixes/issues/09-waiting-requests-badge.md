# 09: The waiting requests to join on 내 파티

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: 06 (Undo a done mark, and keep Quests listed), as both change the User's Quests answer and 내 파티

## What to build

A Leader sees, at the top right of each Quest's block in 내 파티 that they lead, a red circle with a white number: the requests to join that wait for their answer. The number goes down as they accept or decline, and the badge is gone when none waits. A Holder who does not lead the Quest sees no badge.

Each Quest in the main server's answer for the User's Quests carries that number, counted only when the User leads it (0 otherwise). The existing `quests-changed` signal on a new, withdrawn or answered request already refetches the list, so the number follows without reopening the screen. The mock API follows.

## Acceptance criteria

- [x] `GET /quests` gives each Quest the number of its waiting requests to join when the User leads it, and 0 otherwise.
- [x] 내 파티 shows the badge on a led Quest with waiting requests, with the number, and none at 0.
- [x] Accepting or declining a request, or its withdrawal, updates the number after `quests-changed`.
- [x] A Holder who does not lead the Quest sees no badge.
- [x] Server end-to-end tests and screen tests cover the above; the existing tests pass unchanged.

## Comments

### 구현 (2026-10-09)

- 서버: `QuestDto`에 `waitingJoinRequests`를 더했다. 읽는 User가 Leader면 그 Quest의 `QuestJoinRequest` 수(Prisma `_count`), 아니면 0. Class Quest는 0. `GET /quests`뿐 아니라 같은 모양을 쓰는 `GET /quests/:questId`와 만들기·참여 응답에도 실린다.
- 서버: 거절(`.../decline`)은 지금까지 신청한 User에게만 `quests-changed`를 보냈다. Leader에게도 보내도록 했다(Leader의 다른 기기에서 배지가 따라오게). 수락·철회·새 신청은 이미 Leader에게 갔다.
- 새 e2e: `main-server/test/quest-waiting-requests.e2e-spec.ts`(Leader의 수, 수락·거절·철회로 줄어듦, Leader 아닌 Holder는 0, 거절 시 Leader에게 신호).
- 앱: `Quest` 타입과 응답 검사(`isQuest`)에 `waitingJoinRequests`를 더했고, `mine.ts`의 카드에 `waiting`, `mine-tab.tsx`에 카드 오른쪽 위 빨간 원(흰 숫자, 접근성 이름 `기다리는 참여 신청 {n}건`)을 그렸다. 0이면 없다. `MineCard`가 lint 함수 길이 한도에 걸려 Holder 줄을 `People`로 뺐다.
- 목 API: 목의 Quest는 모두 `waitingJoinRequests: 0`. 목의 `listJoinRequests`가 늘 빈 목록이라 서버와 같은 규칙이다.
- 새 화면 테스트: `mobile/__tests__/party-mine-test.tsx`의 `the requests to join waiting on a card of 내 파티`(숫자 표시·0이면 없음, `quests-changed` 뒤 갱신과 사라짐).
- 문서: `main-server/README.md`(Quest 응답 필드, 거절 신호), `mobile/README.md`(내 파티 카드).

### 바꾼 기존 테스트

새 필드가 생겨 Quest 전체를 `toEqual`로 비교하던 서버 테스트 넷에 `waitingJoinRequests: 0` 한 줄씩만 더했다(다른 단언은 그대로). PR에서 이름을 대야 한다.

- `main-server/test/own-quests.e2e-spec.ts` (`Making a Quest of one’s own > gives a Quest without a Global Event, ...`)
- `main-server/test/quests.e2e-spec.ts` (`Attending a Global Event > gives a Quest with the Global Event, ...`)
- `main-server/test/class-quests.e2e-spec.ts` (`The Quest list on a day with a class > shows a Class Quest ...`)
- `main-server/test/meetup-answers.e2e-spec.ts` (`Accepting a Meetup > gives both a Closed Quest ...`)

앱 쪽은 단언을 바꾸지 않았고, `Quest` 타입이 필드를 요구해서 고정 데이터(`__tests__/support/server.ts`·`room.ts`·`meetups.ts`, `__tests__/features/next-quest-test.ts`)에 `waitingJoinRequests: 0`만 더했다.
