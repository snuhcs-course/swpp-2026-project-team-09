/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { gather, type GatheringPerson, type PersonPart } from '../src/assistant/gathering/gathering.js';
import { at, free, item, person, place, walks, window } from './gathering-fixtures.js';

// Where the asker of a meal sets out from (P05 ticket 42), on Tuesday 2026-11-17 with the clock at 12:00. An item of
// theirs going on now, ending now, or between now and the meal is where they set out from, at its end. Otherwise they set out now,
// from their position; with none, from where nobody knows. An item that has already ended is never the origin, however
// recently: they may never have gone, or may have left long ago. A Friend is planned as before.

const NOW = at('12:00');
const travel = walks(['A', 'P', 300], ['B', 'P', 240], ['C', 'P', 180]);
const lunch = { window, now: NOW };

// The asker of a meal, with their Free Time that day and the Place their position falls in, if any.
const asker = (intervals: ReturnType<typeof free>[], locationPlaceId: string | null = null): GatheringPerson => ({
  ...person('me', intervals, locationPlaceId),
  positionOnly: true,
});

const myPart = (people: [GatheringPerson, ...GatheringPerson[]]): PersonPart | undefined =>
  gather(people, [place('cafe', 'P')], lunch, travel).fits[0]?.parts[0];

const morning = item('09:30', '10:45', 'A');

describe('The asker of a meal after a Class that ended two hours ago', () => {
  it('sets out now from their position', () => {
    expect(myPart([asker([free('12:00', '14:30', morning, null)], 'B')])).toMatchObject({
      origin: { placeId: 'B', basis: 'location' },
      readyAt: NOW,
      walkMinutes: 4,
    });
  });

  it('without a position, sets out from where nobody knows, not the Class’s 301동', () => {
    expect(myPart([asker([free('12:00', '14:30', morning, null)])])).toMatchObject({
      origin: null,
      walkMinutes: null,
    });
  });
});

describe('The asker of a meal after a Class that ended five minutes ago', () => {
  it('without a position, sets out from where nobody knows: an ended Class is never the origin', () => {
    const justEnded = item('11:00', '11:55', 'A');

    expect(myPart([asker([free('12:00', '14:30', justEnded, null)])])?.origin).toBeNull();
  });
});

describe('The asker of a meal with a Class going on, or between now and the meal', () => {
  it('in a Class until 12:15, sets out from it at its end, wherever their position is', () => {
    const going = item('11:00', '12:15', 'A');

    expect(myPart([asker([free('12:15', '14:30', going, null)], 'B')])).toMatchObject({
      origin: { placeId: 'A', basis: 'timetable' },
      readyAt: at('12:15'),
    });
  });

  it('with a Class from 12:30 to 13:00, sets out from it at 13:00', () => {
    const between = item('12:30', '13:00', 'C');

    expect(myPart([asker([free('13:00', '14:30', between, null)], 'B')])).toMatchObject({
      origin: { placeId: 'C', basis: 'timetable' },
      readyAt: at('13:00'),
    });
  });
});

describe('The asker of a meal at the minute a Class ends', () => {
  it('sets out from the Class, which keeps them there until now, without a position', () => {
    const endsNow = item('11:00', '12:00', 'A');

    expect(myPart([asker([free('12:00', '14:30', endsNow, null)])])?.origin).toEqual({
      placeId: 'A',
      basis: 'timetable',
    });
  });
});

describe('The asker of a meal with nothing that day', () => {
  it('sets out now from their position', () => {
    expect(myPart([asker([free('12:00', '14:30', null, null)], 'B')])?.origin).toEqual({
      placeId: 'B',
      basis: 'location',
    });
  });

  it('without a position, sets out from where nobody knows', () => {
    expect(myPart([asker([free('12:00', '14:30', null, null)])])?.origin).toBeNull();
  });
});

describe('A Friend, as before', () => {
  it('free now with no visible location is at the Place of a Class that ended 15 minutes ago', () => {
    const me = asker([free('12:00', '14:30', null, null)], 'B');
    const friend = person('friend', [free('12:00', '14:30', item('11:00', '11:45', 'C'), null)]);

    const parts = gather(
      [me, friend],
      [place('cafe', 'P')],
      lunch,
      walks(['B', 'P', 240], ['C', 'P', 180], ['B', 'C', 60]),
    ).fits[0]?.parts;

    expect(parts?.[1]?.origin).toEqual({ placeId: 'C', basis: 'timetable' });
  });
});
