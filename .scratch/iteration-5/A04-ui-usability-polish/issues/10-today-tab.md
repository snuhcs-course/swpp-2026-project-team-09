# 10: 알림 grows into 오늘: 답할 것, 오늘 일정 and 지난 알림 on one page

Parent: [A04 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: [09](09-bottom-bar-ai-in-the-middle.md), which makes 알림 a tab.

Native files: none. Releases: an app OTA update only.

## What happens now

From the proposal <https://claude.ai/artifact/UgGcW4Jx5G5doZhPnT89iK> (board "빈 자리: 오늘"). Positions are as of `origin/5.0/Main` 9ea45c14.

- What the User put in their day and what waits for their answer are spread out: today's Quests on the map's Quest list and on `/quests`, invitations under 파티 > 초대 (`screens/party/invites-tab.tsx`), and 알림 behind 내 정보's bell (a tab after ticket 09).
- 알림 (`screens/me/notifications-screen.tsx:149-168`) shows the Notifications the main server keeps, in 오늘 / 어제 / 이전 groups, then what waits for the User from the lists the main server serves (`waitingNotices` in `features/notifications/use-notices.ts`). The kept ones shown are then marked read.
- Today's Quests, classes included, come from `useQuestRows` (the map's `quest-list.tsx`). A press on a class brings the map to its place with a toast; another row opens the Quest's room (`usePress`, :120-140).

## What to build

The tab is named 오늘, with the date under the title ("12월 1일 화요일"). One page that scrolls once, in this order:

- **답할 것 N**: what waits for the User's answer (the waiting rows 알림 shows today: invitations, join requests, friend requests). An invitation row gets 거절 and 수락 as the board draws them, through the same calls 파티 > 초대 uses; other rows open what they open now. Hidden when nothing waits.
- **오늘 일정**: today's Quests, classes included, in time order, each with its time, its kind (강의, 파티, …), its title and its place.
  - A "지금 HH:MM" mark stands between the past and the coming rows.
  - Rows already over fold into one line, "지난 일정 N개 ▾", which opens them.
  - Under the rows, one line for tomorrow: "내일 N개 · 강의 1, 파티 1", with no rows.
  - A press does what a press on the map's Quest row does (a class to the map, another to its room).
  - The tutorial's Quests stay off it, as on the map.
  - "오늘 일정 없음" when there is none.
- **지난 알림**: the newest five kept Notifications, with "알림 모두 보기 ›" to the whole list in 오늘 / 어제 / 이전, as a page above the tabs. The read marks follow what is shown, as 알림 marks them now.
- Ticket 11 adds 예약 between 오늘 일정 and 지난 알림.
- Decided while building (2026-11-29): the tab is `/today`, and "알림 모두 보기 ›" opens 알림's whole list above the tabs at `/notifications`, with 뒤로. 답할 것 shows the invitations first and three rows at most, with "답할 것 N개 모두 보기 ›" to the same list. The main server marks every kept Notification read at once, so 오늘 marks them read only while every unread one is among the five it shows; otherwise "알림 모두 보기" does. The screen review approved the page. After #800's first review (2026-11-29): the main server leaves out a Quest whose every step ended and sends today's Class Quests only, so the classes already over today and tomorrow's classes come from the timetable; a 파티 already over is not listed.
- No inner tabs: the sections are capped so that the page stays about one screen and a half on a usual day (decided 2026-11-28).
- The tour's words for this slot and the README follow the new name.

## Must not break

- Every row's press, as on 알림 and on the Quest list now.
- 파티 > 초대 keeps its list; 오늘 shows the same invitations, and answering one in either place updates both.
- The read marks of kept Notifications.
- Tests: `notifications*`, `notification-links`, `quests-screen`, `main-lists`, `party-invites`, `tab-tour` (`.integration`), and the `notifications-*` unit tests.

## Acceptance criteria

- [ ] 오늘 shows 답할 것, 오늘 일정 and 지난 알림 in that order, and hides 답할 것 when nothing waits. (Integration test, which fails before the change.)
- [ ] 수락 on an invitation in 답할 것 joins the 파티, and the row leaves. (Integration test.)
- [ ] Rows over today fold into "지난 일정 N개"; tomorrow is one line. (Integration test with a fixed clock.)
- [ ] 지난 알림 shows five rows and "알림 모두 보기 ›" opens the whole list. (Integration test.)
- [ ] The page on a phone with the mock build, on a full and an empty day; the screens go to the user before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-29)

- Agent time: about 40 minutes in one session, the fixes for #800's first review included (`iter5-a04-09~12`), an estimate. It leaves out the waits for the shared heavy-job lock and for the user's answers.
- Tokens (Opus 5.5, the two review subagents and the fixes for #800's first review included): input 290 and output 99,061; of the input, cache reads 58,636,118 and cache writes 768,432.
