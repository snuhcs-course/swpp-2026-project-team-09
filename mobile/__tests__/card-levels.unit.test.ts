/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FLING_SPEED, landingOf, stepsOf } from '@/screens/main/answer/card-levels';

// The answer sheet's three steps and where a let-go lands (P04 ticket 61): a fling lands on the next step in its
// direction, a slower let-go on the step nearest where it would come to, and from low one more drag down or a fling
// closes the answer. Expected values: the heights below; a let-go carries on a tenth of a second of its speed, and from
// low the answer closes past half the card (CLOSE_AT).
const HEIGHTS = { low: 100, mid: 300, high: 600 };
const CLOSE_AT = 80;
const SLOW = 0;
const FAST = FLING_SPEED + 1;

function land(
  start: 'low' | 'mid' | 'high',
  at: number,
  velocity: number,
  heights = HEIGHTS,
): ReturnType<typeof landingOf> {
  return landingOf({ start, at, velocity, heights, closeAt: CLOSE_AT, closable: true });
}

// Partitions: a slow let-go nearer each step; a let-go carried on by its speed; from each step.
describe('where a slow let-go lands', () => {
  it.each([
    ['low', 180, 'low'],
    ['low', 220, 'mid'],
    ['mid', 440, 'mid'],
    ['mid', 460, 'high'],
    ['high', 460, 'high'],
    ['high', 190, 'low'],
  ] as const)('from %s, let go at %d, it lands at %s', (start, at, level) => {
    expect(land(start, at, SLOW)).toBe(level);
  });

  it('carries the let-go point on by its speed', () => {
    // At 180 it is nearer low; moving up at 400 a second it would come to 220, nearer mid.
    expect(land('low', 180, -400)).toBe('mid');
  });
});

// Partitions: a fling up and down from each step and from between steps; a fling past the last step.
describe('where a fling lands', () => {
  it.each([
    ['low', 120, -FAST, 'mid'],
    ['mid', 320, -FAST, 'high'],
    ['mid', 280, -FAST, 'mid'],
    ['high', 580, FAST, 'mid'],
    ['mid', 280, FAST, 'low'],
    ['high', 600, -FAST, 'high'],
  ] as const)('from %s at %d, a fling at %d lands at %s', (start, at, velocity, level) => {
    expect(land(start, at, velocity)).toBe(level);
  });
});

// Partitions: from low a slow drag past and short of the close point, a fling down; from a higher step dragged below
// low; a card that cannot close.
describe('closing from low', () => {
  it('closes past the close point and stays short of it', () => {
    expect(land('low', 10, SLOW)).toBe('close');
    expect(land('low', 40, SLOW)).toBe('low');
  });

  it('closes on a fling down from low', () => {
    expect(land('low', 90, FAST)).toBe('close');
  });

  it('never closes from a drag that started higher', () => {
    expect(land('mid', 10, FAST)).toBe('low');
  });

  it('stays at low on a card that cannot close', () => {
    expect(
      landingOf({ start: 'low', at: 10, velocity: FAST, heights: HEIGHTS, closeAt: CLOSE_AT, closable: false }),
    ).toBe('low');
  });
});

// Partitions: three heights; a card shorter than mid; a card shorter than low.
describe('a card shorter than a step', () => {
  const SHORT = { low: 100, mid: 140, high: 140 };
  const TINY = { low: 60, mid: 60, high: 60 };

  it('keeps only the steps of different heights', () => {
    expect(stepsOf(HEIGHTS)).toEqual(['low', 'mid', 'high']);
    expect(stepsOf(SHORT)).toEqual(['low', 'mid']);
    expect(stepsOf(TINY)).toEqual(['low']);
  });

  it('lands on the steps it has', () => {
    expect(land('low', 130, -FAST, SHORT)).toBe('mid');
    expect(land('mid', 140, -FAST, SHORT)).toBe('mid');
    expect(land('low', 60, -FAST, TINY)).toBe('low');
  });
});
