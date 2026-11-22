/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData } from '@/api/assistant-types';
import { withLibraryDefaults } from '@/api/server/library-card-answers';

// A seat card whose start the server filled from the User's arrival at 관정관 (P01 ticket 06, P05's PR 496): the
// app keeps its arrival and leave-by when they are well formed, and leaves them out otherwise.

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a card as the server sends it, its other fields left out
const CARD = { key: 'book:7F-7A-zone2:2026-10-01:1400:60', action: 'book' } as LibraryCardData;

describe('a seat card with its arrival', () => {
  it('keeps the arrival and the leave-by', () => {
    const card = withLibraryDefaults({
      ...CARD,
      arrival: { at: '13:51', walkMinutes: 9, from: '301동' },
      leaveBy: '16:35',
    });

    expect(card.arrival).toEqual({ at: '13:51', walkMinutes: 9, from: '301동' });
    expect(card.leaveBy).toBe('16:35');
  });

  it('keeps a leave-by of null, when nothing follows', () => {
    expect(withLibraryDefaults({ ...CARD, leaveBy: null }).leaveBy).toBeNull();
  });

  it('leaves out a malformed arrival, and both on a card without them', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a malformed arrival, as a server might send it
    const odd = { ...CARD, arrival: { at: '13:51', walkMinutes: '9', from: '301동' } } as unknown as LibraryCardData;

    expect(withLibraryDefaults(odd).arrival).toBeUndefined();
    expect(withLibraryDefaults(CARD)).not.toHaveProperty('arrival');
    expect(withLibraryDefaults(CARD)).not.toHaveProperty('leaveBy');
  });
});
