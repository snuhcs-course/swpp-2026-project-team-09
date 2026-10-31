/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type JudgedSession } from '../src/global-events/judgement-answer.js';
import { placedSessions } from '../src/global-events/judgement-checks.js';

function judged(start: string, passed: boolean, isNew = true): JudgedSession {
  return {
    start,
    end: null,
    place: '301동',
    overPeriod: false,
    lines: { start: [], end: [], place: [] },
    placeId: 'b',
    passed,
    globalEventId: null,
    checks: [{ name: 'newSession', passed: isNew }],
  };
}

function draft(id: string, start: string | null = null): { id: string; startsAt: Date | null } {
  return { id, startsAt: start === null ? null : new Date(`${start}:00+09:00`) };
}

const FIRST = '2026-11-05T14:00';
const SECOND = '2026-11-12T14:00';
const THIRD = '2026-11-19T14:00';

describe('placedSessions', () => {
  it('publishes one Draft with the one session that passed', () => {
    const one = judged(FIRST, true);

    expect(placedSessions([one], [draft('d')]).get(one)).toBe('d');
  });

  it('makes new events beyond the Draft', () => {
    const [one, two] = [judged(FIRST, true), judged(SECOND, true)];
    const placed = placedSessions([one, two], [draft('d')]);

    expect(placed.get(one)).toBe('d');
    expect(placed.get(two)).toBeNull();
  });

  it('keeps the only Draft when a session failed, so that the passing ones are new', () => {
    const [one, two] = [judged(FIRST, true), judged(SECOND, false)];
    const placed = placedSessions([one, two], [draft('d')]);

    expect(placed.get(one)).toBeNull();
    expect(placed.has(two)).toBe(false);
  });

  it('keeps the Draft with the start of a failing session, and takes the one with the start of a passing one', () => {
    const [one, two, three] = [judged(FIRST, true), judged(SECOND, false), judged(THIRD, true)];
    const placed = placedSessions([one, two, three], [draft('d2', SECOND), draft('d1', FIRST), draft('d3', THIRD)]);

    expect(placed.get(one)).toBe('d1');
    expect(placed.get(three)).toBe('d3');
    expect(placed.has(two)).toBe(false);
  });

  it('counts no Draft for a session that only repeats the rules', () => {
    const [repeat, one] = [judged(FIRST, false, false), judged(SECOND, true)];

    expect(placedSessions([repeat, one], [draft('d')]).get(one)).toBe('d');
  });
});

describe('placedSessions, with Drafts the worker read', () => {
  it('does not write over the time the worker read in a Draft of several', () => {
    const one = judged('2026-11-26T14:00', true);

    expect(placedSessions([one], [draft('d1', FIRST), draft('d2', SECOND)]).get(one)).toBeNull();
  });

  it('takes a Draft of several that has no start', () => {
    const one = judged(THIRD, true);

    expect(placedSessions([one], [draft('d1', FIRST), draft('d2')]).get(one)).toBe('d2');
  });

  it('takes the Draft that holds only its day', () => {
    const one = judged(FIRST, true);

    expect(placedSessions([one], [draft('d2', SECOND), draft('d1', '2026-11-05T00:00')]).get(one)).toBe('d1');
  });

  it('does not lose a Draft to two failing sessions of one start', () => {
    const [one, two, three] = [judged(FIRST, false), judged(FIRST, false), judged(SECOND, true)];

    expect(placedSessions([one, two, three], [draft('d')]).get(three)).toBeNull();
  });

  it('leaves alone a Draft the answer did not mention', () => {
    const one = judged(FIRST, true);

    expect(placedSessions([one], [draft('d1', FIRST), draft('d2', SECOND)]).get(one)).toBe('d1');
  });
});
