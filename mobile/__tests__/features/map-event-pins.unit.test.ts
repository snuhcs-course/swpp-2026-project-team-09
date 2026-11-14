/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: a Favorite Event or not; held today, before or after; one day, several days on the first, a middle and
// the last day; either side of midnight in Korea, which is 15:00 in UTC the day before. Expected values: ticket P06-01's
// rule, in Korea's time.

import { event } from '../support/map-sources';
import { eventPins } from '@/features/map/event-pins';

// Tuesday 6 October 2026, 13:00 in Korea.
const NOW = new Date('2026-10-06T13:00:00+09:00');

function looks(events: Parameters<typeof eventPins>[0], now = NOW): [string, string][] {
  return eventPins(events, now).map(({ event: { id }, look }) => [id, look]);
}

describe('eventPins of events of one day', () => {
  it('keeps an event held today as plain, and none held another day', () => {
    const events = [
      event('yesterday', { startsAt: '2026-10-05T18:00:00+09:00' }),
      event('today', { startsAt: '2026-10-06T18:00:00+09:00', endsAt: '2026-10-06T20:00:00+09:00' }),
      event('tomorrow', { startsAt: '2026-10-07T09:00:00+09:00' }),
    ];

    expect(looks(events)).toEqual([['today', 'plain']]);
  });

  it('keeps a Favorite Event of another day with the star, and gives the star to one held today', () => {
    const events = [
      event('next-week', { startsAt: '2026-10-14T18:00:00+09:00', favorite: true }),
      event('today', { favorite: true }),
    ];

    expect(looks(events)).toEqual([
      ['next-week', 'favorite'],
      ['today', 'favorite'],
    ]);
  });

  it('keeps the events in the order they came', () => {
    const events = [event('b'), event('a', { favorite: true }), event('c')];

    expect(looks(events).map(([id]) => id)).toEqual(['b', 'a', 'c']);
  });
});

describe('eventPins of an event of several days', () => {
  const festival = event('festival', { startsAt: '2026-10-05T10:00:00+09:00', endsAt: '2026-10-09T18:00:00+09:00' });

  it.each([
    ['its first day', '2026-10-05T12:00:00+09:00', [['festival', 'plain']]],
    ['a day between', '2026-10-07T12:00:00+09:00', []],
    ['its last day', '2026-10-09T12:00:00+09:00', [['festival', 'plain']]],
  ])('on %s → %j', (_, now, expected) => {
    expect(looks([festival], new Date(now))).toEqual(expected);
  });

  it('keeps it every day while it is a Favorite Event', () => {
    expect(looks([{ ...festival, favorite: true }], new Date('2026-10-07T12:00:00+09:00'))).toEqual([
      ['festival', 'favorite'],
    ]);
  });
});

describe('eventPins at midnight in Korea', () => {
  // 00:10 on 7 October in Korea is still 6 October in UTC.
  const afterMidnight = new Date('2026-10-07T00:10:00+09:00');

  it('counts the day in Korea, not in UTC', () => {
    const events = [
      event('last-night', { startsAt: '2026-10-06T23:30:00+09:00' }),
      event('this-morning', { startsAt: '2026-10-07T09:00:00+09:00' }),
    ];

    expect(looks(events, afterMidnight)).toEqual([['this-morning', 'plain']]);
  });

  it('keeps an event that began yesterday and ends today, on its last day', () => {
    const overnight = event('overnight', {
      startsAt: '2026-10-06T22:00:00+09:00',
      endsAt: '2026-10-07T02:00:00+09:00',
    });

    expect(looks([overnight], afterMidnight)).toEqual([['overnight', 'plain']]);
  });

  it('keeps an event of today until the last minute of the day', () => {
    const lastMinute = new Date('2026-10-06T23:59:00+09:00');

    expect(looks([event('today')], lastMinute)).toEqual([['today', 'plain']]);
  });
});
