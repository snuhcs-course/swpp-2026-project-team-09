/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: a Favorite Event or not; held today or another day; the interest marks choosing or not. Expected values:
// the agentic map design's rule, that the everyday map keeps the events the User starred and puts no other event on
// it, and, while the marks choose, every event for them to choose from.

import { event } from '../support/map-sources';
import { eventPins } from '@/features/map/event-pins';

function looks(events: Parameters<typeof eventPins>[0], forInterestMarks = false): [string, string][] {
  return eventPins(events, forInterestMarks).map(({ event: { id }, look }) => [id, look]);
}

describe('eventPins', () => {
  it('keeps a Favorite Event with the star, held today or on another day', () => {
    const events = [
      event('today', { startsAt: '2026-10-06T18:00:00+09:00', favorite: true }),
      event('next week', { startsAt: '2026-10-13T09:00:00+09:00', favorite: true }),
    ];

    expect(looks(events)).toEqual([
      ['today', 'favorite'],
      ['next week', 'favorite'],
    ]);
  });

  it('keeps no other event, not even one held today', () => {
    const events = [
      event('today', { startsAt: '2026-10-06T18:00:00+09:00' }),
      event('tomorrow', { startsAt: '2026-10-07T09:00:00+09:00' }),
    ];

    expect(looks(events)).toEqual([]);
  });

  it('keeps the events in the order they came', () => {
    const events = [event('b', { favorite: true }), event('a'), event('c', { favorite: true })];

    expect(looks(events)).toEqual([
      ['b', 'favorite'],
      ['c', 'favorite'],
    ]);
  });

  it('passes every event on while the interest marks choose, a Favorite Event with the star', () => {
    const events = [event('starred', { favorite: true }), event('tomorrow', { startsAt: '2026-10-07T09:00:00+09:00' })];

    expect(looks(events, true)).toEqual([
      ['starred', 'favorite'],
      ['tomorrow', 'plain'],
    ]);
  });
});
