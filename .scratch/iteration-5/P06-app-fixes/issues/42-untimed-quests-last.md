# 42: A Quest whose time is not set is on the Quest list, last, under 시간 미정

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Added by the user on 2026-11-28: "'시간 미정'인 파티 … 메인 화면의 '퀘스트'에는 안 뜨잖아 … 퀘스트 창 맨 하단에 '시간 미정'으로 해서 퀘스트로 뜰 수 있게".

Positions are as of `origin/5.0/Main` b4b1379c, under `mobile/src/`.

- **The rule.** `toQuestRows` (`features/quests/adapter.ts`) keeps only the Quests that have a time (`timed`): a Sub Quest still to come has a start, or one had before every step ended. Its comment gives the reason: "A Party whose time is not set is no Quest yet, as `Main` has it, and is in neither the list nor its counts."
- **Where it shows.** The same rows feed three places, so a 파티 whose time is not set is missing from all three:
  - the Quest list over the map (`screens/main/quest-list.tsx`), up to three rows;
  - its pill's count (`quest-count`);
  - the Quest list on the whole screen (`screens/quests/quests-screen.tsx`), whose groups (`toQuestGroups`) are 오늘, 내일, 이번 주, 다음 주 and 그 이후. A row without a start belongs to none of them.
- **The map.** It already shows such a 파티 when it has a place: `questCards` (`features/map/adapter.ts`) asks for a place, not a time. The card leaves out the time line.
- **Events.** A Global Event is published only with a start (`admin/src/app/(signed-in)/events/fields.ts`, as the main server checks). So a 파티 made from an event always has a time, and a Quest without one is one the User made by hand.

## What to build

- A Quest whose time is not set is on the Quest list:
  - if a step of it is still to come;
  - if it has no step at all.
  - One whose every step ended or was cancelled stays off, as an ended Quest without a time is over.
- **Order:** after every Quest with a time, in the order they were made (`createdAt`, the first made first).
- **The whole screen:** a last group **시간 미정** after 그 이후. Its rows say **시간 미정** where a time stands (the right of the row, and the row's label).
- **Over the map:** the row is in the list and in the pill's count, last. Its line says "시간 미정 · <place>", or "시간 미정" without a place.
- A press on its row opens the 파티's room, as for any 파티.

## Must not break

- The order and groups of the Quests with a time, and a Quest whose first step has no time taking its time from a later step that has one.
- Ended Quests stay off the whole screen.
- Tests:
  - app `quest-rows` (`.unit`);
  - app `quests-screen` and `main-lists` (`.integration`).

## Acceptance criteria

- [x] A Quest whose time is not set is listed after those with a time, the first made first, and says 시간 미정. (App unit test, which fails before the change.)
- [x] The whole screen shows it last under 시간 미정, and the list over the map counts and shows it. (App integration test, which fails before the change.)
- [x] An untimed Quest whose every step ended stays off. (App unit test.)
- [x] No native file changes; lint, format and types pass.

## Comments
