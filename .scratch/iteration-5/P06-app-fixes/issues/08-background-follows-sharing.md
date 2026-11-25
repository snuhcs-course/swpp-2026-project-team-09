# 08: 백그라운드에서도 공유 shows off while 위치 공유 is off, and comes back with it

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-25, with a screen of the 위치 공유 card on 내 정보 (both switches drawn, 위치 공유 on and 백그라운드에서도 공유 off): "백그라운드에서도 공유 이 토글도 사실 override가 되는거잖아? 근데 지금 UI로 둘다 토글이 켜져있을때 위치 공유만 끄면 백그라운드에서도 공유는 켜진 상태로 남거든? 이걸 수정하고 싶어 같이 꺼지게, 대신 같이 꺼졌으면, 나중에 위치 공유를 킬 때는 같이 켜져야돼."

Positions are as of `origin/5.0/Main` b2e5323b.

- The 위치 공유 card on 내 정보 (`mobile/src/screens/me/sharing-card.tsx:89-90`) draws the Master Switch 위치 공유 and under it `BackgroundRow masterOn={sharing.on}`. The row exists on Android only, where background location is available (`src/position/background.ts:24-27`).
- The row is `SwitchRow` with `value={on}` and `disabled={!masterOn}` (`src/screens/me/background-row.tsx:42-63`). `on` is the User's choice and the permission: `known.chosen && known.permission === 'granted'` (`src/position/background-sharing.tsx:127`). So with 위치 공유 turned off, the row is disabled but its switch still stands at on.
- The sending already follows the Master Switch: background sending runs only while the Master Switch is on, the User chose it and the permission is granted (`background-sharing.tsx:115`). Turning 위치 공유 off stops it; turning it on again starts it again, since the choice (`backgroundChosen`, kept on the phone, `:131`) stays. Only the screen is wrong.
- The 위치 공유 screen (위치 공유 보기) already shows its per-Friend cells off and disabled while the Master Switch is off (`screens/me/location-sharing-screen.tsx:47-50`, `seenNow`, and the comment at :82-83). The background row is the one control under the Master Switch that does not.
- The Master Switch changes on the screen at once (`features/sharing/use-master-switch.ts:47-50`, `setQueryData`). The first time it is turned off it asks first, and "건물까지만" leaves it on (`screens/me/use-sharing-switch.ts:33-62`, :77-84).

## What to build

- While 위치 공유 is off, 백그라운드에서도 공유 shows off and disabled, as the 위치 공유 screen's cells do.
- Turning 위치 공유 on again shows 백그라운드에서도 공유 as it was before: on if the User had chosen it (and the permission is still granted), off if not. The User does not turn it on again.
- The row's value on the screen is the Master Switch and the choice together; the kept choice is not changed by the Master Switch. That kept choice is what brings the row back, across a full restart of the app too, since it is kept on the phone.
- The rule for when background sending runs does not change.
- No words change. A screen reader reads the row as off and disabled while 위치 공유 is off.

## Must not break

- Turning 백그라운드에서도 공유 on while 위치 공유 is on: the explanation, the permission prompt or the phone's settings, and the toast when it is refused (`background-row.tsx`).
- The question before the first turn-off of 위치 공유, and "건물까지만" leaving it on: the row then stays as it was.
- The background task's own reading of the Master Switch and its stop on `MASTER_SWITCH_OFF` (`background-sharing.integration.test.ts`).
- The catalogue's stand-alone 백그라운드에서도 공유 row (`catalogue/screens.tsx:191-196`) is not the card's row; it stays.
- Tests: `me.integration.test.tsx` (:192-200, the row is enabled under 위치 공유 on), `background-sharing.integration.test.ts`, and the tests `git grep` finds for `BackgroundRow`, `백그라운드에서도 공유` and `backgroundChosen`.

## Acceptance criteria

- [ ] With 백그라운드에서도 공유 chosen and the permission granted, turning 위치 공유 off shows the row off and disabled. (Integration test, which fails before the change.)
- [ ] Turning 위치 공유 on again shows the row on, without the User touching it; a row that was off before stays off. (Integration test.)
- [ ] The choice kept on the phone is unchanged by turning 위치 공유 off. (Integration test.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
