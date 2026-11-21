# 24: A Place picked on the map and a time on a wheel, asked back as controls

Parent: [P05 spec](../spec.md)
Status: needs-triage
Blocked by: None. Both sides: the main server and the app (P04).

Native files: none.

## What happens now

Found in use (feedback 2026-11-22, item 4): every question the model asks back is words, except the which-Friend grid and, after ticket 23, the Board chips. A Place can already be given by tapping a building (`[Tapped: place …]`), but nothing tells the User so and nothing waits for the tap. A time is always typed.

## What to build

- **`pick-place`**: a new offer kind, set when planNewQuest answers `needs-place` and when proposeQuest misses a place. Its chip turns the map into picking: a tap on a building sends "여기서" with `tapped: place`, which the tools already take.
- **`pick-time`**: a new offer kind with the day, and the free stretches when known, set when planNewQuest answers `needs-time` and when proposeQuest misses `startsAt`. A wheel, or the time bar's handle, sends "HH:MM에". The same control answers ticket 17's "시간 바꾸기" ("몇 시로 바꿀까요?", row 14 of its case table).
- Both kinds go into the reply's and the refusal's offer types on both sides. An app before them leaves an unknown offer out, as it does an unknown step.

## Acceptance criteria

- [ ] Agreed with P04: the two kinds' fields and what a press sends.
- [ ] To be written with the design.
