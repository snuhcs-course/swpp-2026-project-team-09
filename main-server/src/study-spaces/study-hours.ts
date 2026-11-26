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

// The days the hours depend on, each known over its own span (the sources differ): the term's vacations, from the
// university's 학사일정, and the public holidays with 설·추석 apart, from the official list. A day outside a span is not
// known to be a vacation day, or a holiday.
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

const holidaysSchema = z.strictObject({
  known: span.nullable(),
  dates: z.array(z.iso.date()),
  // 설 and 추석, with the days before and after.
  lunar: z.array(z.iso.date()),
  source: z.url({ protocol: /^https?$/u }).nullable(),
});

export const calendarSchema = z.strictObject({ terms: termsSchema, holidays: holidaysSchema, note: text.nullable() });

export type Schedule = z.infer<typeof scheduleSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
type Hours = Schedule['lunarHolidays'];
type Week = Schedule['week'];

// `closesAt` is the clock of the close, 24:00 for midnight and past it for a close the next day ("01:00"), and
// `closesIn` the minutes until it; `opensAt` is the next opening today, when known.
export type Opening =
  | { state: 'open'; closesAt: string; closesIn: number }
  | { state: 'closed'; opensAt: string | null }
  | { state: 'unknown' };

// An opening by minutes from today's midnight: `end` may be past 24:00.
type Reading = { state: 'open'; end: number } | { state: 'closed'; next: number | null } | { state: 'unknown' };

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

// The hours of each way a day may be, as far as the calendar knows.
function readingsOf(schedule: Schedule, { terms, holidays }: Calendar, date: string): Hours[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const regular = weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : 'weekday';
  const known = within(holidays.known, date);
  return weeksOf(schedule, terms, date).flatMap((week) => {
    const asHoliday = schedule.holiday === null ? null : week[schedule.holiday];
    if (!known) {
      // A day the holiday list does not cover may be a holiday, or 설 or 추석.
      return [week[regular], asHoliday, schedule.lunarHolidays];
    }
    if (holidays.lunar.includes(date)) {
      return [schedule.lunarHolidays];
    }
    return [holidays.dates.includes(date) ? asHoliday : week[regular]];
  });
}

// One reading of a day at `minutes` from today's midnight; `offset` is 24:00 for the day before, whose ranges past
// midnight reach into today.
function readingOf(hours: Hours, minutes: number, offset: number): Reading {
  if (hours === null) {
    return { state: 'unknown' };
  }
  if (hours === 'closed') {
    return { state: 'closed', next: null };
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
  return { state: 'closed', next: starts.length === 0 ? null : Math.min(...starts) };
}

// One reading of the day before and one of today together: open when either is, closed when both are.
function together(before: Reading, today: Reading): Reading {
  if (before.state === 'open') {
    return before;
  }
  if (today.state === 'open') {
    return today;
  }
  return before.state === 'closed' && today.state === 'closed' ? today : { state: 'unknown' };
}

// Open when every reading the calendar allows says open (until the earliest close), closed when every one says closed,
// else unknown: a space is never called open on a guess.
function agreed(readings: readonly Reading[], minutes: number): Opening {
  const ends = readings.flatMap((one) => (one.state === 'open' ? [one.end] : []));
  if (ends.length === readings.length) {
    const end = Math.min(...ends);
    return { state: 'open', closesAt: clockOf(end), closesIn: end - minutes };
  }
  const nexts = readings.flatMap((one) => (one.state === 'closed' ? [one.next] : []));
  if (nexts.length < readings.length) {
    return { state: 'unknown' };
  }
  const [next = null] = nexts;
  return { state: 'closed', opensAt: next !== null && nexts.every((one) => one === next) ? clockOf(next) : null };
}

// Whether a space is open at `at`, by its schedule and the calendar: its own day's ranges, and the day before's that
// run past midnight, over every reading of the two days the calendar allows.
export function openAt(schedule: Schedule, calendar: Calendar, at: Date): Opening {
  const korea = new Date(at.getTime() + KOREA_MS);
  const date = korea.toISOString().slice(0, 10);
  const minutes = korea.getUTCHours() * 60 + korea.getUTCMinutes();
  const today = readingsOf(schedule, calendar, date).map((hours) => readingOf(hours, minutes, 0));
  const before = readingsOf(schedule, calendar, previousDay(date)).map((hours) =>
    readingOf(hours, minutes, DAY_MINUTES),
  );
  return agreed(
    before.flatMap((one) => today.map((other) => together(one, other))),
    minutes,
  );
}
