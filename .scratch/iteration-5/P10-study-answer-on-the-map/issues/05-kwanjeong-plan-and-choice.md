# 05: 관정's plan is bookable, and a study plan is chosen as a meal plan is

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03

## What to build

- 관정관's plan alone carries `study.book.spaceId`: 7F-7A-zone2 for `quiet` or `any`, none for `group` or `pc` (the layer's 관정 space is a reading room, so 관정관 is no candidate for them). It also carries `study.liveSeats: 'kwanjeong'`. A group room is booked with Friends, by 07's `group.key`.
- No new booking path. The app's 예약하기 asks for the book card of that space as today ("관정 7층 열람실 예약해 줘" → `proposeLibraryBooking`). The rule makes "예약해 줘" over a study answer use the plan on screen's `study.book.spaceId`.
- `choosePlan` already chooses among `planIds` for a `choosable` answer. Check that it does for a `study` input: its guard reads `conditions.kind === 'meal'` today, so widen it to `study`.
- After closing, 관정 is in `closed`. A direct booking question still gets P05 ticket 57's refusal and grey place.

## Acceptance criteria

- [ ] 관정's plan has `book` for `quiet` and `any`. No other plan has `book`. (Unit test.)
- [ ] "2번으로 할게" over a study answer gives `select` for its second plan. (Unit test on `choosePlan` with a study `conditions`.)
- [ ] "예약해 줘" with 관정's plan on screen reaches `proposeLibraryBooking` with its `spaceId`. (Eval case, written and not run.)
