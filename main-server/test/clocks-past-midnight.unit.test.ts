/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from '../src/assistant/context-lines.js';
import { NO_CONTEXT, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { planInputSchema } from '../src/assistant/dto/plan-input.dto.js';
import { onDay, shownClock } from '../src/assistant/free-time/free-time.js';
import { clockTime } from '../src/assistant/free-time/tool-parts.js';
import { readyAt } from '../src/assistant/lookup/study-plan.js';
import { asked, readStudySeed } from './study-plan-example.js';
import { ME, TUESDAY } from './way-example.js';

// A window's clock past midnight (P05 ticket 91): the app drags a band over midnight and sends the time it was let go at
// as hours past 24, counted from the input's date ("24:30" is 00:30 of the next day), since a window holds clocks and a
// clock alone cannot say its day. The main server reads it on the next day wherever it reads a window, shows it as
// "00:30" wherever it says it, and never gives the model an hour past 23. Partitions: the reading; the schema, the app's
// and the model's; the study plan's real times and words; the model's context.

const WEDNESDAY = '2026-11-18';
const PAST_MIDNIGHT = /(?<![:\d])(?:24:(?!00)\d\d|(?:2[5-9]|3\d|4[0-7]):\d\d)(?![:\d])/u;

// A study input on Tuesday with the window given.
const study = (window: StudyInput['window']): StudyInput => ({
  kind: 'study',
  date: TUESDAY,
  what: 'any',
  people: [{ userId: ME, constraints: [] }],
  together: false,
  window,
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
});

describe('A window clock past midnight', () => {
  it('is read on the next day', () => {
    expect(onDay(TUESDAY, '24:30')).toEqual(onDay(WEDNESDAY, '00:30'));
    expect(onDay(TUESDAY, '47:59')).toEqual(onDay(WEDNESDAY, '23:59'));
    expect(onDay(TUESDAY, '24:00')).toEqual(onDay(WEDNESDAY, '00:00'));
    expect(onDay(TUESDAY, '13:05')).toEqual(new Date('2026-11-17T13:05:00+09:00'));
  });

  // "24:00" is the end of today in the model's own clocks (`clockTime`; the tools give it as a day's end): it comes back
  // to the model as it wrote it, never as "00:00", the start of today.
  it('keeps 24:00, the end of the day, as it is', () => {
    expect(shownClock('24:00')).toBe('24:00');
    expect(
      contextLines({ ...NO_CONTEXT, conditions: study({ from: '22:00', until: '24:00' }), planId: null })[0],
    ).toContain('"from":"22:00","until":"24:00"');
  });

  it('is shown on its own day', () => {
    expect(['24:30', '47:59', '23:30', '09:00'].map((clock) => shownClock(clock))).toEqual([
      '00:30',
      '23:59',
      '23:30',
      '09:00',
    ]);
  });

  it("is taken in the app's window, also across midnight, but never from the model", () => {
    expect(planInputSchema.safeParse(study({ from: '23:30', until: '24:30' })).success).toBe(true);
    expect(planInputSchema.safeParse(study({ from: '24:04', until: '27:04' })).success).toBe(true);
    expect(planInputSchema.safeParse(study({ from: null, until: '48:00' })).success).toBe(false);
    expect(clockTime.safeParse('24:30').success).toBe(false);
  });
});

describe('A study plan asked at 23:30 to end at 00:30', () => {
  beforeAll(readStudySeed);

  it('ends at 00:30 of the next day, and says "00:30까지"', () => {
    const answer = asked({ clock: '23:30', window: { from: null, until: '24:30' } });
    const [first] = answer.plans;

    expect(first?.endAt).toBe(`${WEDNESDAY}T00:30:00+09:00`);
    expect(first?.band.endAt).toBe(`${WEDNESDAY}T00:30:00+09:00`);
    expect(answer.chips.find(({ kind }) => kind === 'until')?.text).toBe('00:30까지');
    // The conditions come back as the app sent them; nothing the answer says or draws holds a clock past 24:00 (a
    // place's hours may end at "24:00").
    expect(JSON.stringify({ ...answer, input: null })).not.toMatch(PAST_MIDNIGHT);
  });

  it('sets out no earlier than 00:30 when its start is past midnight', () => {
    const input = { date: TUESDAY, window: { from: '24:30', until: null } };

    expect(readyAt(input, onDay(TUESDAY, '23:30'))).toEqual(onDay(WEDNESDAY, '00:30'));
  });
});

describe("The model's context", () => {
  it('reads a clock past midnight as the clock it is', () => {
    const conditions = study({ from: '23:30', until: '24:30' });
    const [line] = contextLines({ ...NO_CONTEXT, conditions, planId: '중앙도서관' });

    expect(line).toContain('"from":"23:30","until":"00:30"');
    expect(line).not.toContain('24:30');
  });
});
