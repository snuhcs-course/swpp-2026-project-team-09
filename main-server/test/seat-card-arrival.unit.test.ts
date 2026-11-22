/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { CATALOGUE_FILE, type LibrarySpace, readCatalogue } from '../src/assistant/library/catalogue.js';
import { bookCard } from '../src/assistant/library/library-card.js';
import { cardArrival, fillSeat, type SeatFacts, type SeatSpace } from '../src/assistant/library/seat-arrival.js';

// The arrival a seat's card carries when the server filled its start from when the User arrives at 관정관 (P05 ticket
// 35), on Wednesday 2026-11-04: from now, from the end of the item the User is in, and from the opening. None when
// where the User sets out from is not known. 24동 is 4 minutes on foot from 관정관.

const DATE = '2026-11-04';
const KWANJEONG = 'place-62-1';
const BUILDING_24 = 'place-24';

const at = (clock: string): Date => new Date(`${DATE}T${clock}:00+09:00`);

const item = (start: string, end: string, isClass = true): DayItem => ({
  id: start,
  name: '수업',
  start: at(start),
  end: at(end),
  placeId: BUILDING_24,
  isClass,
});

const nameOf = (placeId: string): string | null => (placeId === BUILDING_24 ? '24동' : null);

let seat: LibrarySpace & SeatSpace;

beforeAll(async () => {
  const space = (await readCatalogue(CATALOGUE_FILE)).byId.get('7F-7A-zone2');
  if (space === undefined || space.hours === null) {
    throw new Error('No 7F-7A-zone2');
  }
  seat = { ...space, hours: space.hours };
});

function facts(now: string, more: Partial<SeatFacts> = {}): SeatFacts {
  return {
    date: DATE,
    now: at(now),
    items: [],
    locationPlaceId: BUILDING_24,
    kwanjeongPlaceId: KWANJEONG,
    walkingMinutes: (from, to) => (from === BUILDING_24 && to === KWANJEONG ? 4 : 99),
    ...more,
  };
}

const arrivalOf = (given: SeatFacts): ReturnType<typeof cardArrival> =>
  cardArrival(fillSeat(given, seat, {}), given, nameOf);

describe('The arrival on a filled seat’s card', () => {
  it('from now: where the User is, 4 minutes away', () => {
    expect(arrivalOf(facts('13:50', { items: [item('13:00', '13:50')] }))).toEqual({
      at: '13:54',
      walkMinutes: 4,
      from: { place: '24동', endsAt: null, kind: null },
      opensAt: null,
    });
  });

  it('from the end of the Class the User is in when asked', () => {
    expect(arrivalOf(facts('13:40', { items: [item('13:00', '13:50')] }))).toEqual({
      at: '13:54',
      walkMinutes: 4,
      from: { place: '24동', endsAt: '13:50', kind: '수업' },
      opensAt: null,
    });
  });

  it('from the end of an item that is not a Class, called 일정', () => {
    expect(arrivalOf(facts('13:40', { items: [item('13:00', '13:50', false)] }))?.from).toEqual({
      place: '24동',
      endsAt: '13:50',
      kind: '일정',
    });
  });

  it('from the opening, for an arrival before the space opens', () => {
    expect(arrivalOf(facts('06:30'))).toEqual({
      at: '06:34',
      walkMinutes: 4,
      from: { place: '24동', endsAt: null, kind: null },
      opensAt: '07:00',
    });
  });
});

describe('No arrival on the card', () => {
  it('when where the User sets out from is not known, the seat being filled from now', () => {
    expect(arrivalOf(facts('13:50', { locationPlaceId: null }))).toBeNull();
  });

  it('when 관정관 is not among the Places', () => {
    expect(arrivalOf(facts('13:50', { kwanjeongPlaceId: null }))).toBeNull();
  });

  it('when the Place set out from has no name', () => {
    expect(arrivalOf(facts('13:50', { locationPlaceId: 'place-unnamed' }))).toBeNull();
  });
});

describe('A book card', () => {
  const booking = {
    date: DATE,
    start: '14:00',
    minutes: 360,
    seat: null,
    equipment: null,
    useDesc: null,
    companions: [],
    questId: null,
  };

  it('holds no arrival and no leaveBy key when none is given, as when the User gave the start', () => {
    const { library } = bookCard(seat, booking);

    expect(library).not.toHaveProperty('arrival');
    expect(library).not.toHaveProperty('leaveBy');
  });

  it('holds the arrival and leaveBy given, leaveBy null when nothing follows', () => {
    const arrival = { at: '13:54', walkMinutes: 4, from: { place: '24동', endsAt: null, kind: null }, opensAt: null };

    const { library } = bookCard(seat, { ...booking, arrival, leaveBy: null });

    expect(library).toMatchObject({ arrival, leaveBy: null });
  });
});
