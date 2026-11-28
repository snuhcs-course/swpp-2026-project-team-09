# 59: An unstarred event leaves the ★ list at once, and a button's words are never cut

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: 57 (PR 778), merged into this branch.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on the 행사 tab:

1. "관심 표시를 누른 상태에서 항목의 별을 취소하면 그대로 목록에 남아있다는거야." Ticket 57 kept an unstarred row while the ★ filter was on, until the tab was left.
2. "버튼 텍스트가 짤리는 것." The 행사 sheet's right button read "모집 중인 파티 1 · 찾…".
   - The words were "모집 중인 파티 {n} · 찾기/모집".
   - The shared `Button` draws its words on one line with an ellipsis, in a fixed height.

## What to build

1. With the ★ filter on, an event unstarred in its row or in its sheet leaves the list at once; with the last one gone, the empty words show. The list has no shared exit animation and the app has no undo bar, so neither is added.
2. The 행사 sheet's button reads "모집 중인 파티 {n}", and "파티 찾기/모집" at zero; the sheet it opens offers both.
3. The shared `Button` never cuts its words. They wrap, centred, and the button's height is its least (`minHeight`), so it grows to hold them.

## Checked: buttons whose words grow

| Button | Words | Was | Now |
|---|---|---|---|
| 행사 sheet's party button (`events/event-detail-sheet.tsx`) | a count | "모집 중인 파티 1 · 찾…" | "모집 중인 파티 1"; would wrap, never cut |
| Map card's main button (`main/card.tsx`, `card.primary.label`) | a Friend's name, a place | one line, "…" | wraps |
| Answer actions (`main/answer/plan-action.tsx`, `choice-row.tsx`, `confirm-row.tsx`, `lookup-card.tsx`, `row-four-buttons.tsx`) | times, names, places | one line, "…" | wrap |
| 모집글 and card join buttons (`party/post-footer.tsx`, `party/post-card.tsx`) | "참여하기" / "참여 신청" / count words | one line, "…" | wrap |
| 파티 form's submit (`party/form/party-form-screen.tsx`, `words.submit`) | "n명 초대하고 올리기"-type words | one line, "…" | wraps |
| 친구 초대 sheet (`party/form/friend-sheet.tsx`) | "n명 초대" | one line | wraps |
| Dialogs (`design-system/dialog.tsx`), empty-state action (`states.tsx`) | the caller's words | one line, "…" | wrap |
| Room's action (`room/room-screen.tsx`) | the action's words | one line, "…" | wraps |

## Acceptance

- [ ] An unstarred row leaves at once; the empty words show after the last (integration test, failing before).
- [ ] `Button`'s words have no one-line limit and the button a least height (unit test, failing before).
- [ ] The 행사 sheet's button reads "모집 중인 파티 2" (integration test).

## Comments
