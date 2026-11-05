/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { scoreOf, type Standing } from '../src/assistant/aliases/alias-rules.js';
import { heldBack } from '../src/common/holdback.js';

// The score of every User's alias (P07 ticket 03), on plain standings, and which Users are held back from them. The
// rule that picks the alias is tested in alias-chain.unit.test.ts.

const NOW = new Date('2026-10-28T00:00:00Z');

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function standing(placeId: string, supporters: number, rejecters = 0): Standing {
  return { placeId, supporters, rejecters };
}

describe('the score', () => {
  it('is the supporters less the rejecters, halved every 30 days unused', () => {
    expect(scoreOf(standing('a', 5, 1), NOW, NOW)).toBe(4);
    expect(scoreOf(standing('a', 5, 1), daysBefore(30), NOW)).toBeCloseTo(2);
    expect(scoreOf(standing('a', 5, 1), daysBefore(60), NOW)).toBeCloseTo(1);
  });

  it('is 0 or less once as many accounts rejected as chose, however recent', () => {
    expect(scoreOf(standing('a', 3, 3), NOW, NOW)).toBe(0);
    expect(scoreOf(standing('a', 3, 4), NOW, NOW)).toBeLessThan(0);
  });

  it('falls under half a supporter, where an alias retires, after about 77 days unused with 3 supporters', () => {
    expect(scoreOf(standing('a', 3), daysBefore(80), NOW)).toBeLessThan(0.5);
    expect(scoreOf(standing('a', 3), daysBefore(75), NOW)).toBeGreaterThanOrEqual(0.5);
  });
});

describe('the holdback', () => {
  const ids = Array.from({ length: 10_000 }, (_, at) => `00000000-0000-4000-8000-${String(at).padStart(12, '0')}`);

  it('reads the first four bytes of the SHA-256 of the id as a big-endian number, modulo 100', () => {
    // 96 and 25 by that reading.
    expect(heldBack('00000000-0000-4000-8000-000000000000', 96)).toBe(false);
    expect(heldBack('00000000-0000-4000-8000-000000000000', 97)).toBe(true);
    expect(heldBack('11111111-1111-4111-8111-111111111111', 25)).toBe(false);
    expect(heldBack('11111111-1111-4111-8111-111111111111', 26)).toBe(true);
  });

  it('holds back nobody at 0 and everybody at 100', () => {
    expect(ids.some((id) => heldBack(id, 0))).toBe(false);
    expect(ids.every((id) => heldBack(id, 100))).toBe(true);
  });

  it('holds back about the share asked, and a larger share holds back everyone a smaller one does', () => {
    const ten = ids.filter((id) => heldBack(id, 10));
    const twenty = new Set(ids.filter((id) => heldBack(id, 20)));

    expect(ten.length).toBeGreaterThan(800);
    expect(ten.length).toBeLessThan(1200);
    expect(ten.every((id) => twenty.has(id))).toBe(true);
  });
});
