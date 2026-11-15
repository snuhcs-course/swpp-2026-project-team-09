/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: a Favorite Event or not; held today, before or after; one day, several days on the first, a middle and
// the last day; either side of midnight in Korea, which is 15:00 in UTC the day before. For New Events: published
// within 24 hours, at the edge or before, or never recorded; checked or not; its card open or not. Expected values:
// tickets P06-01's and P06-02's rules, in Korea's time.

import { event } from '../support/map-sources';
import { type EventChecks, eventPins, strongestLook } from '@/features/map/event-pins';

// Tuesday 6 October 2026, 13:00 in Korea.
const NOW = new Date('2026-10-06T13:00:00+09:00');

function looks(events: Parameters<typeof eventPins>[0], now = NOW, checks?: EventChecks): [string, string][] {
  return eventPins(events, now, checks).map(({ event: { id }, look }) => [id, look]);
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

describe('eventPins of New Events', () => {
  // Next week, so that only being new keeps it on the map.
  const later = { startsAt: '2026-10-14T18:00:00+09:00' };

  it.each([
    ['a minute ago', '2026-10-06T12:59:00+09:00', [['fresh', 'new']]],
    ['a minute short of 24 hours ago', '2026-10-05T13:01:00+09:00', [['fresh', 'new']]],
    ['24 hours ago to the minute', '2026-10-05T13:00:00+09:00', []],
    ['a day and a minute ago', '2026-10-05T12:59:00+09:00', []],
  ])('published %s → %j', (_, publishedAt, expected) => {
    expect(looks([event('fresh', { ...later, publishedAt })])).toEqual(expected);
  });

  it('never marks an event published before the main server recorded it', () => {
    expect(looks([event('older', { ...later, publishedAt: null })])).toEqual([]);
  });

  it('leaves a checked one off the map, unless it is a Favorite Event or held today', () => {
    const publishedAt = '2026-10-06T09:00:00+09:00';
    const events = [
      event('later', { ...later, publishedAt }),
      event('starred', { ...later, publishedAt, favorite: true }),
      event('today', { publishedAt }),
    ];

    expect(looks(events, NOW, { checked: new Set(['later', 'starred', 'today']), open: null })).toEqual([
      ['starred', 'favorite'],
      ['today', 'plain'],
    ]);
  });

  it('keeps a checked one whose card is open, plain, until the card closes', () => {
    const fresh = event('fresh', { ...later, publishedAt: '2026-10-06T09:00:00+09:00' });

    expect(looks([fresh], NOW, { checked: new Set(['fresh']), open: 'fresh' })).toEqual([['fresh', 'plain']]);
    expect(looks([fresh], NOW, { checked: new Set(['fresh']), open: null })).toEqual([]);
  });

  it('keeps an unchecked one new while its card is open', () => {
    const fresh = event('fresh', { ...later, publishedAt: '2026-10-06T09:00:00+09:00' });

    expect(looks([fresh], NOW, { checked: new Set(), open: 'fresh' })).toEqual([['fresh', 'new']]);
  });

  it('gives the exclamation mark before the star and the plain pin', () => {
    const publishedAt = '2026-10-06T09:00:00+09:00';

    expect(looks([event('both', { publishedAt, favorite: true })])).toEqual([['both', 'new']]);
  });
});

describe('strongestLook', () => {
  it.each([
    [['plain', 'favorite', 'new'], 'new'],
    [['plain', 'favorite'], 'favorite'],
    [['plain', 'plain'], 'plain'],
    [[], null],
  ] as const)('of %j is %j', (given, expected) => {
    expect(strongestLook(given)).toBe(expected);
  });
});
