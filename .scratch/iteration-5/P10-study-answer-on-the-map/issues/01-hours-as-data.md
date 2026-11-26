# 01: A study space's opening hours as data, filled from the research

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: the hours research, `.scratch/iteration-5/notes-ko/handoff/study-space-hours-research.md`

## What to build

- In `seed/study-spaces.json`, each space gains `schedule`, validated in `study-spaces/study-hours.ts`. The display text `hours` is kept.
- `schedule` has:
  - `week`, the hours of the year;
  - `vacation`, when a source gives vacation hours apart, else `null`.
- Each of those has `weekday`, `saturday` and `sunday`, and each of those is one of:
  - a list of `{ open: 'HH:MM', close: 'HH:MM' }` (a close of `24:00` or past midnight allowed);
  - `'closed'`;
  - `null` for unknown.
- A public holiday takes the column its source gives it (`holiday`: `saturday` on lib.snu.ac.kr, whose 토요일·공휴일 share a column, or `null` when not stated). 설 and 추석 have their own value (`lunarHolidays`). An exam period's own hours are a `period`.
- Each schedule carries its `confidence`, its `sources` (none when nothing was found) and a `note` for a conflict or what is not verified. None of it is served.
- The file gains a `calendar`:
  - `terms`: the vacations, from the 학사일정;
  - `holidays`: the public holidays, with 설·추석 apart.
- Each part says the span over which it is known. The calendar is checked on load, like `checkedOn`.
- `openAt(schedule, calendar, at)` answers `{ state: 'open', closesAt, closesIn } | { state: 'closed', opensAt | null } | { state: 'unknown' }`. It also counts the day before's ranges that run past midnight.
- A day the calendar does not place, such as a day outside the holiday list's span, may be any of its readings: a regular day, a holiday, or 설·추석. The space is open only when every reading says open, and closed only when every reading says closed. Otherwise it is unknown.
- The values come by hand from the research file, by the user's choice. A value the research leaves open stays `null`.
  - The 7 spaces with no hours found are `null` on every day, with no source.
  - 경영학도서관 열람실 and 자유열람석 take the college's narrower hours (평일 09:00–23:00, closed on weekends), `low`, with the conflict in the note.
  - The 수의학도서관 그룹스터디룸 is its own space, `veterinary-group-rooms`, at the library page's 07:00–23:00 every day. Its 정보자료실 stays `veterinary-library`.
  - The 사회과학도서관 그룹스터디룸, read only from a search engine's copy of its page, is `low`.

## Acceptance criteria

- [x] The schema refuses an empty range, an open of 24:00, a clock past 24:00, an unknown key, a period that ends before it starts, and a calendar with overlapping vacations.
- [x] `openAt` for each kind of day (term weekday, Saturday, Sunday, holiday, 설·추석, vacation day, a period), at a time inside a range, at its close, after it and before it, past midnight, and for a `null` value. (Unit tests, `test/study-hours.unit.test.ts`.)
- [x] All 26 spaces (25 and the split 그룹스터디룸) filled from the research file. `checkedOn` is the research's date. The display text is unchanged, except where the research changed it:
  - 경영학도서관 열람실 and 자유열람석: 평일 09:00–23:00;
  - 세미나실: 09:00–22:00;
  - the split 수의학도서관 rooms.
- [x] `GET /study-spaces` serves what it serves today: `schedule` is not on that wire.
- [x] The public holidays in `calendar.holidays`, from 2026-11 to 2027-12 (second PR of ticket 01, 2026-11-27). They come from the official rules, since no list could be read and the repo keeps none:
  - the fixed days and the substitute rule from 관공서의 공휴일에 관한 규정 (대통령령 제36290호, in force 2026-05-11). Every 국경일, so 제헌절, and 노동절 are holidays now;
  - 설, 부처님 오신 날 and 추석 from KASI's 음양력 변환.
  - Each date names its rule and its page. No election day or temporary holiday is listed: no official page states one.
  - A day outside the range, or not listed, reads as a regular day.
  - A unit test fails once today passes the range's end.
