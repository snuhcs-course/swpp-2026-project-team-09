/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { bandRange, fixedRange, mealBounds } from '../src/assistant/free-time/band-range.js';

// The range a time card's band can be dragged over (P01 ticket 43): today from now, or the place's opening when later,
// another day from the opening, to the place's closing, at most 16 hours and never past 23:30 of its day, holding the
// span, in half hours. A band whose time is fixed is drawn around its span as before.

const DAY = '2061-03-01';
const NEXT = '2061-03-02';
const at = (clock: string, date = DAY): Date => new Date(`${date}T${clock}:00+09:00`);
const range = (from: string, until: string, date = DAY): { from: Date; until: Date } => ({
  from: at(from, date),
  until: at(until, date),
});
const span = (start: string, end: string, date = DAY): { start: Date; end: Date } => ({
  start: at(start, date),
  end: at(end, date),
});

// 관정관's hours, as the seat card draws them.
const KWANJEONG = { opens: at('07:00'), closes: at('23:00') };
const ALL_DAY = { opens: null, closes: null };

describe("A time card's range today", () => {
  it('runs from now, floored to the half hour, to the closing of a place with hours', () => {
    expect(bandRange({ now: at('10:10'), date: DAY, span: span('10:12', '13:12'), bounds: KWANJEONG })).toEqual(
      range('10:00', '23:00'),
    );
  });

  it('starts at the opening when that is later than now', () => {
    expect(bandRange({ now: at('05:10'), date: DAY, span: span('07:00', '10:00'), bounds: KWANJEONG })).toEqual(
      range('07:00', '23:00'),
    );
  });

  it('at a 24-hour place, runs 16 hours from now', () => {
    expect(bandRange({ now: at('01:10'), date: DAY, span: span('01:12', '04:12'), bounds: ALL_DAY })).toEqual(
      range('01:00', '17:00'),
    );
  });
});

describe("A time card's range at the day's end and outside the hours", () => {
  it('ends at 23:30 of its day, so that no time dropped on it reads as the next day', () => {
    expect(bandRange({ now: at('10:10'), date: DAY, span: span('10:12', '13:12'), bounds: ALL_DAY })).toEqual(
      range('10:00', '23:30'),
    );
    expect(
      bandRange({
        now: at('09:10'),
        date: DAY,
        span: span('09:12', '12:12'),
        bounds: { opens: null, closes: at('01:00', NEXT) },
      }),
    ).toEqual(range('09:00', '23:30'));
  });

  // 16 hours from 20:00 would end at 12:00 the next day.
  it('does not cross midnight where it would, ending at 23:30', () => {
    expect(bandRange({ now: at('20:10'), date: DAY, span: span('20:12', '23:12'), bounds: ALL_DAY })).toEqual(
      range('20:00', '23:30'),
    );
  });

  // A stay at a 24-hour room from 22:00, its three hours guessed, ends past midnight.
  it('holds a span that crosses midnight whole', () => {
    const late = { start: at('22:00'), end: at('01:00', NEXT) };

    expect(bandRange({ now: at('21:50'), date: DAY, span: late, bounds: ALL_DAY })).toEqual({
      from: at('21:30'),
      until: at('01:00', NEXT),
    });
  });

  it('holds a span outside the hours, whole, and stays 16 hours long at most', () => {
    expect(bandRange({ now: at('21:40'), date: DAY, span: span('22:30', '23:40'), bounds: KWANJEONG })).toEqual(
      range('21:30', '24:00'),
    );
    expect(bandRange({ now: at('05:10'), date: DAY, span: span('06:20', '08:00'), bounds: KWANJEONG })).toEqual(
      range('06:00', '22:00'),
    );
  });

  it('holds what else it must reach, such as a window the User fixed', () => {
    expect(
      bandRange({ now: at('10:10'), date: DAY, span: span('10:12', '11:00'), bounds: KWANJEONG, holds: [at('09:00')] }),
    ).toEqual(range('09:00', '23:00'));
  });
});

// A meal's bounds (P01 ticket 46): the stretch it can be eaten in, from the end of the asker's item before it, no earlier
// than the meal is served, to the start of their next item, no later than it is served. On the phone on 2026-11-28 a
// lunch's bar ran 10:30–13:00, an hour before its span to half an hour past it, and lunch could not be dragged past
// 13:00. Partitions: a Class before and after, none, now later than the item before, dinner late today, and a
// Restaurant's own window that reaches past the meal's.
const LUNCH = span('11:00', '14:30');
const DINNER = span('17:00', '19:30');
const classAt = (start: string, end: string, date = DAY): { start: Date; end: Date } => span(start, end, date);

describe("A meal's bounds and its range", () => {
  const lunch = span('11:30', '12:30', NEXT);
  const served = span('11:00', '14:30', NEXT);

  it('run from the end of a Class before to the start of a Class after, asked the day before', () => {
    const between = span('12:00', '13:00', NEXT);
    const bounds = mealBounds(between, served, [classAt('09:00', '11:40', NEXT), classAt('13:30', '15:00', NEXT)]);

    expect(bounds).toEqual({ opens: at('11:40', NEXT), closes: at('13:30', NEXT) });
    expect(bandRange({ now: at('16:01'), date: NEXT, span: between, bounds })).toEqual(range('11:30', '13:30', NEXT));
  });

  it('start when the meal is served, not at the end of a Class before it', () => {
    expect(mealBounds(lunch, served, [classAt('09:00', '10:45', NEXT)]).opens).toEqual(at('11:00', NEXT));
  });

  it('run over the whole meal with nothing before or after, so a lunch can be dragged anywhere it is served', () => {
    const bounds = mealBounds(lunch, served, []);

    expect(bandRange({ now: at('16:01'), date: NEXT, span: lunch, bounds })).toEqual(range('11:00', '14:30', NEXT));
  });

  it('hold the window the User fixed without ending at it: a lunch until 13:00 can still be dragged later', () => {
    const bounds = mealBounds(lunch, served, [classAt('09:00', '10:45', NEXT)]);
    const holds = [at('13:00', NEXT)];

    expect(bandRange({ now: at('16:01'), date: NEXT, span: lunch, bounds, holds })).toEqual(
      range('11:00', '14:30', NEXT),
    );
  });
});

describe("A meal's range today, and a Restaurant's own hours", () => {
  it('start at now today, when it is later than the item before', () => {
    const today = span('12:00', '13:00');
    const bounds = mealBounds(today, LUNCH, [classAt('09:00', '10:45')]);

    expect(bandRange({ now: at('11:50'), date: DAY, span: today, bounds })).toEqual(range('11:30', '14:30'));
  });

  it('give a late dinner what is left of it today', () => {
    const late = span('19:10', '19:30');

    expect(bandRange({ now: at('19:10'), date: DAY, span: late, bounds: mealBounds(late, DINNER, []) })).toEqual(
      range('19:00', '19:30'),
    );
  });

  it('end at the Restaurant’s own closing when it serves later than the meal’s window', () => {
    const lunch = span('11:30', '12:30', NEXT);
    const bounds = mealBounds(lunch, { start: at('11:00', NEXT), end: at('15:00', NEXT) }, []);

    expect(bounds.closes).toEqual(at('15:00', NEXT));
  });
});

describe("A time card's range on another day, and a fixed band's", () => {
  it('on another day, starts at the opening, not at now', () => {
    expect(
      bandRange({
        now: at('22:10'),
        date: NEXT,
        span: span('10:00', '13:00', NEXT),
        bounds: {
          opens: at('07:00', NEXT),
          closes: at('23:00', NEXT),
        },
      }),
    ).toEqual(range('07:00', '23:00', NEXT));
  });

  it('on another day without a known opening, starts an hour before the span', () => {
    expect(bandRange({ now: at('22:10'), date: NEXT, span: span('10:10', '13:10', NEXT), bounds: ALL_DAY })).toEqual(
      range('09:00', '23:30', NEXT),
    );
  });

  it('when the band is fixed, is around its span: from an hour before it, unless now is later, to half an hour past it', () => {
    expect(fixedRange(at('13:50'), span('14:00', '15:30'))).toEqual(range('13:30', '16:00'));
    expect(fixedRange(at('09:00'), span('14:10', '15:20'))).toEqual(range('13:00', '16:00'));
  });
});
