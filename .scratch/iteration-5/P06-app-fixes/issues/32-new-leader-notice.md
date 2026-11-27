# 32: The member who becomes Leader is told, in 알림

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
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
