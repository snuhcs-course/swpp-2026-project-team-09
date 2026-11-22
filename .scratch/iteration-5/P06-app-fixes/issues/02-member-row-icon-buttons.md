# 02: The 파티 member row: three icon buttons, each asking first

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "현재 저 세 버튼이 위아래로 쭉 나열되는게 밤티임. 각각을 아이콘으로 바꿔서 가로로 나열하고, 각 버튼을 눌렀을 때 확인 메세지 하나씩 띄우도록 개선." (`references/02-1-party-screen-now.webp`)

- On another member's row, the Leader sees three text buttons stacked one under another (`mobile/src/screens/room/people-sections.tsx:142-153`, `styles.controls` at :224): 친구 추가, 파티장 넘기기, 내보내기. Anyone else sees only 친구 추가.
- 친구 추가 sends the request at once (`member-friend-button.tsx:55-58`, :100-103). 내보내기 removes the member at once (`people-sections.tsx:149` to `use-room-actions.ts:239-246`, which also takes them out of the 활성 파티 when `fromParty`). 파티장 넘기기 already asks first: a `Dialog` "{name}님에게 파티장을 넘길까요?" with 취소 and 넘기기 (`people-sections.tsx:190-204`).
- The friend button has two more states: 요청됨, a disabled text button once the User sent a request (`member-friend-button.tsx:81-86`), and 수락 when the member sent one (:88-98). For a Friend it is hidden.
- The icon set (`mobile/src/design-system/icon.tsx`) has `crown` (:84), `user`, `users`, `plus` and `minus`, but no `usersPlus` or `userMinus`. The catalogue lists every icon (`catalogue/basics.tsx:39`).
- `Dialog` (`design-system/dialog.tsx`) has no default cancel words; `cancelLabel` gives it the button. `IconButton` (`design-system/app-bar.tsx:21`) is 48 pt with no colour; a 40 pt button needs `hitSlop` to reach `size.touchMin` (48), as `button.tsx:53` does.

## What to build

The design of 2026-11-19 (`references/02-2-member-row-mock-up.png`), with 취소 for its 닫기:

- Three 40 pt icon buttons in one line at the right of another member's row, for the Leader: 친구 추가 with a new `usersPlus` (two overlapping people and a plus, so it is not the mirror of the remove icon), 파티장 넘기기 with `crown`, 내보내기 with a new `userMinus` in the danger colour (icon and border). Anyone else sees only the friend button, now an icon. The new icons follow the set: a 24 grid, a 2 pt round stroke. Each button's touch area is 48 pt.
- Screen reader names: "{name}님 친구 추가", "{name}님에게 파티장 넘기기", "{name}님 내보내기".
- Each press opens a `Dialog` with a title and no body line; the action runs only on its confirm button:
  - "{name}님에게 친구 요청을 보낼까요?" 취소 / 요청
  - "{name}님에게 파티장을 넘길까요?" 취소 / 넘기기 (as now)
  - "{name}님을 파티에서 내보낼까요?" 취소 / 내보내기 (danger)
- 요청됨: the `usersPlus` button dimmed and disabled, named "{name}님에게 친구 요청됨" (`references/02-3-requested-dimmed.png`). 수락 stays a text button.
- No other screen's words change.

## Must not break

- The toasts after each action, 내보내기's `fromParty` path, and the hand-over that already asks.
- The join requests on the same screen (`room-member-requests`).
- Tests: `room-people` (:201, :213), `room-wireframe` (:294), `room-member-requests`, `me`, `friends-list` (`.integration`), `design-system/dialog.unit`, `icon.unit`, `catalogue.integration`. Tests that find these buttons by their visible words find them by their screen reader names.

## Acceptance criteria

- [ ] 친구 추가 asks first: 요청 sends the request, 취소 sends nothing. (Integration test, which fails before the change.)
- [ ] 내보내기 asks first: 내보내기 removes the member, 취소 removes no one. (Integration test, which fails before the change.)
- [ ] 파티장 넘기기 still asks and hands over. (Integration test.)
- [ ] 요청됨 shows the dimmed, disabled icon under its name; 수락 stays a text button. (Integration test.)
- [ ] `usersPlus` and `userMinus` are in the icon set and the catalogue. (Unit test.)
- [ ] The row, the three dialogs and the 요청됨 state on a phone with the mock build; the screens go to the orchestrator before the PR, and to 김태현. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
