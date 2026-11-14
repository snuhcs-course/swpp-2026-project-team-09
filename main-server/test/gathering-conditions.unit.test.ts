/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { gather, type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { at, free, item, person, place, walks, window } from './gathering-fixtures.js';

// What the asker fixes for a person: where they set out from, when they are ready at the earliest, and when they
// must leave at the latest.

describe('A chosen origin', () => {
  const travel = walks(['A', 'P', 300], ['L', 'P', 120], ['C', 'P', 60], ['C', 'S', 60], ['S', 'P', 60]);
  const originOf = (asker: GatheringPerson, now: string): object | null =>
    gather([asker], [place('cafe', 'P')], { window, now: at(now) }, travel).fits[0]?.parts[0]?.origin ?? null;

  it('replaces the Place of the Class they are busy with until the stretch starts', () => {
    const asker = { ...person('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]), chosenPlaceId: 'C' };

    expect(originOf(asker, '11:30')).toEqual({ placeId: 'C', basis: 'chosen' });
  });

  it('replaces their location when they are free now', () => {
    const asker = {
      ...person('me', [free('11:00', '14:30', item('10:00', '11:00', 'A'), null)], 'L'),
      chosenPlaceId: 'C',
    };

    expect(originOf(asker, '12:00')).toEqual({ placeId: 'C', basis: 'chosen' });
  });

  it('makes known the origin of a person who would have none', () => {
    const asker = { ...person('me', [free('12:00', '14:30', null, null)]), chosenPlaceId: 'C' };

    expect(originOf(asker, '12:00')).toEqual({ placeId: 'C', basis: 'chosen' });
  });

  it('is walked from, a Friend merging at the asker’s chosen origin by the same rule', () => {
    // The Friend at C reaches P in 1 minute, or by S in 1 + 1: one minute longer, so they meet at S.
    const asker = { ...person('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]), chosenPlaceId: 'S' };
    const friend = person('friend', [free('12:00', '14:30', item('11:00', '12:00', 'C'), null)]);

    const [fit] = gather([asker, friend], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits;

    expect(fit).toMatchObject({
      start: at('12:02'),
      meeting: { placeId: 'S', at: at('12:01'), personIds: ['me', 'friend'] },
      parts: [{ walkMinutes: 1 }, { walkMinutes: 2 }],
    });
  });
});

describe('Not before a time', () => {
  // A Class at A until 12:00, P 5 minutes away.
  const travel = walks(['A', 'P', 300], ['L', 'P', 120]);
  const busy = person('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]);
  const partOf = (asker: GatheringPerson, now = '11:30'): object | undefined =>
    gather([asker], [place('cafe', 'P')], { window, now: at(now) }, travel).fits[0]?.parts[0];

  it('makes them ready at that time when it is later than their own', () => {
    expect(partOf({ ...busy, notBefore: at('12:10') })).toMatchObject({
      readyAt: at('12:10'),
      origin: { placeId: 'A', basis: 'timetable' },
      canArriveAt: at('12:15'),
    });
  });

  it('changes nothing when it is the time they are ready anyway', () => {
    expect(partOf({ ...busy, notBefore: at('12:00') })).toMatchObject({
      readyAt: at('12:00'),
      canArriveAt: at('12:05'),
    });
  });

  it('changes nothing when it is earlier', () => {
    expect(partOf({ ...busy, notBefore: at('11:50') })).toMatchObject({
      readyAt: at('12:00'),
      canArriveAt: at('12:05'),
    });
  });

  it('never changes where they set out from, which their own ready time decides', () => {
    // Free since 11:00 and at L now; ready only from 12:30, when they would be counted from their last Class's Place.
    const idle = person('me', [free('11:00', '14:30', item('10:00', '11:00', 'A'), null)], 'L');

    expect(partOf({ ...idle, notBefore: at('12:30') }, '12:00')).toMatchObject({
      readyAt: at('12:30'),
      origin: { placeId: 'L', basis: 'location' },
      canArriveAt: at('12:32'),
    });
  });
});

describe('Leave by a time', () => {
  // A Class at A until 12:00 and the next at B at 13:00: P is 1 minute from A and 3 from B, so they leave by 12:57.
  const travel = walks(['A', 'P', 60], ['P', 'B', 180]);
  const busy = person('me', [free('12:00', '13:00', item('11:00', '12:00', 'A'), item('13:00', '14:00', 'B'))]);
  const fitOf = (asker: GatheringPerson): object | undefined =>
    gather([asker], [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits[0];

  it('is when they leave when it is earlier than their own', () => {
    expect(fitOf({ ...busy, leaveBy: at('12:40') })).toMatchObject({
      end: at('12:40'),
      togetherMinutes: 39,
      parts: [{ leaveBy: at('12:40') }],
    });
  });

  it('changes nothing when it is their own', () => {
    expect(fitOf({ ...busy, leaveBy: at('12:57') })).toMatchObject({
      end: at('12:57'),
      parts: [{ leaveBy: at('12:57') }],
    });
  });

  it('changes nothing when it is later', () => {
    expect(fitOf({ ...busy, leaveBy: at('13:10') })).toMatchObject({
      end: at('12:57'),
      parts: [{ leaveBy: at('12:57') }],
    });
  });

  it('is their leave-by when nothing follows', () => {
    const idle = person('me', [free('12:00', '14:30', item('11:00', '12:00', 'A'), null)]);

    expect(fitOf({ ...idle, leaveBy: at('13:00') })).toMatchObject({
      end: at('13:00'),
      parts: [{ leaveBy: at('13:00'), next: null }],
    });
  });
});
