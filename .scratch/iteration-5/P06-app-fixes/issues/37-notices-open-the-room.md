# 37: A 파티's own news opens its room, not its card on the map

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` ec8337d6. Received from the user on 2026-11-28, after a read of every kind of 알림 and what a press on it opens.

- A row of 알림, and the push it copies, open the address the main server gives (`main-server/src/notifications/notification-words.ts`). For these kinds it is the 파티's card, `party:<questId>`:
  - `became-leader`: the User became the Leader, handed the role or after the Leader left;
  - `join-accepted`: the User's request to join was accepted;
  - `step-changed`: a member changed a step;
  - `arrived` and `late`: a member arrived, or is late;
  - `accepted` and `declined`: a Friend accepted or declined the User's Plan invitation.
- The app opens such an address on the map (`mobile/src/screens/main/use-asked-card.ts`, `useAskedCard`). The map goes to the 파티's card when it has one, a 파티 whose shown step has a position and has not ended. Without one, it opens the chat's room card or answer if there is one, else nothing: the map opens and nothing happens.
- What the User wants from such news is the 파티's room (`/room/<questId>`: its 일정, its members and its activation).

## What to build

- The stored card stays `party:<questId>`: a kept Notification's key holds its card (`@@unique` on `Notification`, `keyOf` in `notification-store.ts`), and a new card would no longer replace a row kept before. Where the main server reads and sends a Notification, it gives these seven kinds the room's address, `room:<questId>`, in place of the stored card: in `listFor` (the row's `url`) and in the sender's `ring` (the push's). Each row of 알림 and each push of them then opens the 파티's room, those kept before this change included (decided 2026-11-28, review of PR 747).
- The app opens `room:<id>` as `/room/<id>`, from a row of 알림 and from a tapped push. Either opens the room in one move from where the User is: a tapped push pushes `/room/<id>` itself (`use-notification-links.ts`) and does not go through `/main?card=`, which would show the map first and slide the room in after it (added 2026-11-29 from fyoon46's review of #755, by the one-transition rule set for #785). A room whose 파티 is gone closes itself as now (`useCloseWhenGone`). It also says "이미 없는 파티예요", as `party-gone` does.
- The other kinds keep their addresses:
  - `party-gone`, `find-parties`, `invitation` and `event` as now;
  - 지금 나서요 (`leave-by`), its card on the map;
  - the 스터디룸 kinds, their card and the chat's room card.
- Releases: the app OTA update goes out first, or with the main server Release. An app without it reads `room:<id>` as nothing it knows and opens only `/main` (`fallbackFor`).

## Must not break

- The other kinds' presses; a push of an invitation; the leave-by row's 파티 켜기 button.
- Tests: main server `notification-words` (`.unit`), app `notifications*` and `push-*` (`.integration`).

## Acceptance criteria

- [ ] The seven kinds are kept under `party:<questId>` as now, and listed and pushed with `room:<questId>`; a second one of the same key replaces the first. (Main server test, which fails before the change.)
- [ ] Pressing such a row or push opens the 파티's room, and a gone 파티's says so. (App integration test, which fails before the change.)
- [ ] A tapped push of such a kind asks the router for the room alone, with no move to `/main` first, and 뒤로 comes back to the screen it was tapped over. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person or for CI is left out. Tokens include the code-review subagent.

| Work | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Build, code review and its fixes, emulator screens, PR #755 | about 10 minutes | 22,456,059 | 22,309,492 | 146,427 | 140 | 42,375 |
