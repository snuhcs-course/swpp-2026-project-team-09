/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { leftOutLine } from '../src/timetable-reading/reading-log.js';

// P05 ticket 90: each block a timetable reading leaves out is one WARN line with what was read of it and why.

describe('the line of a block left out', () => {
  it('names its day, start and end, the words read and why', () => {
    expect(leftOutLine({ weekday: 'friday', name: '논리설계', start: '13:00', end: '15:50', reason: 'cut' })).toBe(
      'A timetable reading left out a block: friday 13:00–15:50, "논리설계", cut: its top or bottom is hidden or fades, so its time is not sure',
    );
  });

  it('says what it could not read, and keeps a long name to one line’s length', () => {
    expect(leftOutLine({ weekday: null, name: '', start: null, end: null, reason: 'too-long' })).toBe(
      'A timetable reading left out a block: no day ?–?, no words, too-long: its text is longer than a timetable block holds',
    );
    expect(
      leftOutLine({ weekday: 'monday', name: '가'.repeat(200), start: '09:00', end: '10:15', reason: 'no-day' }),
    ).toContain(`"${'가'.repeat(60)}"`);
  });
});
