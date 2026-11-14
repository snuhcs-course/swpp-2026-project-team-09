/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { checkBooking } from '../src/assistant/library/booking-rules.js';
import { CATALOGUE_FILE, type Catalogue, type LibrarySpace, readCatalogue } from '../src/assistant/library/catalogue.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { fillSeat, leaveByOf, type SeatFacts } from '../src/assistant/library/seat-arrival.js';

// A seat asked for today without a start, on Wednesday 2026-11-04 in Korea. The walks, in whole minutes: 24동 to
// 관정관 4, 관정관 to 두산인문관 (8동) 4. The reading room 7F-7A-zone2 is open 07:00–23:00, in steps of 30 minutes, for
// 30 to 360 minutes.

const DATE = '2026-11-04';
const KWANJEONG = 'place-62-1';
const BUILDING_24 = 'place-24';
const DOOSAN = 'place-8';

const WALKS: Record<string, number> = {
  [`${BUILDING_24}>${KWANJEONG}`]: 4,
  [`${KWANJEONG}>${DOOSAN}`]: 4,
};

const at = (clock: string): Date => new Date(`${DATE}T${clock}:00+09:00`);

const item = (start: string, end: string, placeId: string | null, isClass = true): DayItem => ({
  id: `${start}-${placeId}`,
  name: '수업',
  start: at(start),
  end: at(end),
  placeId,
  isClass,
});

const AFTERNOON = [item('13:00', '13:50', BUILDING_24), item('16:00', '17:15', DOOSAN)];

let catalogue: Catalogue;
let seat: LibrarySpace;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
  const space = catalogue.byId.get('7F-7A-zone2');
  if (space === undefined) {
    throw new Error('No 7F-7A-zone2');
  }
  seat = space;
});

function facts(now: string, more: Partial<SeatFacts> = {}): SeatFacts {
  return {
    date: DATE,
    now: at(now),
    items: [],
    locationPlaceId: BUILDING_24,
    kwanjeongPlaceId: KWANJEONG,
    walkingMinutes: (from, to) => WALKS[`${from}>${to}`] ?? 99,
    ...more,
  };
}

describe('The design example: Wednesday 13:50, a Class in 24동 has just ended', () => {
  it('arrives at 13:54 and fills 14:00 for the longest time, 360 minutes', () => {
    const filled = fillSeat(facts('13:50', { items: AFTERNOON }), seat, {});

    expect(filled).toEqual({
      arrival: { at: '13:54', fromPlaceId: BUILDING_24, walkMinutes: 4 },
      start: '14:00',
      minutes: 360,
      note: '13:54 도착에 맞춰 최대 시간으로 채웠어요',
    });
  });

  it('sets out from the Class just ended when the request has no location', () => {
    const filled = fillSeat(facts('13:50', { items: AFTERNOON, locationPlaceId: null }), seat, {});

    expect(filled.arrival).toEqual({ at: '13:54', fromPlaceId: BUILDING_24, walkMinutes: 4 });
    expect(filled.start).toBe('14:00');
  });

  it('leaves 관정관 at 15:56 for the 16:00 Class in 두산인문관', () => {
    expect(leaveByOf(facts('13:50', { items: AFTERNOON }), '13:54', '20:00')).toEqual({
      at: '15:56',
      for: '수업',
      start: '16:00',
    });
  });
});

describe('The start', () => {
  it('is the arrival when it falls on a 30-minute mark', () => {
    expect(fillSeat(facts('13:56'), seat, {})).toMatchObject({ arrival: { at: '14:00' }, start: '14:00' });
  });

  it('is the next mark when the arrival is one minute past one', () => {
    expect(fillSeat(facts('13:57'), seat, {})).toMatchObject({
      arrival: { at: '14:01' },
      start: '14:30',
      minutes: 360,
    });
  });

  it('is the opening time for an arrival before the space opens', () => {
    expect(fillSeat(facts('06:20'), seat, {})).toMatchObject({ arrival: { at: '06:24' }, start: '07:00', minutes: 360 });
  });
});

describe('The arrival', () => {
  it('of a User in a Class until 13:50, asked at 13:40, is from the Class: 13:54, wherever the phone is', () => {
    const filled = fillSeat(facts('13:40', { items: AFTERNOON, locationPlaceId: KWANJEONG }), seat, {});

    expect(filled.arrival).toEqual({ at: '13:54', fromPlaceId: BUILDING_24, walkMinutes: 4 });
  });

  it('of a User already at 관정관 is now', () => {
    const filled = fillSeat(facts('13:50', { locationPlaceId: KWANJEONG }), seat, {});

    expect(filled).toEqual({
      arrival: { at: '13:50', fromPlaceId: KWANJEONG, walkMinutes: 0 },
      start: '14:00',
      minutes: 360,
      note: '13:50 도착에 맞춰 최대 시간으로 채웠어요',
    });
  });

  it('with no known Place is now, and the note says so', () => {
    const filled = fillSeat(facts('13:50', { locationPlaceId: null }), seat, {});

    expect(filled).toEqual({
      arrival: { at: '13:50', fromPlaceId: null, walkMinutes: null },
      start: '14:00',
      minutes: 360,
      note: '지금부터 최대 시간으로 채웠어요',
    });
  });

  it('is now when 관정관 is not among the Places', () => {
    const filled = fillSeat(facts('13:50', { kwanjeongPlaceId: null }), seat, { minutes: 60 });

    expect(filled).toMatchObject({ arrival: { at: '13:50', walkMinutes: null }, note: '지금부터 채웠어요' });
  });
});

describe('The length', () => {
  it('is cut to the closing time: an arrival at 19:10 gets 19:30 for 210 minutes', () => {
    expect(fillSeat(facts('19:06'), seat, {})).toMatchObject({ arrival: { at: '19:10' }, start: '19:30', minutes: 210 });
  });

  it('is the one the User named, and the note says it was filled for the arrival only', () => {
    expect(fillSeat(facts('13:50', { items: AFTERNOON }), seat, { minutes: 120 })).toEqual({
      arrival: { at: '13:54', fromPlaceId: BUILDING_24, walkMinutes: 4 },
      start: '14:00',
      minutes: 120,
      note: '13:54 도착에 맞춰 채웠어요',
    });
  });

  it('is up to the end the User named', () => {
    expect(fillSeat(facts('13:50'), seat, { end: '16:00' })).toMatchObject({ start: '14:00', end: '16:00' });
  });
});

describe('An arrival after the last start that fits', () => {
  it('is refused by the booking check in its words', () => {
    const filled = fillSeat(facts('22:40'), seat, {});
    expect(filled).toMatchObject({ arrival: { at: '22:44' }, start: '23:00' });

    const checked = checkBooking(catalogue, seat, { date: DATE, people: 1, ...filled }, at('22:40'));

    expect(checked).toEqual({
      refusals: [
        {
          field: 'start',
          reason: '열람실은 07:00–23:00에 이용할 수 있어요',
          bound: { open: '07:00', close: '23:00' },
        },
      ],
    });
  });
});

describe('The time to leave', () => {
  it('is for the first item with a Place that starts after the arrival and before the booking ends', () => {
    const items = [
      item('13:00', '13:50', BUILDING_24),
      item('15:00', '15:30', null, false),
      item('16:00', '17:00', DOOSAN, false),
    ];

    expect(leaveByOf(facts('13:50', { items }), '13:54', '20:00')).toEqual({ at: '15:56', for: '일정', start: '16:00' });
  });

  it('is null when nothing with a Place starts before the booking ends', () => {
    expect(leaveByOf(facts('13:50', { items: AFTERNOON }), '13:54', '16:00')).toBeNull();
  });
});
