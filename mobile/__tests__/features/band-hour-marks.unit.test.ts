/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { hourMarksOf } from '@/features/assistant/hour-marks';

// The hours marked under a time card's track (P01 ticket 44), now that its range runs from now to the place's closing
// (ticket 43): the whole hours of Korea's clock every one, two, three, four, six, eight or twelve hours, the shortest step
// that marks at most four, none within an eighth of the range of either end, where the end times stand. Expected
// values worked by hand.

const at = (clock: string, date = '2026-11-17'): string => `${date}T${clock}:00+09:00`;
const marksOf = (from: string, until: string, untilDate?: string): string[] =>
  hourMarksOf({ startAt: at(from), endAt: at(until, untilDate) }).map(({ clock }) => clock);

describe('The hours marked under the track', () => {
  // Partitions: a 16-hour range, a 13-hour, a 10-hour, a 2-hour, an hour and a quarter, less than an hour, a range
  // ending at midnight, and one off the half hours.
  it.each([
    ['16 hours, every four', '01:00', '17:00', ['04:00', '08:00', '12:00']],
    ['13 hours, every three', '10:00', '23:00', ['12:00', '15:00', '18:00', '21:00']],
    ['10 hours, every two', '12:00', '22:00', ['14:00', '16:00', '18:00', '20:00']],
    ['2 hours, every hour', '11:30', '13:30', ['12:00', '13:00']],
    ['an hour and a quarter, the one hour inside', '12:00', '13:15', ['13:00']],
    ['less than an hour, none', '12:00', '12:45', []],
  ])('over %s', (_, from, until, marks) => {
    expect(marksOf(from, until)).toEqual(marks);
  });

  it('counts the hours on Korea’s clock, past midnight too', () => {
    expect(marksOf('20:00', '02:00', '2026-11-18')).toEqual(['22:00', '00:00']);
    expect(marksOf('16:00', '24:00')).toEqual(['18:00', '20:00', '22:00']);
  });

  it('stands each mark at its share of the track', () => {
    expect(hourMarksOf({ startAt: at('01:00'), endAt: at('17:00') }).map(({ share }) => share)).toEqual([
      0.1875, 0.4375, 0.6875,
    ]);
  });
});
