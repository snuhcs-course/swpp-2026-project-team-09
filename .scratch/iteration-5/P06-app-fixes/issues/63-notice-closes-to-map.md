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

- Pressing a row is one transition from 알림 to its target. The screen under 알림 (내 정보 when 알림 was opened from it) never shows, even for a frame (fyoon46's review of PR 785, after a phone check of a dismiss-then-navigate version: "알림을 클릭할 때 순간적으로 내 정보 화면이 떴다가 지도로 넘어가네 … 한번의 전환일 수 있도록 해줘").
- A card on the map: one `dismissTo('/main')`, the map in front, and the map opens the card. The card is handed to the main screen by a small store (`mobile/src/push/asked-card.ts`, `openCard`), not as `/main`'s `card` parameter: `dismissTo` with a parameter leaves it on the tab navigator's route, and it follows into the next tab's address (`/party?card=find-parties%3A…&tab=find`). An address opened from outside still uses the parameter.
- A declined request to join (`find-parties`) is no card on the map: one `dismissTo` to 찾기, not by the map.
- A 파티's own news (37): one push of its room over 알림, unchanged.
- A tapped push opens its card by the same `openCard`.

## Must not break

- Each kind's press: the card it opens, 찾기 for `find-parties`, the room for a 파티's news, the not-ready toast.
- An address opened from outside with `/main?card=` (the main screen's own tests).
- A tapped push.
- Tests: app `notifications*` (`.integration`).

## Acceptance criteria

- [x] Pressing 지금 나서요 opens its 파티's card on the map by one move of the router, `dismissTo('/main')`, with nothing left above the tabs and the address `/main`. (App integration test; a dismiss-then-navigate version makes two moves.)
- [x] Pressing a declined request opens 찾기 by one move, the address `/party?tab=find`; a 파티's news opens its room by one push. (App integration tests.)
- [ ] Checked once by the user on the phone with the preview build, before the merge queue: 알림 slides away to the map, or 찾기, with no frame of 내 정보.
- [x] No native file changes; lint (type-aware), format and tsc pass. The 11 notification and push integration suites pass locally (76 tests), since PR CI runs no app integration tests.

## Comments
