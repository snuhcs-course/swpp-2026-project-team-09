/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { aroundSpan, bandRange, fixedRange } from '../src/assistant/free-time/band-range.js';

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

describe("A time card's range on another day, a meal's, and a fixed band's", () => {
  // A meal's bounds are as they were before ticket 43: the stored lunch of meal-answer.unit, 12:33–13:00 asked at 11:50,
  // and the same asked at 09:00.
  it("between a meal's own bounds, runs from an hour before its span, unless now is later, to half an hour past it", () => {
    const lunch = span('12:33', '13:00');

    expect(bandRange({ now: at('11:50'), date: DAY, span: lunch, bounds: aroundSpan(lunch) })).toEqual(
      range('11:30', '13:30'),
    );
    expect(bandRange({ now: at('09:00'), date: DAY, span: lunch, bounds: aroundSpan(lunch) })).toEqual(
      range('11:30', '13:30'),
    );
  });

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
