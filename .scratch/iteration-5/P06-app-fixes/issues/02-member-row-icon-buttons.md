# 02: The 파티 member row: three icon buttons, each asking first

Parent: [P06 spec](../spec.md)
Status: done
Taken up on 2026-11-25.
Blocked by: None (06 merged as #475 on 2026-11-22).

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
- Tests: `room-people` (:201, :213), `room-wireframe` (:294-295), `room-member-requests`, `me`, `friends-list` (`.integration`), `design-system/dialog.unit`, `icon.unit`, `catalogue.integration`. Tests that find these buttons by their visible words find them by their screen reader names.
- `room-wireframe:295` gets the member by `getByRole('button', { name: /^김민준/u })` inside 멤버. Once the icons are named "김민준님 …", that matches three buttons; the query narrows to the row's own button.

## Decided while building (2026-11-25)

- The icon alone is `Button` with an icon and no words: a square of 40 in the same 48-point touch area as an `md` Button (`hitSlop` 4), its `label` read by a screen reader. It takes Button's variants, pressed and disabled looks, so no new component. The catalogue's Button section shows the four (친구 추가, 파티장 넘기기, 내보내기, 요청됨), and `mobile/README.md` describes the row and the icon alone.
- The icons are 20 in the button. `usersPlus` is the front person (head and the left of the body), a second, smaller head beside its head, and + at the bottom right; `userMinus` is the same front person with − at the bottom right. The two read as one family and differ by the number of people, so neither is the other's mirror.
- 요청됨 takes Button's disabled look (the sunken grey ground, no border, the icon in `inkMuted`), as every disabled Button does, not the mock-up's faint border.
- One `Dialog` in `멤버` asks all three, as the hand-over's did. What was asked stays while it fades out, so its title and buttons do not change as it goes; it acts only on the confirming answer. Whether 내보내기 also takes the member out of the Party (`fromParty`) is decided on that answer, by the same rule.
- The Leader's row tests (the three icons, 내보내기 with its 취소, 파티장 넘기기) moved from `room-people` into a new `room-member-row.integration.test.tsx`, because `room-people` would pass the lint's 300 lines. Its describe that keeps the press on a member is now "a member's row". `room-member-requests` keeps 친구 추가 and asks in its own describe.
- `room-walking` also found the row by `/^김민준/u`. It and `room-wireframe` find it by `/^김민준(?: · |$)/u`, the row read as the name and its line, not "김민준님 …".
- From the review (2026-11-25): the screens were taken on the Android emulator with the mock build after all (`references/02-4` to `02-9`: the Leader's rows, the three dialogs, 요청됨 after 요청, and a row that a Holder who does not lead sees), and the user's check on an Android phone follows. For the capture only, 유지안 and 백승호 (no Friends; the User had sent 백승호 a request) were added to the mock's `q-dinner` with capacity 6. That change is not committed: it changes what 9 mock-backed tests of the main screen, the Quest list and 내 파티 expect.
- From the review (2026-11-25): a Button with no words takes only the `md` size and never `full`, so the 40 square cannot be stretched or made taller.
- Not done from the review (2026-11-25): closing the dialog when the member's state changes while it is open. A stale 요청 or 내보내기 is refused by the main server with a toast, and nothing breaks.

## Acceptance criteria

- [x] 친구 추가 asks first: 요청 sends the request, 취소 sends nothing. (Integration test, which fails before the change.)
- [x] 내보내기 asks first: 내보내기 removes the member, 취소 removes no one. (Integration test, which fails before the change.)
- [x] 파티장 넘기기 still asks and hands over. (Integration test.)
- [x] 요청됨 shows the dimmed, disabled icon under its name; 수락 stays a text button. (Integration test.)
- [x] `usersPlus` and `userMinus` are in the icon set and the catalogue. (Unit test.)
- [x] The row, the three dialogs and the 요청됨 state on a phone with the mock build; the screens go to the orchestrator before the PR, and to the design review. (Emulator.) (Emulator screens in the PR; the user's check on an Android phone follows.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-25)

- Agent time: about 50 minutes, in one implementation session: tests, code, sweep and the pull request (about 35 minutes), then the review's fixes with the emulator screens (about 15 minutes). This is an estimate: gaps under 5 minutes between transcript entries, summed, plus the test runs waited on. The orchestrator session's own time is not counted here.
- Tokens: input 32,493,732 (cache reads 32,207,832, cache writes 285,636, uncached 264); output 104,940. Without cache reads, 285,900. No subagents. Counted up to the writing of this entry, after the review's fixes, so the last few messages are left out.
