/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { onDay } from '../src/assistant/free-time/free-time.js';
import { gather, type GatheringFit, type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { type GatheringTravel } from '../src/assistant/gathering/gathering-travel.js';
import { at, free, item, person, place, window } from './gathering-fixtures.js';
import { id, readCampus, seedTravel } from './way-example.js';

// A Merging Point never makes anyone later than their own way by the shuttle (P05 ticket 39). Meeting on the way is on
// foot, so a person whose own leg by the shuttle gets them there sooner goes their own way, and without the asker nobody
// meets. A merge on foot stays as before, its 1-minute detour and its wait included.

beforeAll(() => readCampus());

const SUNDAY = '2026-11-22';
const MONDAY = '2026-11-23';
const SATURDAY = '2026-11-28';

// A lunch at SK경영관 (58동), the asker from 제1공학관 (301동) and a Friend from the building given, both free from
// 11:00, planned on Sunday at 09:00 on the seed's walking table and shuttle timing.
function lunchOn(date: string, friendFrom: string): GatheringFit | undefined {
  const lunch = { start: onDay(date, '11:00'), end: onDay(date, '14:30') };
  const at11 = (personId: string, from: string): GatheringPerson => ({
    id: personId,
    free: [{ ...lunch, previous: null, next: null }],
    locationPlaceId: null,
    chosenPlaceId: id(from),
  });
  const people: [GatheringPerson, GatheringPerson] = [at11('me', '제1공학관'), at11('friend', friendFrom)];
  const asked = { window: lunch, now: onDay(SUNDAY, '09:00') };
  return gather(people, [{ key: 'SK경영관', placeId: id('SK경영관') }], asked, seedTravel()).fits[0];
}

const ways = (fit: GatheringFit | undefined): [number | null, string][] =>
  (fit?.parts ?? []).map(({ walkMinutes, by }) => [walkMinutes, by]);

describe('A Monday lunch at SK경영관 with a Friend in 제2공학관, on the seed', () => {
  it('has no Merging Point: each takes the shuttle, 13 and 15 minutes, and the meal starts at 11:15', () => {
    const fit = lunchOn(MONDAY, '제2공학관');

    expect(fit?.meeting).toBeNull();
    expect(ways(fit)).toEqual([
      [13, 'shuttle'],
      [15, 'shuttle'],
    ]);
    expect(fit?.start).toEqual(onDay(MONDAY, '11:15'));
  });

  it('on a Saturday, with no shuttle, still meets at 301동 and walks on together, as before', () => {
    const fit = lunchOn(SATURDAY, '제2공학관');

    expect(fit?.meeting).toMatchObject({ placeId: id('제1공학관'), personIds: ['me', 'friend'] });
    expect(fit?.parts.map(({ by }) => by)).toEqual(['walk', 'walk']);
  });
});

// Hand-made ways, both ready at 12:00 with nothing after: the asker at A, the Friend at F, the place P. Only the pairs
// in `shuttle` go by the shuttle, in those minutes; every other way is on foot.
function travelWith(
  walks: Record<string, number>,
  shuttle: Record<string, number> = {},
): Pick<GatheringTravel, 'walkingSeconds' | 'travel'> {
  const minutes = (from: string, to: string): number => walks[`${from}>${to}`] ?? walks[`${to}>${from}`] ?? 99;
  return {
    walkingSeconds: (from, to) => minutes(from, to) * 60,
    travel: (from, to) => {
      const ride = shuttle[`${from}>${to}`];
      return ride === undefined
        ? { seconds: minutes(from, to) * 60, mode: 'walk' }
        : { seconds: ride * 60, mode: 'shuttle' };
    },
  };
}

const ready = (personId: string, placeId: string): GatheringPerson =>
  person(personId, [free('12:00', '14:30', item('11:00', '12:00', placeId), null)]);

const fitWith = (
  travel: Pick<GatheringTravel, 'walkingSeconds' | 'travel'>,
  people: [GatheringPerson, ...GatheringPerson[]] = [ready('me', 'A'), ready('friend', 'F')],
): GatheringFit | undefined => gather(people, [place('cafe', 'P')], { window, now: at('11:30') }, travel).fits[0];

describe('A Merging Point weighed against the shuttle', () => {
  it('is kept when it gets the Friend there as soon as their own shuttle: 12:16 either way', () => {
    // Via A, the Friend walks 4 + 12 = 16 minutes; their own shuttle takes 16, against 20 on foot.
    const fit = fitWith(travelWith({ 'F>A': 4, 'A>P': 12, 'F>P': 20 }, { 'F>P': 16 }));

    expect(fit?.meeting).toMatchObject({ placeId: 'A', personIds: ['me', 'friend'] });
    expect(fit?.start).toEqual(at('12:16'));
  });

  it('is dropped when the asker’s own shuttle is faster: each goes their own way', () => {
    // The asker's shuttle takes 6 minutes against 15 on foot; the Friend passes A with no detour.
    const fit = fitWith(travelWith({ 'F>A': 1, 'A>P': 15, 'F>P': 16 }, { 'A>P': 6 }));

    expect(fit?.meeting).toBeNull();
    expect(ways(fit)).toEqual([
      [6, 'shuttle'],
      [16, 'walk'],
    ]);
  });

  it('is dropped when the Friend’s own shuttle is faster, the asker walking 5 minutes', () => {
    // Via A, the Friend walks 10 + 5 = 15 minutes; their own shuttle takes 6.
    const fit = fitWith(travelWith({ 'F>A': 10, 'A>P': 5, 'F>P': 15 }, { 'F>P': 6 }));

    expect(fit?.meeting).toBeNull();
    expect(ways(fit)).toEqual([
      [5, 'walk'],
      [6, 'shuttle'],
    ]);
  });

  it('keeps the Friend who walks and leaves out the one whose shuttle is faster', () => {
    // G walks to P through A as F does, with no shuttle; F's own shuttle takes 6.
    const travel = travelWith({ 'F>A': 10, 'A>P': 5, 'F>P': 15, 'G>A': 2, 'G>P': 7 }, { 'F>P': 6 });

    const fit = fitWith(travel, [ready('me', 'A'), ready('friend', 'F'), ready('other', 'G')]);

    expect(fit?.meeting).toMatchObject({ placeId: 'A', personIds: ['me', 'other'] });
    expect(ways(fit)).toEqual([
      [5, 'walk'],
      [6, 'shuttle'],
      [7, 'walk'],
    ]);
  });
});

describe('A Merging Point on foot, as before', () => {
  it('is kept with a 1-minute detour, though the Friend’s own walk is a minute shorter', () => {
    const fit = fitWith(travelWith({ 'F>A': 4, 'A>P': 12, 'F>P': 15 }));

    expect(fit?.meeting).toMatchObject({ placeId: 'A', personIds: ['me', 'friend'] });
  });

  it('is kept for a walk under 10 minutes, which never weighs the shuttle', () => {
    const fit = fitWith(travelWith({ 'F>A': 2, 'A>P': 5, 'F>P': 7 }, { 'F>P': 1, 'A>P': 1 }));

    expect(fit?.meeting).toMatchObject({ placeId: 'A', personIds: ['me', 'friend'] });
  });
});
