/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FLING_SPEED } from '@/screens/main/answer/card-levels';
import { gripLanding } from '@/screens/main/answer/time-card-grip';

// Where the time card settles when its grip is let go (P04 ticket 61): its places lowest first are tucked, its own
// place, and open; a fling settles at the next one its way, a slower let-go at the one nearest where its speed carries
// it (a tenth of a second). Expected values: tucked 80 up, open 96 down; the index of the place.
const STOPS = [-80, 0, 96];
const TUCKED = 0;
const SHOWN = 1;
const OPEN = 2;
const FAST = FLING_SPEED + 1;

// Partitions: a slow let-go nearer each place; one carried on by its speed.
describe('a slow let-go', () => {
  it.each([
    [-60, TUCKED],
    [-30, SHOWN],
    [40, SHOWN],
    [60, OPEN],
  ] as const)('let go at %d, it settles at place %d', (at, place) => {
    expect(gripLanding(at, 0, STOPS)).toBe(place);
  });

  it('carries the let-go on by its speed', () => {
    // At 40 it is nearer its place; moving down at 400 a second it would come to 80, nearer open.
    expect(gripLanding(40, 400, STOPS)).toBe(OPEN);
  });
});

// Partitions: a fling down and up from each place and from between them; a fling past the last place.
describe('a fling', () => {
  it.each([
    [0, FAST, OPEN],
    [-80, FAST, SHOWN],
    [10, -FAST, SHOWN],
    [0, -FAST, TUCKED],
    [96, FAST, OPEN],
    [-80, -FAST, TUCKED],
  ] as const)('from %d at %d a second, it settles at place %d', (at, velocity, place) => {
    expect(gripLanding(at, velocity, STOPS)).toBe(place);
  });
});
