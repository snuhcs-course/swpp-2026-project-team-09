# 26: A time away from today says its day

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- Times shown as a clock alone, read as today's:
  - an interest's Notification "재즈 공연이 떴어요 · 14:00 301동 대강당" (`main-server/src/notifications/notification-words.ts`, `clockOf`);
  - a changed step's words (ticket 25);
  - the room's 일정 (`mobile/src/features/quests/room-adapter.ts`, `mobile/src/screens/room/plan-section.tsx`);
  - the map card of the User's own 공개 파티: "14:00 301동에서 출발" (`mobile/src/features/map/adapter.ts`, `openPartyCard`).
- Others already say the day, such as the map's recruiting cards ("내일 14:00").

- Check this again against the code once ticket 19 (PR 688) has merged: 19 rewrites the room's files this ticket names.

## What to build

- One rule in the main server and one in the app: today "오늘 14:00", tomorrow "내일 14:00", any other day "11/28(금) 14:00". No year.
- The four places above take it. Places that already say the day keep their words.

## Must not break

- Korea time everywhere (`koreaClock`, `koreaDay`).
- Tests: the changed words' tests (`.unit` / `.integration`).

## Acceptance criteria

- [ ] Each of the four says the day for a time not today. (Tests, which fail before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
