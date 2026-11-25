# 67: Picking's rows come all at once, and a quick 완료 folds the card back

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet.
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Two faults in picking people in the time card (ticket 64), found on the user's phone on 2026-11-26:

- After "＋ 같이", one Friend's row shows first and the others a moment later ("김태현이 뜬 뒤에 나중에 안진영 함재현이 떠").
- 완료 pressed while the card is still opening leaves it open on the row "나" ("빠르게 완료를 누르면 카드가 펼쳐진 상태가 되어 나 줄이 떠").

## What to build

1. The rows appear together, in their final order, and the card's height does not jump.
   - Opening runs to the rows' height as laid out for picking. That height comes a frame after the opening starts, so the run follows it when it changes on the way.
   - The rows wait for the User's Friend list (with its positions, for the walk) before any row shows. If the list fails, the rows come from the answer alone.
   - Once picking opens, its rows are fixed: a Friend the list brings later shows the next time picking opens, so the rows never grow or reorder.
   - The head reads "닫기" only when there is no row to pick.
2. Leaving picking by 완료, 취소, or back while the card is still opening puts it back where it was before "＋ 같이", as after a slow 완료, with reduced motion on and off. The place a run is heading to counts as the card's place. A press on the grip while the card opens folds it again.

## Acceptance criteria

- [ ] With motion on, the rows' room grows without a jump to the picking rows' height, even when that height is laid out after the opening starts.
- [ ] With the Friend list still on its way, no row shows until it arrives; then all of them show in their order.
- [ ] A failed Friend list still opens picking with the answer's rows and "완료".
- [ ] With motion on, 완료, 취소, or back pressed while the card opens leaves it folded, with no row for 나.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
