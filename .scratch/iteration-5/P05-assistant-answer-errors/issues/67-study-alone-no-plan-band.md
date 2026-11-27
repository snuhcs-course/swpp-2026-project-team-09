# 67: A study alone without a plan keeps its time card

Parent: [P05 spec](../spec.md); ticket 65, which gave the band to a meal, a meet, a study together and a new party
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server; the app reads it with P01-31.

## What happened

- A study alone has a no-plan answer: "지금 연 공부할 곳이 없어요", "다음 일정 전까지 머물 시간이 없어요" and "보는 범위에 공부할 곳이 없어요".
- It also has inputs to undo on its time card: the window, the area, what to study, and "+ 같이" from the band's `others`.
- Ticket 65 covered the four kinds it named. Here, as there, the card vanished with no plan.
- Of the other two kinds left out of ticket 65, events (`date`, `eventIds`) and joining a party (`globalEventId`, `questIds`) have nothing on a time card to undo, and need no band.

## What changes

- `studyPlanAnswer` gives its no-plan answer `noPlan.band` (`noPlanBand` in `study-plan.ts`):
  - the User's lane, and their other Friends with no walk, since there is no place to walk to;
  - over the stretch from when they are ready to the end they set, else their next item, else three hours on.
- When the stretch ends at the next item, the range reaches over that item, so that the band shows what ends it. `windowBand` takes the later end it reaches to as an optional `reach`.

## Acceptance criteria

- [x] With nothing open, the band covers the three hours from now; with no time before the next Class, it ends at it and reaches over it. (Unit test, failing before the change.)
- [x] Asked in the chat ("근처 공부할 곳" in an area with none) and recalculated in that area, the answer carries the band with the Friend who could be added. (Integration tests, failing before the change.)
- [x] `windowBand`'s range reaches over a later end it is given. (Unit test.)
- [x] The whole of the main server's lint, format and types; every study and no-plan test file runs locally.
- [ ] Evals not run: no prompt changed.
