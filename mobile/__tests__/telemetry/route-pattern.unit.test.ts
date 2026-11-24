/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { routePattern } from '@/telemetry/route-breadcrumb';

// The route breadcrumb's words, from expo-router's segments: a parameter's name, never its value.

describe('routePattern', () => {
  it("keeps a parameter's name in place of its value", () => {
    expect(routePattern(['(signed-in)', 'room', '[questId]'])).toBe('/room/[questId]');
  });

  it('leaves the groups out', () => {
    expect(routePattern(['(signed-in)', '(tabs)', 'me'])).toBe('/me');
    expect(routePattern(['(signed-in)', 'me', 'friends', 'requests'])).toBe('/me/friends/requests');
  });

  it('gives the start screen as /', () => {
    expect(routePattern([])).toBe('/');
  });
});
