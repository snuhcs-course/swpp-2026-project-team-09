/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type TimeBand } from '../src/assistant/dto/answer.dto.js';
import { windowBand, withBand } from '../src/assistant/gathering/no-plan-band.js';

// The band of an answer without a plan (P05 ticket 65): the window asked, from now once it has begun, and the half
// hours around it as its range.

const at = (clock: string): Date => new Date(`2061-03-01T${clock}:00+09:00`);
const said = (clock: string): string => `2061-03-01T${clock}:00+09:00`;
const LUNCH = { start: at('11:00'), end: at('14:30') };
const NO_ROWS = (): Pick<TimeBand, 'lanes'> => ({ lanes: [] });

describe('The band of an answer without a plan', () => {
  it('before the window, is the window itself', () => {
    expect(windowBand(LUNCH, at('10:05'), NO_ROWS)).toEqual({
      range: { startAt: said('11:00'), endAt: said('14:30') },
      now: said('10:05'),
      lanes: [],
      startAt: said('11:00'),
      endAt: said('14:30'),
      text: '11:00–14:30',
    });
  });

  it('within it, starts at now rounded up to the minute, its range from the half hour before', () => {
    const band = windowBand(LUNCH, new Date(`2061-03-01T12:09:30+09:00`), NO_ROWS);

    expect(band).toMatchObject({ range: { startAt: said('12:00'), endAt: said('14:30') }, startAt: said('12:10') });
    expect(band.text).toBe('12:10–14:30');
  });

  it('after it, is the window itself', () => {
    expect(windowBand(LUNCH, at('15:00'), NO_ROWS)).toMatchObject({ startAt: said('11:00'), endAt: said('14:30') });
  });

  it('of a window that ends before it starts, is the start alone', () => {
    const band = windowBand({ start: at('13:00'), end: at('12:00') }, at('10:00'), NO_ROWS);

    expect(band).toMatchObject({ startAt: said('13:00'), endAt: said('13:00'), text: '13:00–13:00' });
  });

  it('draws each row over the range', () => {
    const rows = vi.fn((from: Date, until: Date) => ({
      lanes: [{ userId: 'u', name: '나', busy: [{ startAt: from.toISOString(), endAt: until.toISOString() }] }],
    }));

    windowBand(LUNCH, at('12:40'), rows);

    expect(rows).toHaveBeenCalledWith(at('12:30'), at('14:30'));
  });

  it('is added to a no-plan answer, and to none where there is a plan', () => {
    const band = windowBand(LUNCH, at('10:00'), NO_ROWS);

    expect(withBand({ reason: 'no-fit', lines: [] }, () => band)).toEqual({ reason: 'no-fit', lines: [], band });
    expect(withBand(null, () => band)).toBeNull();
  });
});

describe('The band of an answer without a plan, given a later end', () => {
  it('reaches its range over a later end it is given, such as the item that ends the window (P05 ticket 67)', () => {
    const band = windowBand({ start: at('11:56'), end: at('12:00') }, at('11:56'), NO_ROWS, at('13:00'));

    expect(band).toMatchObject({ range: { startAt: said('11:30'), endAt: said('13:00') }, endAt: said('12:00') });
  });
});
