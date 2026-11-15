# 19: "여기면 어때?": each person's arrival at a pressed Place during a Plan

Parent: [P01 spec](../spec.md) ("The contract"); package B's row 6 (P02 ticket 26)
Status: ready-for-agent
Blocked by: 17

## What to build

A building pressed during a Plan becomes "여기면 어때?". The recalculation with that Place fixed says when each person can be there and how long they are together. When the Place does not fit, it names who stays shortest and why: "지은은 12:31에 도착해 13분만 먹어요" / "13:00 수업에 가려면 12:44엔 나서야 해요". These are row 6, boards a7 and a8.

## Acceptance criteria

- [ ] `PlanPart.arriveAt?: string | null` on both sides: the earliest the person can be at the Place (the gathering's `canArriveAt`), null when their position is unknown. a7: 나 12:35, 민수 12:35, 지은 12:18.
- [ ] `DroppedPlace.parts?: PlanPart[]`, given when the input fixed that Place. a8: 나 0 minutes from 301동, 민수 12:18, 지은 12:31.
- [ ] A fixed Place that does not fit gets `noPlan.lines` naming who stays shortest and why (`GatheringDrop.shortest`).
- [ ] The app's checks (`isPart`, `isDropped`) accept the new fields, and the mock answers with copies of the real replies for a7 and a8.
- [ ] Unit tests on the boards' values; integration tests at the recalculation.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, section "여기면 어때?".

## Comments
