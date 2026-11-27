# 22: A removed member leaves the activation, and a 파티 that is gone ends its activation

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- Removing a Holder (`main-server/src/quests/leader.service.ts`, `remove`) does not touch the Party (the activation). The app takes the removed member out of the activation only when the remover is in it and opened it (`mobile/src/screens/room/people-sections.tsx`, `use-room-actions.ts`).
- Otherwise the removed member stays an activation member: on the map they show as "활성 파티 멤버 · 위치 공유 중", and their 활성 파티 opens a room that closes at once (404).
- A Quest that is deleted leaves its Party with `questId` null (`main-server/prisma/schema.prisma`, `Party.quest`, `onDelete: SetNull`); the members left are asked "활성화에서 나갈까요?" out of nowhere.

## What to build

- On the main server, in `remove`'s transaction: the removed Holder's Party membership is deleted when that Party's Quest is this one, and the Party's audience gets `party-changed`.
- When a Quest is deleted (파티 없애기, or its last Holder leaving), its Party is closed in the same transaction, members included, with `party-changed`.
- The app's own removal path is kept harmless or dropped, so the two do not race.

## Must not break

- Leaving and closing an activation; the Leader leaving; who sees whose position (`location-sharing/visibility.service.ts`).
- Tests: main server `leader`, `parties`, `location-sharing` (`.integration`); app `room-*` (`.integration`).

## Acceptance criteria

- [ ] A removed Holder is in no Party of that Quest afterwards, and is not seen by its members. (Main server integration test, which fails before the change.)
- [ ] A deleted Quest leaves no Party behind. (Main server integration test.)
- [ ] No native file changes; lint, format and types pass.

## Comments
