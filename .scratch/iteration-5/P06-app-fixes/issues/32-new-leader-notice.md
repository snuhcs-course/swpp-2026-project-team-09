# 32: The member who becomes Leader is told, in 알림

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 22 (the gone kinds sit beside it).

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- When the Leader leaves by the Assistant, the Holder who joined first becomes Leader (`main-server/src/quests/quests.service.ts`, `removeHolder`; `main-server/src/assistant/lookup/cancel-quest.ts`). Nobody is told; the new Leader finds a crown on a 파티 they did not make.

## What to build

- A kept Notification for the new Leader, in 알림 only, no push (decided 2026-11-27): "<파티 제목>의 파티장이 됐어요".

## Must not break

- Leaving as a member; the room's leader screen.
- Tests: main server `quests` (`.integration`).

## Acceptance criteria

- [ ] A hand-over keeps one non-ringing Notification for the new Leader. (Main server integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 10 minutes (#704), an estimate. One session built tickets 20, 22, 23 and 32 in turn, from 22:39 to about 23:50 in Korea, review fixes included; time spent waiting for reviewers is left out.
- Tokens, for that whole session and its eight review subagents together (they cannot be split by ticket): input 842, output 267,875; the input's cache reads 100,145,357 and cache writes 1,223,032 (main session: input 664, output 225,844, cache reads 95,302,985, cache writes 647,322; subagents: input 178, output 42,031, cache reads 4,842,372, cache writes 575,710).
