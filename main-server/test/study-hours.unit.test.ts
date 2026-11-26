/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type Calendar,
  calendarSchema,
  openAt,
  type Opening,
  type Schedule,
  scheduleSchema,
} from '../src/study-spaces/study-hours.js';

// A study space's opening hours as data, and whether it is open at a time (P10 ticket 01).

const range = (open: string, close: string): { open: string; close: string }[] => [{ open, close }];
const every = (hours: Schedule['lunarHolidays']): Schedule['week'] => ({
  weekday: hours,
  saturday: hours,
  sunday: hours,
});

function scheduleOf(overrides: Partial<Schedule> = {}): Schedule {
  return {
    week: { weekday: range('09:00', '18:00'), saturday: range('10:00', '17:00'), sunday: 'closed' },
    vacation: { weekday: range('10:00', '16:00'), saturday: 'closed', sunday: 'closed' },
    holiday: 'sunday',
    lunarHolidays: null,
    periods: [],
    confidence: 'high',
    sources: ['https://lib.snu.ac.kr/about/hour-directions/hours/branch/'],
    note: null,
    ...overrides,
  };
}

function holiday(date: string, name: string): Calendar['holidays']['dates'][number] {
  return { date, name, rule: '관공서의 공휴일에 관한 규정 제2조', source: 'https://www.law.go.kr/' };
}

// 2026's terms and holidays, with 한글날 (10-09) a holiday in term and 추석's 09-25 a lunar one.
const CALENDAR: Calendar = {
  terms: {
    known: { from: '2026-03-01', to: '2027-02-28' },
    vacations: [{ from: '2026-12-22', to: '2027-02-28' }],
    source: 'https://www.snu.ac.kr/academics/resources/calendar',
  },
  holidays: {
    filled: { from: '2026-01-01', to: '2026-12-31' },
    dates: [holiday('2026-10-09', '한글날')],
    lunar: [holiday('2026-09-25', '추석')],
  },
  note: null,
};

const UNPLACED: Calendar = {
  terms: { known: null, vacations: [], source: null },
  holidays: { filled: { from: '2026-01-01', to: '2026-01-01' }, dates: [], lunar: [] },
  note: null,
};

const at = (date: string, clock: string): Date => new Date(`${date}T${clock}:00+09:00`);

const closed = (opensAt: string | null, closedAt: string | null): Opening => ({ state: 'closed', opensAt, closedAt });

describe('openAt, by the kind of day', () => {
  const schedule = scheduleOf();

  it('reads a term weekday inside a range, at its close, after it and before it', () => {
    expect(openAt(schedule, CALENDAR, at('2026-11-27', '10:00'))).toEqual({
      state: 'open',
      closesAt: '18:00',
      closesIn: 480,
    });
    expect(openAt(schedule, CALENDAR, at('2026-11-27', '18:00'))).toEqual(closed(null, '18:00'));
    expect(openAt(schedule, CALENDAR, at('2026-11-27', '20:00'))).toEqual(closed(null, '18:00'));
    expect(openAt(schedule, CALENDAR, at('2026-11-27', '08:00'))).toEqual(closed('09:00', null));
  });

  it('reads a Saturday and a Sunday by their own columns', () => {
    expect(openAt(schedule, CALENDAR, at('2026-11-28', '12:00'))).toMatchObject({ state: 'open', closesAt: '17:00' });
    expect(openAt(schedule, CALENDAR, at('2026-11-29', '12:00'))).toEqual(closed(null, null));
  });

  it("reads a public holiday by the column the space's source gives it, and 설·추석 by their own", () => {
    expect(openAt(schedule, CALENDAR, at('2026-10-09', '12:00'))).toEqual(closed(null, null));
    expect(openAt(scheduleOf({ holiday: 'saturday' }), CALENDAR, at('2026-10-09', '12:00'))).toMatchObject({
      state: 'open',
    });
    expect(openAt(schedule, CALENDAR, at('2026-09-25', '12:00'))).toEqual({ state: 'unknown' });
    expect(openAt(scheduleOf({ lunarHolidays: 'closed' }), CALENDAR, at('2026-09-25', '12:00'))).toMatchObject({
      state: 'closed',
    });
  });

  it('reads a vacation day by the vacation hours', () => {
    expect(openAt(schedule, CALENDAR, at('2026-12-23', '11:00'))).toMatchObject({ state: 'open', closesAt: '16:00' });
    expect(openAt(schedule, CALENDAR, at('2026-12-23', '17:00'))).toEqual(closed(null, '16:00'));
  });
});

describe('openAt with no hours, or hours of a stretch', () => {
  it('calls a day whose hours no source gives unknown, never open', () => {
    const unknown = scheduleOf({ week: { ...scheduleOf().week, weekday: null } });

    expect(openAt(unknown, CALENDAR, at('2026-11-27', '10:00'))).toEqual({ state: 'unknown' });
  });

  it('keeps a stretch with hours of its own, such as an exam period of 24 hours', () => {
    const exams = scheduleOf({
      periods: [{ from: '2026-11-24', to: '2026-12-14', week: every(range('00:00', '24:00')), note: '기말고사' }],
    });

    expect(openAt(exams, CALENDAR, at('2026-11-29', '03:00'))).toEqual({
      state: 'open',
      closesAt: null,
      closesIn: null,
    });
    expect(openAt(exams, CALENDAR, at('2026-12-14', '22:00'))).toEqual({
      state: 'open',
      closesAt: '24:00',
      closesIn: 120,
    });
    expect(openAt(exams, CALENDAR, at('2026-12-15', '03:00'))).toEqual(closed('09:00', '00:00'));
  });
});

describe('openAt past midnight', () => {
  const law = scheduleOf({ week: every(range('06:00', '01:00')), vacation: null, holiday: 'saturday' });

  it("is open after midnight by the day before's range, until its close", () => {
    expect(openAt(law, CALENDAR, at('2026-11-28', '00:30'))).toEqual({
      state: 'open',
      closesAt: '01:00',
      closesIn: 30,
    });
    expect(openAt(law, CALENDAR, at('2026-11-28', '23:00'))).toEqual({
      state: 'open',
      closesAt: '01:00',
      closesIn: 120,
    });
  });

  it('is closed from the close to the next open', () => {
    expect(openAt(law, CALENDAR, at('2026-11-28', '01:00'))).toEqual(closed('06:00', '01:00'));
  });

  it('reads the time in Korea, whatever the server runs in', () => {
    expect(openAt(law, CALENDAR, new Date('2026-11-27T15:30:00Z'))).toMatchObject({ state: 'open', closesIn: 30 });
  });
});

describe('openAt on a day the calendars do not place', () => {
  it('reads a day the holiday list does not hold, or one outside it, as a regular day', () => {
    const kwanjeong = scheduleOf({ week: every(range('07:00', '23:00')), vacation: null, lunarHolidays: 'closed' });

    expect(openAt(kwanjeong, CALENDAR, at('2026-11-27', '10:00'))).toMatchObject({ state: 'open', closesAt: '23:00' });
    expect(openAt(kwanjeong, UNPLACED, at('2027-03-02', '10:00'))).toMatchObject({ state: 'open', closesAt: '23:00' });
  });

  it('is unknown in term or vacation when their hours differ, and open when they agree', () => {
    const sinyang = scheduleOf({
      week: { weekday: range('00:00', '24:00'), saturday: null, sunday: null },
      vacation: { weekday: range('08:00', '24:00'), saturday: null, sunday: null },
      holiday: null,
    });
    const unplacedTerms: Calendar = { ...CALENDAR, terms: UNPLACED.terms };

    expect(openAt(sinyang, unplacedTerms, at('2026-11-27', '03:00'))).toEqual({ state: 'unknown' });
    expect(openAt(sinyang, unplacedTerms, at('2026-11-27', '10:00'))).toMatchObject({ state: 'open' });
  });

  it("keeps 24:00 as the close when the next day's hours are not known", () => {
    const sinyang = scheduleOf({
      week: { weekday: range('00:00', '24:00'), saturday: null, sunday: null },
      vacation: null,
    });

    expect(openAt(sinyang, CALENDAR, at('2026-11-27', '23:30'))).toEqual({
      state: 'open',
      closesAt: '24:00',
      closesIn: 30,
    });
  });
});

describe('The schedule and calendar schemas', () => {
  const valid = scheduleOf();

  it('take a close past midnight and a close of 24:00', () => {
    expect(scheduleSchema.safeParse(scheduleOf({ week: every(range('06:00', '01:00')) })).success).toBe(true);
    expect(scheduleSchema.safeParse(scheduleOf({ week: every(range('00:00', '24:00')) })).success).toBe(true);
  });

  it('refuse an empty range, an open of 24:00, a clock past 24:00 and an unknown key', () => {
    expect(scheduleSchema.safeParse(scheduleOf({ week: every(range('09:00', '09:00')) })).success).toBe(false);
    expect(scheduleSchema.safeParse(scheduleOf({ week: every(range('24:00', '06:00')) })).success).toBe(false);
    expect(scheduleSchema.safeParse(scheduleOf({ week: every(range('09:00', '25:00')) })).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...valid, term: valid.week }).success).toBe(false);
  });

  it('refuse a period that ends before it starts, and vacations that overlap', () => {
    const backwards = { from: '2026-12-14', to: '2026-11-24', week: valid.week, note: '거꾸로' };
    const overlapping = {
      ...CALENDAR,
      terms: {
        ...CALENDAR.terms,
        vacations: [
          { from: '2026-06-23', to: '2026-08-31' },
          { from: '2026-08-01', to: '2026-09-01' },
        ],
      },
    };

    expect(scheduleSchema.safeParse(scheduleOf({ periods: [backwards] })).success).toBe(false);
    expect(calendarSchema.safeParse(CALENDAR).success).toBe(true);
    expect(calendarSchema.safeParse(overlapping).success).toBe(false);
  });
});
