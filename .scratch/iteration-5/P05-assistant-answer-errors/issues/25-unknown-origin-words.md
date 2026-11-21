# 25: A Friend's unknown origin says which it is

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server. The app's Friend picker changes its own word on its side (P04).

## What happens now

Found in use (feedback 2026-11-22, item 7b): a Friend's chip reads "<name> · 자리 모름" for two different things. For now, the asker may not see where the Friend is. For a time ahead, the Friend sets out from the item before it, which has no Place. The app's Friend picker also says "자리 모름" when a Friend shares no live position.

## What to build

- For a time ahead (the stretch the Friend is free in starts after now), the chip reads "<name> · 출발지 모름". For now, "<name> · 위치 모름".
- The shape `<name> · <words>` stays: the app reads the name before " · ", and so does the server (`friendNames` in `plan-tools.ts`).
- The meal and meet answers (`GatheringSide.later`) and a new 파티's answer (`PersonWay.later`) say it the same way.

## Acceptance criteria

- [ ] A Friend free from now with no position the asker may see reads "위치 모름"; one free only after an item with no Place reads "출발지 모름". (`meal-answer-cases.unit.test.ts`, the second new.)
- [ ] Lint, format and types of the main server pass.
