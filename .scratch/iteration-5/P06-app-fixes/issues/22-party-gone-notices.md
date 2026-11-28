# 22: A 파티 that ends and a member who is removed are told apart, by a push and in 알림

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- The Leader's 파티 없애기 and 내보내기 (`main-server/src/quests/leader.service.ts`, `end` and `remove`) send only `quests-changed`.
- The app tells it only while it runs, with one toast for both: "<제목> 파티에서 빠졌어요" (`mobile/src/features/quests/gone-watch.tsx`, `tellIfGone`; its comment: "Removal and ending are not told apart, and what happened before the app started is not told").
- One who asked to join or was invited sees the request or invitation leave the list, with no word.

## What to build

- Kept Notifications:
  - 파티 없애기: every other Holder, ringing: "<파티 제목> 파티가 없어졌어요".
  - 내보내기: the removed Holder, ringing: "<파티 제목> 파티에서 내보내졌어요".
  - 파티 없애기, to one whose request or invitation was waiting: in 알림 only, no push: "<파티 제목> 파티가 없어져 신청이 취소됐어요" / "…초대가 취소됐어요" (decided 2026-11-27).
- The toast while the app runs uses the same two words, not one for both.
- Pressing such a row or push, whose 파티 is gone, says "이미 없는 파티예요" instead of opening nothing.

## Must not break

- Leaving by one's own choice: no toast and no Notification (`leftOnPurpose`).
- A 파티 that ends because its time passed is not told as 없어짐.
- Tests: main server `leader` (`.integration`), app `gone-quests*` (`.integration`).

## Acceptance criteria

- [ ] 없애기 and 내보내기 keep the Notifications above, the waiting ones' without a push. (Main server integration test, which fails before the change.)
- [ ] The toast says which happened, and a row of a gone 파티 says so when pressed. (App integration test.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 20 minutes (#701), an estimate. One session built tickets 20, 22, 23 and 32 in turn, from 22:39 to about 23:50 in Korea, review fixes included; time spent waiting for reviewers is left out.
- Tokens, for that whole session and its eight review subagents together (they cannot be split by ticket): input 842, output 267,875; the input's cache reads 100,145,357 and cache writes 1,223,032 (main session: input 664, output 225,844, cache reads 95,302,985, cache writes 647,322; subagents: input 178, output 42,031, cache reads 4,842,372, cache writes 575,710).
