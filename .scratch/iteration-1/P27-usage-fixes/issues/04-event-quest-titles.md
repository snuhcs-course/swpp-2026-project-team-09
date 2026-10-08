# 04: Titles of Quests for a Global Event that the Leader may change

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)

## What to build

Choosing a Global Event in 파티 만들기 fills the title with the event's, and the User may change it before saving. The Leader may change it later in 파티 수정. A Quest's title is its own: it does not follow later changes to the Global Event's title, while the attending Sub Quest and the event's Badge and card still read the event.

The main server stops refusing a title change for a Quest with a Global Event, and creating a Quest for a Global Event accepts a title, taking the event's when none is given (as Matching's Quests do). The mock API follows the same rules.

## Acceptance criteria

- [x] `PATCH` of a Quest's title succeeds for a Quest with a Global Event; the refusal `QUEST_TITLE_FROM_GLOBAL_EVENT` is gone.
- [x] Creating a Quest for a Global Event with a title keeps that title; without one it takes the event's.
- [x] After an Administrator renames the Global Event, the Quest keeps its title, and its attending Sub Quest reads the new event title.
- [x] Matching's Quests are still titled with the event's title.
- [x] In 파티 만들기 and 파티 수정 the title field is never locked. Choosing an event replaces the title with the event's; choosing another replaces it again; `행사 빼기` leaves it.
- [x] The Quest's event Badge and card show the event's title.
- [x] Server end-to-end tests and screen tests cover the above; `quest-settings`, which asserted the refusal, changes with it and the PR names it.

## Comments

### 구현 전 정리 (2026-10-08)

- 현재 동작: 메인 서버 `LeaderService.update`가 Global Event가 있는 Quest의 제목 변경을 `QUEST_TITLE_FROM_GLOBAL_EVENT`(409)로 거절한다. `POST /quests`(`attendSchema`)는 `globalEventId`만 받고, `createForGlobalEvent`가 늘 행사 제목을 쓴다. 앱의 파티 만들기는 행사를 고르면 `withEvent`가 제목을 행사 제목으로 채우고 `titleLocked`로 제목 칸을 잠그며, `행사 빼기`는 제목을 비운다. 보내기(`useSend`)는 `attendGlobalEvent(eventId)` 뒤 `recruitingOf`로 제목을 뺀 PATCH를 보낸다. 파티 수정도 `quest.globalEvent`가 있으면 잠근다. 배지와 카드(`room-adapter`, `posts`, `mine`)는 이미 `globalEvent.title`을 읽는다.
- 바꿀 동작: 서버는 제목 변경을 거절하지 않고, `POST /quests`가 선택적 `title`을 받아 새로 만들 때 쓴다(없으면 행사 제목; Matching은 그대로 행사 제목). 앱은 제목 칸을 잠그지 않고, 행사를 고를 때마다 제목을 그 행사 제목으로 바꾸며, `행사 빼기`는 제목을 남긴다. 만들 때 사용자가 쓴 제목을 attend와 뒤따르는 PATCH에 보낸다. mock API도 attend의 `title`을 따른다.
- 고칠 곳: `main-server/src/quests/leader.service.ts`, `dto/quest-requests.dto.ts`, `quests.service.ts`, `quests.controller.ts`, `main-server/README.md`, `test/quest-settings.e2e-spec.ts`(거절 단언 변경)와 attend e2e; `mobile/src/features/party/making.ts`, `screens/party/form/party-form-screen.tsx`, `screens/party/form/use-send.ts`, `api/client.ts`, `api/server/party-client.ts`, `api/mock/party.ts`와 화면 테스트.
