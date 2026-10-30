/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-30  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { clockWithOffset, systemClock } from '../src/quests/clock.js';

describe('clockWithOffset', () => {
  it('0 → the system clock itself', () => {
    expect(clockWithOffset(0)).toBe(systemClock);
  });

  it.each([90, -1440])('%d minutes → now moved by that much', (minutes) => {
    const moved = clockWithOffset(minutes).now().getTime() - Date.now();

    expect(Math.abs(moved - minutes * 60 * 1000)).toBeLessThan(1000);
  });
});
