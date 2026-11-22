/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { levelAt, rangeOf } from '@/screens/main/answer/card-levels';

// The answer card's three heights (P04 ticket 52): a drag moves one step from where it started. Expected values: the
// heights below, whose steps meet halfway at 200 (lowered to raised) and 550 (raised to full).
const HEIGHTS = { lowered: 100, raised: 300, full: 800 };
const NO_FULL = { ...HEIGHTS, full: null };

// Partitions: a drag from each height, let go past halfway to the next and short of it; a card without the full step.
describe('where a drag let go comes to', () => {
  it.each([
    ['lowered', 250, 'raised'],
    ['lowered', 150, 'lowered'],
    ['raised', 600, 'full'],
    ['raised', 500, 'raised'],
    ['raised', 150, 'lowered'],
    ['full', 500, 'raised'],
    ['full', 600, 'full'],
  ] as const)('from %s, let go at %d, it comes to %s', (start, at, level) => {
    expect(levelAt(start, at, HEIGHTS)).toBe(level);
  });

  it('stays raised after a drag up on a card without the full step', () => {
    expect(levelAt('raised', 2000, NO_FULL)).toBe('raised');
  });
});

// Partitions: each height as the start; a card without the full step.
describe('the heights a drag moves between', () => {
  it('runs one step either way from where it started', () => {
    expect(rangeOf('lowered', HEIGHTS)).toEqual({ low: 100, high: 300 });
    expect(rangeOf('raised', HEIGHTS)).toEqual({ low: 100, high: 800 });
    expect(rangeOf('full', HEIGHTS)).toEqual({ low: 300, high: 800 });
  });

  it('stops at the raised height without the full step', () => {
    expect(rangeOf('raised', NO_FULL)).toEqual({ low: 100, high: 300 });
  });
});
