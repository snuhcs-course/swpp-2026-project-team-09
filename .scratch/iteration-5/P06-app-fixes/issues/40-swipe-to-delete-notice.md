# 40: A kept Notification is deleted by a swipe to the left

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 38 (the main server's Notification routes) and 39 (알림's rows).

Native files: none (`react-native-gesture-handler` is already in the app). Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- A row of 알림 cannot be removed. Kept Notifications stay for 30 days (`main-server/src/notifications/notification-sender.ts`, `KEPT_DAYS`), and the User has no way to clear one.

## What to build

- A swipe from right to left on a kept Notification's row slides it and shows, in the space on its right, a red ground (`color.danger`) with the trash icon (`trash`) in white outline. A press on it, or a full swipe, deletes the row.
- A new `DELETE /notifications/:id` deletes one of the User's own Notifications. `:id` is the list's `id` (`identityOf(kind, card, about)`, such as `step-changed:party:<questId>:<userId>`), URL-encoded, so it goes through the store's existing `forget`. One that is not the User's, or is gone, deletes nothing.
- Only listed rows swipe, and a row is listed only once its time has come (ticket 39), so no push still to come is deleted.
- The rows of what waits (activation, friend requests, invitations, requests to join) do not swipe. They leave when they are answered.
- A deleted unread row no longer counts on the bell (ticket 38).

## Must not break

- A press on a row; scrolling the list; the bell's count.
- Tests: main server `notifications` (`.integration`), app `notifications*` (`.integration`).

## Acceptance criteria

- [ ] `DELETE /notifications/:id` deletes the User's own row only. (Main server integration test, which fails before the change.)
- [ ] A swipe shows the red trash action, and pressing it removes the row. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
