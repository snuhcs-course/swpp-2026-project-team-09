/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { confirmWords } from '@/library/cards/done';

// The booked ticket's one line (P01 tickets 06 and 15): the time to confirm the seat at the 좌석배정기, with the walk
// there when it is known. The clock stands at 13:37 in Korea on 2026-10-01.

const NOW = new Date('2026-10-01T04:37:00.000Z');
const TODAY = { date: '2026-10-01', clock: '14:07' };

describe("the booked ticket's confirm line", () => {
  it('says when to leave while there is time', () => {
    expect(confirmWords(TODAY, 9, NOW)).toBe('13:58 출발 · 14:07까지 좌석배정기 확인');
  });

  it('says to leave now when little time is left', () => {
    expect(confirmWords(TODAY, 27, NOW)).toBe('지금 출발 · 14:07까지 좌석배정기 확인');
  });

  it('says plainly when the walk no longer makes it', () => {
    expect(confirmWords(TODAY, 40, NOW)).toBe('14:07까지 좌석배정기에 닿기 어려워요');
  });

  it('says the time alone without the walk', () => {
    expect(confirmWords(TODAY, null, NOW)).toBe('14:07까지 좌석배정기에서 확인해요');
  });

  it("says the day of a booking on another day, and leaves the walk out: it is not today's", () => {
    expect(confirmWords({ date: '2026-10-02', clock: '07:30' }, 9, NOW)).toBe('내일 07:30까지 좌석배정기에서 확인해요');
  });
});
