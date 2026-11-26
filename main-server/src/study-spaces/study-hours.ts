/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

// A study space's opening hours as data (P10 ticket 01), filled by hand from the research of 2026-11-26
// (`.scratch/iteration-5/notes-ko/handoff/study-space-hours-research.md`), only from what a source states. The display
// text `hours` beside it stays as the sources word it.

const text = z.string().trim().min(1);
const clock = z.string().regex(/^(?:[01]\d|2[0-4]):[0-5]\d$/u, 'Expected HH:MM, 24:00 at most');

// A close at or before its open is past midnight (06:00–01:00 closes at 01:00 the next day); 00:00–24:00 is all day.
const rangeSchema = z
  .strictObject({ open: clock, close: clock })
  .refine(({ open }) => open !== '24:00', 'Expected an open before 24:00')
  .refine(({ open, close }) => open !== close, 'Expected a range that is not empty');

// The ranges of a day, 'closed' when the source shows it closed, or null when no source gives that day's hours.
const hoursSchema = z.union([z.array(rangeSchema).min(1), z.literal('closed'), z.null()]);

const weekSchema = z.strictObject({ weekday: hoursSchema, saturday: hoursSchema, sunday: hoursSchema });

const periodSchema = z
  .strictObject({ from: z.iso.date(), to: z.iso.date(), week: weekSchema, note: text })
  .refine(({ from, to }) => from <= to, 'Expected from before to');

export const scheduleSchema = z.strictObject({
  // The hours of the year, unless `vacation` or a period says otherwise.
  week: weekSchema,
  // The hours of a vacation, when a source gives them apart; null when it gives one set of hours for the year.
  vacation: weekSchema.nullable(),
  // Which day's hours a public holiday takes (lib.snu.ac.kr: 토요일·공휴일 share a column); null when not stated.
  holiday: z.enum(['saturday', 'sunday']).nullable(),
  // 설 and 추석: their own hours, 'closed', or null when not stated.
  lunarHolidays: hoursSchema,
  // Stretches with hours of their own, such as an exam period's 24 hours.
  periods: z.array(periodSchema),
  confidence: z.enum(['high', 'medium', 'low']),
  // Empty when no source gives any hours.
  sources: z.array(z.url({ protocol: /^https?$/u })),
  // What the sources disagree on, or what is not verified. Never served.
  note: text.nullable(),
});

const span = z
  .strictObject({ from: z.iso.date(), to: z.iso.date() })
  .refine(({ from, to }) => from <= to, 'Expected from before to');

// The days the hours depend on: the term's vacations, from the university's 학사일정, known over their own span (a day
// outside it may be in term or in a vacation); and the public holidays with 설·추석 apart, each with the rule that makes
// it a holiday and the page that states its date, filled over `filled` (P10 ticket 01: a day outside it, or not
// listed, reads as a regular day, and a test fails once today passes its end, so that the list is filled again).
const termsSchema = z
  .strictObject({
    known: span.nullable(),
    vacations: z.array(span),
    source: z.url({ protocol: /^https?$/u }).nullable(),
  })
  .refine(
    ({ vacations }) =>
      vacations
        .toSorted((a, b) => a.from.localeCompare(b.from))
        .every((one, index, sorted) => index === 0 || (sorted[index - 1]?.to ?? '') < one.from),
    'Expected vacations that do not overlap',
  );

const holidaySchema = z.strictObject({
  date: z.iso.date(),
  name: text,
  // "관공서의 공휴일에 관한 규정 제3조제1항제1호", with the lunar date read where it is one.
  rule: text,
  source: z.url({ protocol: /^https?$/u }),
});

const holidaysSchema = z
  .strictObject({
    filled: span,
    dates: z.array(holidaySchema),
    // 설 and 추석, with the days before and after.
    lunar: z.array(holidaySchema),
  })
  .refine(
    ({ filled, dates, lunar }) => [...dates, ...lunar].every(({ date }) => filled.from <= date && date <= filled.to),
    'Expected every holiday within filled',
  );

export const calendarSchema = z.strictObject({ terms: termsSchema, holidays: holidaysSchema, note: text.nullable() });

export type Schedule = z.infer<typeof scheduleSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
type Hours = Schedule['lunarHolidays'];
type Week = Schedule['week'];

// `closesAt` is the clock of the close, 24:00 for midnight and the next day's clock past it ("01:00"), and `closesIn`
// the minutes until it; both null when it stays open a day or more. `opensAt` is the next opening today and `closedAt`
// the last close today, each when known.
export type Opening =
  | { state: 'open'; closesAt: string | null; closesIn: number | null }
  | { state: 'closed'; opensAt: string | null; closedAt: string | null }
  | { state: 'unknown' };

type Closed = Extract<Opening, { state: 'closed' }>;

// An opening by minutes from today's midnight: `end` may be past 24:00, and `last` before 00:00 (a close yesterday).
type Reading =
  { state: 'open'; end: number } | { state: 'closed'; next: number | null; last: number | null } | { state: 'unknown' };

const DAY_MINUTES = 24 * 60;
const KOREA_MS = 9 * 60 * 60 * 1000;

const minutesOf = (clockText: string): number => {
  const [hours = 0, minutes = 0] = clockText.split(':').map(Number);
  return hours * 60 + minutes;
};

const clockOf = (minutes: number): string => {
  const hours = minutes === DAY_MINUTES ? 24 : Math.floor(minutes / 60) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

function previousDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MINUTES * 60_000).toISOString().slice(0, 10);
}

const within = (known: { from: string; to: string } | null, date: string): boolean =>
  known !== null && known.from <= date && date <= known.to;

function weeksOf(schedule: Schedule, terms: Calendar['terms'], date: string): Week[] {
  const inPeriod = schedule.periods.find(({ from, to }) => from <= date && date <= to);
  if (inPeriod !== undefined) {
    return [inPeriod.week];
  }
  if (schedule.vacation === null) {
    return [schedule.week];
  }
  if (!within(terms.known, date)) {
    // A day the calendar does not place may be in term or in a vacation.
    return [schedule.week, schedule.vacation];
  }
  return [terms.vacations.some(({ from, to }) => from <= date && date <= to) ? schedule.vacation : schedule.week];
}

// The hours of each way a day may be, as far as the calendar knows: in term or in a vacation when the terms do not place
// it, and a holiday, 설·추석 or a regular day as the list has it.
function readingsOf(schedule: Schedule, { terms, holidays }: Calendar, date: string): Hours[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const regular = weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : 'weekday';
  const listed = (days: readonly { date: string }[]): boolean => days.some((day) => day.date === date);
  return weeksOf(schedule, terms, date).map((week) => {
    if (listed(holidays.lunar)) {
      return schedule.lunarHolidays;
    }
    if (listed(holidays.dates)) {
      return schedule.holiday === null ? null : week[schedule.holiday];
    }
    return week[regular];
  });
}

// One reading of a day at `minutes` from today's midnight; `offset` is 24:00 for the day before, whose ranges past
// midnight reach into today.
function readingOf(hours: Hours, minutes: number, offset: number): Reading {
  if (hours === null) {
    return { state: 'unknown' };
  }
  if (hours === 'closed') {
    return { state: 'closed', next: null, last: null };
  }
  const at = minutes + offset;
  const spans = hours.map(({ open, close }) => {
    const start = minutesOf(open);
    return { start, end: minutesOf(close) <= start ? minutesOf(close) + DAY_MINUTES : minutesOf(close) };
  });
  const current = spans.find(({ start, end }) => start <= at && at < end);
  if (current !== undefined) {
    return { state: 'open', end: current.end - offset };
  }
  const starts = spans.flatMap(({ start }) => (start > at ? [start - offset] : []));
  const ends = spans.flatMap(({ end }) => (end <= at ? [end - offset] : []));
  return {
    state: 'closed',
    next: starts.length === 0 ? null : Math.min(...starts),
    last: ends.length === 0 ? null : Math.max(...ends),
  };
}

const latest = (one: number | null, other: number | null): number | null =>
  one === null || other === null ? (one ?? other) : Math.max(one, other);

// One reading of the day before and one of today together: open when either is, closed when both are.
function together(before: Reading, today: Reading): Reading {
  if (before.state === 'open') {
    return before;
  }
  if (today.state === 'open') {
    return today;
  }
  if (before.state === 'closed' && today.state === 'closed') {
    return { state: 'closed', next: today.next, last: latest(before.last, today.last) };
  }
  return { state: 'unknown' };
}

// The value every reading gives, or null when they differ.
function shared(values: readonly (number | null)[]): number | null {
  const [first = null] = values;
  return values.every((value) => value === first) ? first : null;
}

// Open when every reading the calendar allows says open (until the earliest close), closed when every one says closed,
// else unknown: a space is never called open on a guess.
function agreed(readings: readonly Reading[]): { state: 'open'; end: number } | Closed | { state: 'unknown' } {
  const ends = readings.flatMap((one) => (one.state === 'open' ? [one.end] : []));
  if (ends.length === readings.length) {
    return { state: 'open', end: Math.min(...ends) };
  }
  const closed = readings.flatMap((one) => (one.state === 'closed' ? [one] : []));
  if (closed.length < readings.length) {
    return { state: 'unknown' };
  }
  const next = shared(closed.map((one) => one.next));
  const last = shared(closed.map((one) => one.last));
  return {
    state: 'closed',
    opensAt: next === null ? null : clockOf(next),
    closedAt: last === null || last < 0 ? null : clockOf(last),
  };
}

// The opening at `at` by its own day and the day before, the close in minutes from `at`.
function openOnce(
  schedule: Schedule,
  calendar: Calendar,
  at: Date,
): { state: 'open'; closesAt: string; closesIn: number } | Closed | { state: 'unknown' } {
  const korea = new Date(at.getTime() + KOREA_MS);
  const date = korea.toISOString().slice(0, 10);
  const minutes = korea.getUTCHours() * 60 + korea.getUTCMinutes();
  const today = readingsOf(schedule, calendar, date).map((hours) => readingOf(hours, minutes, 0));
  const before = readingsOf(schedule, calendar, previousDay(date)).map((hours) =>
    readingOf(hours, minutes, DAY_MINUTES),
  );
  const opening = agreed(before.flatMap((one) => today.map((other) => together(one, other))));
  return opening.state === 'open'
    ? { state: 'open', closesAt: clockOf(opening.end), closesIn: opening.end - minutes }
    : opening;
}

// Whether a space is open at `at`, by its schedule and the calendar, over every reading of the days the calendar
// allows. A close that the next day's opening follows at once is no close: 24 hours every day stays open.
export function openAt(schedule: Schedule, calendar: Calendar, at: Date): Opening {
  const first = openOnce(schedule, calendar, at);
  if (first.state !== 'open') {
    return first;
  }
  let { closesAt, closesIn } = first;
  while (closesIn < DAY_MINUTES) {
    const after = openOnce(schedule, calendar, new Date(at.getTime() + closesIn * 60_000));
    if (after.state !== 'open') {
      return { state: 'open', closesAt, closesIn };
    }
    ({ closesAt } = after);
    closesIn += after.closesIn;
  }
  return { state: 'open', closesAt: null, closesIn: null };
}
