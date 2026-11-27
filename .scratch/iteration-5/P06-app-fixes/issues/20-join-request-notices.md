# 20: A request to join is answered in 알림 and by a push, and a new one reaches the Leader by a push

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- Asking, accepting and declining a request to join (`main-server/src/quests/join-requests.service.ts`, `ask`, `accept`, `decline`) send only the `quests-changed` signal. Nothing is kept in 알림 and nothing is pushed.
- The one who asked learns of a decline only by pressing 신청 취소, which then says "파티장이 신청을 받지 않았어요" (`mobile/src/screens/party/use-party-actions.ts`), and of an accept only by the 파티 appearing in 내 파티.
- The Leader sees a new request as a row of 알림 that the app derives from the requests (`joinRequestNotices`, `mobile/src/features/notifications/adapter.ts`) and as a red count; no push.
- What is pushed today: a 파티 invitation (`main-server/src/push/messages.ts`) and the kept Notifications that ring (`rings: true` in `main-server/src/notifications/notification-words.ts`, sent by `notification-sender.ts`): 지금 나서요, a member's 일정 변경 / 도착 / 늦어요, a new match of an interest, and the 스터디룸 kinds. A new kind is added there: its name in `NotificationKind` and `KINDS`, its words, and one `schedule` where the event happens; no database change (the `kind` column is text).

## What to build

- Three Notification kinds, kept and pushed (they ring):
  - to the one who asked, on accept: "<파티 제목> 참여 신청이 수락됐어요". It opens the 파티.
  - to the one who asked, on decline: "<파티 제목> 참여 신청이 거절됐어요" (the exact words decided at review). It opens 보낸 신청, or 알림 when there is no better place.
  - to the Leader, on a new request: "<이름>님이 <파티 제목>에 참여를 신청했어요". One per 파티 while unread: a second request replaces it ("…외 N명"), so a busy 파티 does not ring again and again.
- The app knows the three kinds (`KEPT_KINDS` and their icons). The Leader's derived row and the kept one never show twice for the same request: the kept row is the push's copy, and the app shows one of them (decided while building).

## Must not break

- The derived rows of 알림 (invitations, friend requests, activation, join requests) and their counts.
- 보낸 신청's 신청 취소 and its refusals.
- Tests: main server `join-requests` and `notifications` (`.integration`), app `notifications` and `party-sent-requests` (`.integration`).

## Acceptance criteria

- [ ] Accepting and declining keep one Notification for the one who asked, which rings; asking keeps one for the Leader, replaced while unread. (Main server integration test, which fails before the change.)
- [ ] 알림 shows each with its words and opens the 파티 or 보낸 신청. (App integration test.)
- [ ] No native file changes; lint, format and types pass.

## Comments
