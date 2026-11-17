# 07: A tour of the tabs, empty states, and toasts that link to the result

Parent: [spec](../spec.md) ("Tour, empty states and toast links")
Status: ready-for-agent
Blocked by: 04 (the sent-requests section, which a toast links to and which gets an empty state). Planned after the acceptance tests (11-18).
Done when the pull request into `4.0/Main` is open; merging is the team's call.
Native files: no
PR assignee: Jaehyun0320

## What to build

After Onboarding, a four-step tour points at the bottom tabs (지도, 파티, 행사, 내 정보) one at a time, with "건너뛰기" and "다시 보지 않기". 내 정보 can replay it. It points only at the four tabs, never at the map, the input bar or cards, which package B is rebuilding. The tab bar itself is B's file (work split §4): B is told before the work starts, and the tour reaches the tabs from outside the tab bar where it can. Whether it was seen is kept on the phone. Once package D's First run exists, the tour runs after it.

The 파티 tab, the 행사 tab and the sent-requests section, when empty, say what they are for and offer one first action.

A toast can carry a link (a label and what it does). Three actions use it: asking to join ("보낸 신청 보기"), joining or making a 파티 ("내 파티 보기"), and sending a Friend Request ("친구 목록 보기").

## Acceptance criteria

- [x] The tour shows once after Onboarding, can be skipped or turned off for good, and replays from 내 정보.
- [x] The tour highlights only the four tabs.
- [x] The three empty states show their sentence and one action.
- [x] The toast takes an optional action; the three calls above use it and the link opens the right screen. (Two calls: 내 파티 보기 was left out, since joining or making a 파티 already moves to 내 파티.)
- [x] Tests (ADR 0007): the toast's action as a design-system unit test (prior art: `design-system/toast`); app integration for the tour's show, skip and replay, the empty states, and one link.
- [x] B was told before the change; the pull request says so.
- [x] The H7, H8 and H11 rows of `he-revision-log.md` get this pull request.

## Comments

### Agent usage (2026-11-18)

- Agent time: about 2 hours (estimate), over two sessions in the `swpp-p06-07` worktree on 2026-11-16 and 2026-11-18. That counts the implementation, a merge of `4.0/Main` that brought in P02-35's toast action, and the review fixes. Waiting for answers is not counted.
- Tokens: the two review subagents used 61,559 and 70,766 tokens (132,325 in all; the split into input, output and cache was not reported to the session). The main session's input, output, cache-read and cache-write counts are not visible from inside the session and are not recorded here.

PR: #348.
