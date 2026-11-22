/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { kioskWalkWords } from '@/library/cards/done';

// The study answer's walk tied to the time (P01 ticket 06): after booking, the kiosk deadline with the walk there.
// The clock stands at 13:37 in Korea.

const NOW = new Date('2026-10-01T04:37:00.000Z');

describe('the kiosk deadline with the walk', () => {
  it('says when to leave while there is time', () => {
    expect(kioskWalkWords('14:07', 9, NOW)).toBe(
      '걸음 9분 · 13:58까지 출발하면 14:07 전에 좌석배정기에서 확인할 수 있어요.',
    );
  });

  it('says to leave now when little time is left', () => {
    expect(kioskWalkWords('14:07', 27, NOW)).toBe(
      '걸음 27분 · 지금 출발하면 14:07 전에 좌석배정기에서 확인할 수 있어요.',
    );
  });

  it('says plainly when the walk no longer makes it', () => {
    expect(kioskWalkWords('14:07', 40, NOW)).toBe(
      '걸음 40분이라 14:07까지 좌석배정기에 닿기 어려워요. 그때까지 확인하지 않으면 자동으로 반납돼요.',
    );
  });

  it('says nothing of the walk without its minutes or the deadline', () => {
    expect(kioskWalkWords('14:07', null, NOW)).toBeNull();
    expect(kioskWalkWords(undefined, 9, NOW)).toBeNull();
  });
});
