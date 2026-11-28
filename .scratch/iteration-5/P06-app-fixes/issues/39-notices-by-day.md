# 39: 알림 is grouped into 오늘, 어제 and 이전

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- 알림 lists the kept Notifications, the latest first, then the rows of what waits, in one card with no headings (`mobile/src/screens/me/notifications-screen.tsx`, `Notices`; `toNotices` in `features/notifications/adapter.ts`).
- `GET /notifications` gives every kept row, those whose time has not come included (`readAll` has no time filter), and the app shows such a row with its `ahead` title ("12:45 나설 시각"): a 지금 나서요 for tomorrow is in the list before it rings.

## What to build

- A Notification whose time has not come is not listed: `GET /notifications` leaves it out until its time, when it rings (decided by the user on 2026-11-28: "아직 시각이 오지 않은 알림 … 오지 않기 전에는 종 모양 알림 목록에 뜨면 안 되는 거 아님?"). The app's `ahead` title goes with it.
- The rows are grouped under 오늘, 어제 and 이전, by the Korea day of each Notification's time, the latest first in each.
- The rows of what waits (a running activation, friend requests, invitations, requests to join) have no time. They stand at the top of 오늘.
- A group with no rows is left out. With no rows at all, "새 알림이 없어요" shows as now.

## Must not break

- Each row's words and what a press opens; the empty state.
- Tests: main server `notifications` (`.integration`), app `notifications*` (`.integration`), `notifications-adapter` (`.unit`).

## Acceptance criteria

- [ ] A Notification whose time has not come is not in `GET /notifications`. (Main server integration test, which fails before the change.)
- [ ] Rows stand under 오늘, 어제 and 이전 by their Korea day; what waits is at the top of 오늘; an empty group is not shown. (App test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person or for CI is left out. Tokens include the subagents (a search of the tests that read rows kept for later, and the two code reviews).

| Work | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Build, code review, emulator screens, PR #753 | about 13 minutes | 25,867,202 | 25,513,048 | 353,868 | 286 | 78,138 |
