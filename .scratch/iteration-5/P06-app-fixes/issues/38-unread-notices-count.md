# 38: The main server keeps which Notifications are read, and the bell counts the unread

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Database: one migration (nullable `Notification.readAt`). Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- The bell on 내 정보 counts `waitingNotices` (`mobile/src/screens/me/me-screen.tsx`, `Bell`). Those are only the rows 알림 derives from what waits for the User: a running activation, friend requests, invitations and requests to join (`mobile/src/features/notifications/adapter.ts`, `waitingNotices` keeps rows with no time).
- Every Notification the main server keeps is left out of the count. That is every kind of tickets 20 to 32 and the older ones (`leave-by`, `step-changed`, `interest-new` and the rest). The main server keeps no read state (`main-server/prisma/schema.prisma`, `Notification`), so a new one shows in the list and the bell stays at 0.

## What to build

- `Notification` gains `readAt`, nullable; a row is unread while it is null. The migration sets `readAt` on the rows that exist and whose time has come (`at <= now()`), so that the bell counts only what comes after the Release (decided by the user on 2026-11-28). A row kept before the Release for a time after it, such as the next morning's 지금 나서요, stays unread and counts when it rings (PR #747's review).
- A write that rings a row again makes it unread again: `keep`, and `replace` when the time moves, set `readAt` back to null with `sentAt`. `renew`, which keeps whether it was sent, keeps `readAt` too.
- `GET /notifications` gives each row's `read`.
- A new `POST /notifications/read` marks every kept Notification of the User whose time has come as read.
- Opening 알림 calls `POST /notifications/read` once its rows are shown.
- The bell counts what waits (as now) plus the unread kept Notifications whose time has come.
  - A Notification kept ahead of its time, such as 지금 나서요, is neither listed nor counted before its time (ticket 39).
  - The kinds 알림 hides because a derived row stands for them, `join-asked` and `party-activated`, are not counted twice.
- The `notice` signal that brings a new Notification refreshes the count, as it refreshes the list.

## Must not break

- The list's rows and order; the push of a kept Notification; the derived rows' count.
- Tests: main server `notifications` (`.integration`), app `notifications*` and `me-*` (`.integration`).

## Acceptance criteria

- [ ] A kept Notification is unread until `POST /notifications/read`, which marks those whose time has come; `keep` and a `replace` that moves the time make it unread again; existing rows whose time has come start read, and one still ahead starts unread. (Main server integration test, which fails before the change.)
- [ ] The bell counts the unread kept Notifications with what waits, and goes back to what waits once 알림 is opened. (App integration test, which fails before the change.)
- [ ] The migration runs on the Dev Server; no native file changes; lint, format and types pass.

## Comments
