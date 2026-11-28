# 37: A 파티's own news opens its room, not its card on the map

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
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

- The main server gives these seven kinds a new card, `room:<questId>`. Each row of 알림 and each push of them opens the 파티's room.
- The app opens `room:<id>` as `/room/<id>`, from a row of 알림 and from a tapped push. A room whose 파티 is gone closes itself as now (`useCloseWhenGone`). It also says "이미 없는 파티예요", as `party-gone` does.
- The other kinds keep their addresses:
  - `party-gone`, `find-parties`, `invitation` and `event` as now;
  - 지금 나서요 (`leave-by`), its card on the map;
  - the 스터디룸 kinds, their card and the chat's room card.
- Notifications already kept keep their old address. Only new ones open the room.

## Must not break

- The other kinds' presses; a push of an invitation; the leave-by row's 파티 켜기 button.
- Tests: main server `notification-words` (`.unit`), app `notifications*` and `push-*` (`.integration`).

## Acceptance criteria

- [ ] The seven kinds are kept with `room:<questId>`. (Main server unit test, which fails before the change.)
- [ ] Pressing such a row or push opens the 파티's room, and a gone 파티's says so. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
