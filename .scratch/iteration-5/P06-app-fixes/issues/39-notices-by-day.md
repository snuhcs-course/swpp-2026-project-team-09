# 39: 알림 is grouped into 오늘, 어제 and 이전

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- 알림 lists the kept Notifications, the latest first, then the rows of what waits, in one card with no headings (`mobile/src/screens/me/notifications-screen.tsx`, `Notices`; `toNotices` in `features/notifications/adapter.ts`).

## What to build

- The rows are grouped under 오늘, 어제 and 이전, by the Korea day of each Notification's time, the latest first in each.
- The rows of what waits (a running activation, friend requests, invitations, requests to join) have no time. They stand at the top of 오늘.
- A group with no rows is left out. With no rows at all, "새 알림이 없어요" shows as now.

## Must not break

- Each row's words and what a press opens; the empty state.
- Tests: app `notifications*` (`.integration`), `notifications-adapter` (`.unit`).

## Acceptance criteria

- [ ] Rows stand under 오늘, 어제 and 이전 by their Korea day; what waits is at the top of 오늘; an empty group is not shown. (App test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
