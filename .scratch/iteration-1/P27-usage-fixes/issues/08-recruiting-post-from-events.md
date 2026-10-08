# 08: Open the recruiting post from the 행사 tab's 파티 찾기/모집

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)

## What to build

In the 행사 tab's 파티 찾기/모집, pressing another User's Quest opens its recruiting post instead of asking "참여할까요?". The User reads the post and joins or asks to join with the post's own `참여하기` or `참여 신청`, as the post already allows. Pressing the User's own Quest still opens its room. The 파티 tab's boards and every other place that asks "참여할까요?" are unchanged.

## Acceptance criteria

- [x] Pressing another's Quest in 파티 찾기/모집 closes the sheet and opens that Quest's recruiting post.
- [x] The post's `참여하기` (Open) and `참여 신청` (Approval) work from there as they do from the boards.
- [x] Pressing the User's own Quest there opens its room, as today.
- [x] Screen tests cover the above; `events-recruiting-test`, which asserted the question, changes with it and the PR names it; `party-find-test` and `room-joining-test` pass unchanged.

## Comments

### 구현 전 정리 (2026-10-08)

- 현재 동작: 행사 탭 `파티 찾기/모집` 시트(`RecruitingSheet`)에서 행을 누르면 `events-screen.tsx`의 `useSheets().onRow`가 시트를 닫고, 내가 든 Quest(`row.held`)면 `/room/:id`로 가고, 남의 Quest면 `ConfirmSheet`로 "‘제목’에 참여할까요?"를 묻고 `useEventActions().join`으로 바로 참여(Open → 방으로 이동)하거나 신청(Approval)한다.
- 바꿀 동작: 남의 Quest를 누르면 시트를 닫고 그 Quest의 모집글(`/post/:id`, `PostScreen`)을 연다. 모집글의 `참여하기`/`참여 신청`은 게시판에서 열었을 때와 똑같이 동작한다(`usePartyActions().join`). 내가 든 Quest는 지금처럼 방을 연다. 파티 탭 게시판과 다른 "참여할까요?" 질문은 그대로.
- 고칠 곳: `mobile/src/screens/events/events-screen.tsx`의 `onRow`를 `openPost(row.questId)`(`screens/party/post-card.tsx`)로 바꾸고, 더는 쓰지 않는 참여 질문(`ConfirmSheet`, `ask`)과 `use-event-actions.ts`의 `join`을 걷어낸다. 테스트는 `mobile/__tests__/events-recruiting-test.tsx`의 "joining from the sheet"를 모집글 경유로 바꾼다.

### 바꾼 기존 테스트

- `mobile/__tests__/events-recruiting-test.tsx`, "joining from the sheet": 행을 누르면 "참여할까요?"를 묻던 것을 단언하던 테스트 세 개("joins an Open Quest after the question, and opens its room", "asks the Leader of an Approval Quest", 거절 사유 `it.each`)를 모집글 경유로 바꿨다. 이제 남의 Quest를 누르면 `/post/:id`가 열리고 질문이 없음을 확인하는 테스트를 더했고, 참여·신청·거절은 모집글의 `참여하기`/`참여 신청`으로 한다. Open 참여 후 방으로 가던 단언은 빠졌다(모집글의 참여는 게시판과 같이 내 파티를 연다). 거절 `it.each`는 줄 수 제한 때문에 "a refusal on the post" describe로 옮겼다. 스펙이 이 테스트의 변경을 허용한다.
