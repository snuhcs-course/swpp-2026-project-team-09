# 07: A tour of the tabs, empty states, and toasts that link to the result

Parent: [spec](../spec.md) ("Tour, empty states and toast links")
Status: ready-for-agent
Blocked by: 04 (the sent-requests section, which a toast links to and which gets an empty state). Planned after the acceptance tests (11-18).
Done when the pull request into `4.0/Main` is open; merging is the team's call.
Native files: no
PR assignee: Jaehyun0320

## What to build

After Onboarding, a four-step tour points at the bottom tabs (지도, 파티, 행사, 내 정보) one at a time, with "건너뛰기" and "다시 보지 않기". 내 정보 can replay it. It points only at the tab bar, which no package of the map work changes, never at the map, the input bar or cards. Whether it was seen is kept on the phone. Once package D's First run exists, the tour runs after it.

The 파티 tab, the 행사 tab and the sent-requests section, when empty, say what they are for and offer one first action.

A toast can carry a link (a label and what it does). Three actions use it: asking to join ("보낸 신청 보기"), joining or making a 파티 ("내 파티 보기"), and sending a Friend Request ("친구 목록 보기").

## Acceptance criteria

- [ ] The tour shows once after Onboarding, can be skipped or turned off for good, and replays from 내 정보.
- [ ] The tour highlights only the four tabs.
- [ ] The three empty states show their sentence and one action.
- [ ] The toast takes an optional action; the three calls above use it and the link opens the right screen.
- [ ] Tests (ADR 0007): the toast's action as a design-system unit test (prior art: `design-system/toast`); app integration for the tour's show, skip and replay, the empty states, and one link.
- [ ] The H7, H8 and H11 rows of `he-revision-log.md` get this pull request.

## Comments
