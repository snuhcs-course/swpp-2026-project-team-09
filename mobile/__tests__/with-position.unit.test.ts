/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Position } from '@/api/types';
import { withPosition } from '@/live/live-updates';

// A Friend's position over the connection, which carries no `nearPlace` or `walkMinutes` (P06 ticket 05): those of the
// fetch stay only while the level and the Place are the ones the fetch gave.

const FETCHED: Position = {
  userId: 'min-jun',
  latitude: 37.4598,
  longitude: 126.9521,
  measuredAt: '2026-10-06T05:00:00.000Z',
  level: 'exact',
  nearPlace: '중앙도서관 본관',
  walkMinutes: 4,
};
const AT_LIBRARY: Position = { ...FETCHED, level: 'building', placeId: 'place-library' };
const MOVED = { userId: 'min-jun', latitude: 37.4605, longitude: 126.9525, measuredAt: '2026-10-06T05:00:05.000Z' };

// Partitions: the same exact level, a signal without a level, a level lowered to building, the same building, and
// another building. Expected values: the fetch's Place and walk where nothing changed, else none.
describe("withPosition keeps the fetch's Place and walk", () => {
  it.each<[string, Position, Position, string | undefined]>([
    ['at the same exact level', FETCHED, { ...MOVED, level: 'exact' }, '중앙도서관 본관'],
    ['from a signal without a level', FETCHED, MOVED, '중앙도서관 본관'],
    ['in the same building', AT_LIBRARY, { ...MOVED, level: 'building', placeId: 'place-library' }, '중앙도서관 본관'],
    [
      'not after a level lowered to building',
      FETCHED,
      { ...MOVED, level: 'building', placeId: 'place-library' },
      undefined,
    ],
    ['not in another building', AT_LIBRARY, { ...MOVED, level: 'building', placeId: 'place-62' }, undefined],
  ])('%s', (_, before, sent, nearPlace) => {
    const [position] = withPosition([before], sent);

    expect(position?.nearPlace).toBe(nearPlace);
    expect(position?.walkMinutes).toBe(nearPlace === undefined ? undefined : 4);
    expect(position?.latitude).toBe(MOVED.latitude);
    expect(position?.level).toBe(sent.level ?? before.level);
  });
});
