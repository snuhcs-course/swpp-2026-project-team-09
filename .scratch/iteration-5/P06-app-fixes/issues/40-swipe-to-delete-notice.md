# 40: A kept Notification is deleted by a swipe to the left, and every one by 모두 지우기

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 38 (the main server's Notification routes) and 39 (알림's rows).

Native files: none (`react-native-gesture-handler` is already in the app). Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- A row of 알림 cannot be removed. Kept Notifications stay for 30 days (`main-server/src/notifications/notification-sender.ts`, `KEPT_DAYS`), and the User has no way to clear one.
- Added on 2026-11-28 from fyoon46's review of #754, after a look at the swipe on the phone ("빨간게 너무 딱 달라붙고. 전체 삭제 같은 것도 있어야 하지 않을까?"): the red action sat flush against the row's time and the card's edge, and with up to 30 days kept, deleting one by one takes many swipes.

## What to build

- A swipe from right to left on a kept Notification's row slides it and shows, in the space on its right, a red button (`color.danger`) with the trash icon (`trash`) in white outline. A press on it, or a full swipe, deletes the row, with no confirm and no undo.
- The red button stands inset in that space: a gap of `space[2]` from the row and from the card's right edge, `space[1]` shorter than the row at top and bottom, with rounded corners (`radius.md`).
- 알림's app bar has a 모두 지우기 text button on its right while it shows at least one kept Notification. A press asks once, "알림 N개를 지울까요?" with 지우기 / 취소, since nothing brings them back. 지우기 deletes every kept Notification whose time has come; what waits stays, as for the swipe.
- A new `DELETE /notifications` deletes the User's own Notifications whose time has come. Those ahead of their time stay, and so do `join-asked` and `party-activated`, the pushes' copies of what waits, which 알림 does not show as rows.
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
- [ ] The red action is inset, with `space[2]` around it and `radius.md` corners. (App integration test, which fails before the change.)
- [ ] `DELETE /notifications` deletes the User's own rows whose time has come, and keeps those ahead, the copies of what waits and another User's. (Main server integration test, which fails before the change.)
- [ ] 모두 지우기 asks "알림 N개를 지울까요?"; 취소 deletes nothing, and 지우기 deletes the kept rows and leaves what waits. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person or for CI is left out. Tokens include the code-review subagent.

| Work | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Build, code review and its fixes, emulator check of the swipe, PR #754 | about 14 minutes | 21,461,196 | 21,320,272 | 140,782 | 142 | 48,807 |
