# 01: A study space's opening hours as data, filled from the research

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: the hours research, `.scratch/iteration-5/notes-ko/handoff/study-space-hours-research.md`

## What to build

- In `seed/study-spaces.json`, each space gains `schedule`, validated in `study-spaces-file.ts`. The display text `hours` is kept.
- `schedule` has `term` and `vacation`. Each has `weekday`, `saturday` and `sunday`, and each of those is one of:
  - a list of `{ open: 'HH:MM', close: 'HH:MM' }` (a close of `24:00` or past midnight allowed);
  - `'closed'`;
  - `null` for unknown.
- `holidays` take the `sunday` value.
- The file gains a `calendar` with the term and vacation date ranges and the public holidays of the year. It is checked on load, like `checkedOn`.
- `openAt(space, at)` answers `{ state: 'open', closesAt } | { state: 'closed', opensAt | null } | { state: 'unknown' }`. A day outside the calendar is unknown.
- The values come by hand from the research file, by the user's choice. A value the research leaves open stays `null`.

## Acceptance criteria

- [ ] The schema refuses a range whose close is before its open, an unknown key, and a calendar with overlapping ranges.
- [ ] `openAt` for each kind of day (term weekday, Saturday, Sunday, holiday, vacation day), at a time inside a range, at its close, after it, and for a `null` value. (Unit tests.)
- [ ] All 25 spaces filled from the research file, with the display text unchanged. `checkedOn` is the research's date.
- [ ] `GET /study-spaces` serves what it serves today: `schedule` is not on that wire.
