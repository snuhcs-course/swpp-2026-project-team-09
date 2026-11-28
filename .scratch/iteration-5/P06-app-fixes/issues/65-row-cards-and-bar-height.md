# 65: a card's row greys whole when pressed, no line at a card's foot, one bar height

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on 내 정보 → 알림: "알림을 누르면 뜨는 음영이 왜 일부만 되는거지? 굉장히 별로야. 그리고 각 셀 하단에 미세하게 가로줄이 있는데 이것도 별로야. 알림을 클릭하면 화면이 부드럽게 넘어가지지 않고 순간적으로 이미지 2처럼 돼. 마지막으로 알림 상단의 탭 높이와 기본 탭 높이가 달라."

- **Part of the row greyed.** A `ListRow` in a card sat inside the card's 16 of padding, so its pressed grey stopped 16 short of each edge, with square corners inside the round card.
- **A line at each card's foot.** A `ListRow` draws a line under itself unless given `last`; 알림's rows, the 비공개 구역 row and the last 관심 row never were.
- **Two maps at once.** Not here: ticket 63 (#785) closes 알림 before the map opens the card.
- **Two bar heights.** A pushed screen's app bar was 56 high (`size.appBar`); a tab's is 50 with 4 on top (`TAB_BAR_ROW`).

## What to build

- `RowCard` in the design system: a card of `ListRow`s that run to its edges (16 of padding in each row), cut by its corners, with a line between two rows and none at its foot. Every card of rows uses it.
- `AppBar`'s sub-screen row takes the tab's row; the legal documents' own header becomes an `AppBar`.

## Checked

| Place                                                     | Was                                        | Now                                |
| --------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| 알림's day cards                                          | grey inset 16, a line under every row      | `RowCard`                          |
| 내 정보: 친구 관리 / 참여 중인 파티 / 내 퀘스트 / 관심사  | grey inset 16, card padding 4 top and foot | `RowCard`, lines between rows only |
| 내 정보: 비공개 구역                                      | grey inset 16, a line at the foot          | `RowCard`                          |
| 내 정보: 탭 안내 다시 보기, 관정도서관 로그인             | grey inset 16 (no press for the library)   | `RowCard`                          |
| 관심사: 맡겨 둔 관심 (header, note, rows; no press)       | a line under the last row                  | no line under the last row         |
| 친구 panel, 친구 요청, 친구 추가, 퀘스트 목록, 구역 panel | rows on the page, not in a card            | unchanged                          |
| Every `FullScreenPanel` and `AppBar` with a way out       | bar 56                                     | bar 50 with 4 on top, as a tab's   |
| 이용약관 / 개인정보 처리방침 (`LegalScreen`)              | own header, 56                             | `AppBar` with 닫기, 50             |
| 장소 on the map (`/place-map`)                            | a floating ‹ over the map, no bar          | unchanged                          |

## Acceptance

- [ ] A row in a `RowCard` has 16 of side padding, the card none and its overflow cut; lines only between rows (unit test, failing before).
- [ ] A sub-screen's bar row is 50 high with 4 on top (unit test, failing before).
- [ ] A row of 알림 draws no line and has 16 of side padding (integration test, failing before).
- [ ] On the phone: pressing a row of 알림 greys the whole card row; no line under a card; 알림's bar is as high as a tab's.

## Comments
