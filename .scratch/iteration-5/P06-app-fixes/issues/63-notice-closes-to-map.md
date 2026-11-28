# 63: A row of 알림 that opens a card closes 알림 down to the map

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 37 (PR 755), stacked on its branch: it changes the same function, `openAddress`.

Native files: none. Releases: an app OTA update only.

## What happens now

Received by the user on 2026-11-28 as a review comment: pressing a row of 알림 changes screens unnaturally (`references/63-1-before-second-map.png`, a frame of the change). Positions are as of PR 755's branch, 0b13a538.

- The frame shows 알림 pushed left, cut at its back button, and a whole map screen sliding in over it from the right, half drawn, so that 알림 shows through it.
- A row with an address opens it with `openAddress` (`mobile/src/features/notifications/address.ts`). For a card on the map it calls `router.navigate({ pathname: '/main', … })`. From a screen above the tabs, expo-router's `navigate` pushes a second tab navigator over 알림 instead of going back to the tabs under it. The stack becomes tabs → 알림 → tabs: a new map is mounted (heavy, and half drawn while it slides in), 뒤로 on it brings 알림 back, and two maps stay mounted.
- A tapped push already avoids this (`mobile/src/push/use-notification-links.ts`, P04-04): it uses `router.dismissTo` while something is above the tabs, with a comment saying why. The row's press (P05-02) did not.
- After 37, a 파티's own news opens its room by a push, which is meant to stand over 알림. The other kinds still go through `navigate`: 지금 나서요 (`leave-by`), `invitation`, `party-gone`, `find-parties`, `event` and the 스터디룸 kinds.

## What to build

- A row that opens a card on the map closes 알림 back down to the map under it, which opens the card, as a tapped push does: `dismissTo` while something is above the tabs, `navigate` otherwise.
- A row that opens a room (37) is unchanged.

## Must not break

- Each kind's press: the card it opens, 찾기 for `find-parties`, the room for a 파티's news, the not-ready toast.
- A tapped push.
- Tests: app `notifications*` (`.integration`).

## Acceptance criteria

- [ ] Pressing 지금 나서요 opens its 파티's card on the map with nothing left above the tabs. (App integration test, written to fail before the change, where a second tab navigator stays above 알림; not run against the old code.)
- [ ] Checked on a phone after the app OTA update: 알림 slides away to the right and the map under it opens the card.
- [x] No native file changes; lint (type-aware) and format pass on the changed files. jest and tsc run in CI.

## Comments
