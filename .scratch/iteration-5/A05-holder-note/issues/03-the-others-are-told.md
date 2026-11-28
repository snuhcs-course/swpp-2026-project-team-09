# 03: The 파티's other members are told of a 한마디, by a push and in 알림

Parent: [A05 spec](../spec.md)
Status: needs-triage
Owner: TaeHyun79
Blocked by: 01.

Native files: none. Database: none, a Notification's kind is a string column. Releases: a main server Release and an app OTA update, the same as 01's and 02's.

One pull request with 01 and 02, a commit for each ticket. It waits for none of the open pull requests on 알림 (spec, "Other work it meets").

## What happens now

Positions are as of `origin/5.0/Main` 99dd46786.

- The kinds are a closed list (`Told`, `main-server/src/notifications/notification.ts:35`; `KINDS`, `notifications.service.ts:23`). `memberWords` (`notification-words.ts:122`) words what a 파티's members cause: a step changed, an arrival, a lateness. Each rings and is about the member.
- A Notification is kept once per User, kind, card and person it is about. `schedule` overwrites the one kept and makes it ring and unread again; `cancel` forgets it. Both send `notice`, which refreshes 알림.
- It stays on the 파티's card, and those of `ROOM_KINDS` (`card-address.ts:29`) open the 파티's room, in 알림 and from the push.
- A member who leaves or is removed leaves the notices about them where they are. Notices go after 30 days, or by the User's swipe or 모두 지우기.
- 알림 draws a row by kind: its icon (`KEPT_ICONS`, `mobile/src/features/notifications/adapter.ts:91`, whose type holds no chat icon, `:54`) and its tone (`TONE`, `mobile/src/screens/me/notifications-screen.tsx:49`). Its line is one line, cut at the end (`mobile/src/design-system/list-row.tsx:81`). A kind the app does not know is drawn as a plain notice.
- `GET /notifications` answers the words, which the request's line keeps: it is not among the routes without bodies (`main-server/src/common/bodiless-routes.ts:12`).

## What to build

- **The kind `holder-note`**, kept for each other Holder when a 한마디 is written or changed, on the 파티's card and about its writer. A later one of the same person in the same 파티 replaces it, rings again and is unread again.
  - Title: `이서연님의 한마디`. Line, and the push's body: the words alone, such as `5분 늦어요. 파란 에코백 들고 갈게요`, with no full stop added and without the 파티's title.
  - It rings and opens the 파티's room.
  - Its time is the server's when the words were written.
- **Clearing** cancels it for the other Holders and rings nothing. Saving the same words does neither.
- **Order.** The notices are kept or cancelled before 01's route answers, so that a save and a clear from one phone keep their order. A failure is logged as a warning, without the words, and never fails the save.
- **Leaving.** Nothing is added where a Holder leaves or is removed or the 파티 ends: a notice already delivered stays, as a late report's does.
- **알림.** The row has the chat icon on the navy tone.
- **The log.** `/notifications` joins the routes without bodies, with its row in the README's table.
- **The READMEs**: the main server's Notifications and Logging, the app's 알림.

## Must not break

- The other kinds' words, icons, tones and addresses, the order of 알림, and what the bell counts.
- An app before this ticket, which draws the row as a plain notice, and a main server before it, which leaves the kind out of the list.
- The request lines of the routes that keep their bodies.
- Tests: main server `notifications`, `party-member-notices`, `notification-room-address`, `request-line-bodies` (`.integration`), `bodiless-routes`, `notification-address`, `notification-words` (`.unit`); app `notifications*` (`.integration`), `notifications-*` (`.unit`).

## Acceptance criteria

- [ ] A 한마디 written or changed is in each other Holder's list with its title, its line and the room's address, and not in the writer's. A second one replaces it and is unread again. (Main server integration test, which fails before the change.)
- [ ] The same words again tell nobody; clearing takes it out of the lists. (Same.)
- [ ] It is still there after its writer left. (Same.)
- [ ] It rings with the words alone as its body. (Same.)
- [ ] The row in 알림 has the title, the words and the chat icon, and a press opens the 파티's room. (App integration test, which fails before the change.)
- [ ] No request line of `/notifications` holds the words. (The test of the routes without bodies, and the one that looks for a sent value in the lines.)
- [ ] The row looks as ⑥ of the mock-up, and the pull request carries its picture. No native file changes; lint, format and types pass.

## Comments
