/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { qualifies, topOf } from '../eval/replay/counted-aliases.ts';
import { scoreOf, type Standing } from '../src/assistant/aliases/alias-rules.js';

// Ticket 03's count rule, the baseline stage C of the replay (P07 ticket 06), on plain standings.

const NOW = new Date('2026-10-28T00:00:00Z');

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function standing(placeId: string, supporters: number, rejecters = 0): Standing {
  return { placeId, supporters, rejecters };
}

describe('the top Place', () => {
  it('is the one most accounts chose, fewer rejecters and then the id breaking a tie', () => {
    expect(topOf([standing('b', 2), standing('a', 5), standing('c', 3)])?.placeId).toBe('a');
    expect(topOf([standing('a', 4, 1), standing('b', 4, 0)])?.placeId).toBe('b');
    expect(topOf([standing('b', 4), standing('a', 4)])?.placeId).toBe('a');
    expect(topOf([])).toBeUndefined();
  });
});

describe('promotion by the count', () => {
  it('takes at least 3 distinct accounts', () => {
    expect(qualifies(standing('a', 2), 2, 2)).toBe(false);
    expect(qualifies(standing('a', 3), 3, 3)).toBe(true);
  });

  it('takes at least 0.8 of the accounts that chose anything for the words', () => {
    expect(qualifies(standing('a', 3), 4, 3)).toBe(false);
    expect(qualifies(standing('a', 4), 5, 4)).toBe(true);
    expect(qualifies(standing('a', 12), 15, 12)).toBe(true);
  });

  it('takes a score of at least half a supporter', () => {
    expect(qualifies(standing('a', 3, 3), 3, 0)).toBe(false);
    expect(qualifies(standing('a', 3), 3, scoreOf(standing('a', 3), daysBefore(80), NOW))).toBe(false);
    expect(qualifies(standing('a', 3), 3, scoreOf(standing('a', 3), daysBefore(75), NOW))).toBe(true);
  });
});
