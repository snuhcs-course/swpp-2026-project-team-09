/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The check of the reply to a late report: the main server's way for 민수 5 minutes late in the worked example is
// accepted; no way, or a way of another shape, is not. Expected values: main-server `plans/late.controller.ts`.

import { LATE_WAY } from '@/api/mock/data/late-way';
import { isLateWay } from '@/api/server/late-client';

describe('the check of a late report’s reply', () => {
  it("accepts the main server's way", () => {
    expect(isLateWay(LATE_WAY)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a way without its scene', { ...LATE_WAY, scene: undefined }],
    ['a way of another status', { ...LATE_WAY, status: 'late' }],
  ])('refuses %s', (_label, value) => {
    expect(isLateWay(value)).toBe(false);
  });
});
