/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { checkBooking, PARTY_REFUSAL } from '../src/assistant/library/booking-rules.js';
import {
  CATALOGUE_FILE,
  type Catalogue,
  type LibrarySpace,
  readCatalogue,
} from '../src/assistant/library/catalogue.js';
import { bookCard, bookKeyOf, isLibraryKey } from '../src/assistant/library/library-card.js';
import { stayNote, studyRoomFor } from '../src/assistant/library/study-room.js';
import { windowOpening } from '../src/assistant/library/window-opening.js';

// Tuesday 2026-11-17, 10:00 in Korea: a room can be booked up to Friday 2026-11-20.
const NOW = new Date('2026-11-17T10:00:00+09:00');

let catalogue: Catalogue;
let room: LibrarySpace;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
  const found = catalogue.byId.get('4F-group-6');
  if (found === undefined) {
    throw new Error('No 4F-group-6');
  }
  room = found;
});

const roomIdFor = (people: number, from: Catalogue = catalogue): string | object => {
  const chosen = studyRoomFor(from, people);
  return 'space' in chosen ? chosen.space.id : chosen.refusal;
};

describe("A study group's room", () => {
  it.each([
    [4, '4F-group-6'],
    [6, '4F-group-6'],
    [7, '4F-group-8'],
    [8, '4F-group-8'],
  ])('is for %i people the smallest size that holds them, on the 4th floor: %s', (people, id) => {
    expect(roomIdFor(people)).toBe(id);
  });

  it('is on the 2nd floor when the 4th has no size that holds them', () => {
    const spaces = catalogue.spaces.filter(({ id }) => id !== '4F-group-6');
    const without = { spaces, byId: new Map(spaces.map((space) => [space.id, space])) };

    expect(roomIdFor(5, without)).toBe('2F-group-6');
  });

  it('is none for 3 people, who are one short of the smallest room', () => {
    expect(roomIdFor(3)).toEqual({
      field: 'friendIds',
      reason: '그룹스터디룸은 4명 이상이어야 예약할 수 있어요. 1명 더 필요해요',
      bound: { min: 4, more: 1 },
    });
  });

  it('is none for 9 people, more than a party holds', () => {
    expect(roomIdFor(9)).toEqual({ field: 'friendIds', reason: PARTY_REFUSAL, bound: 8 });
  });
});

describe('The day the booking window opens for a date', () => {
  it('is 09:00 three days before a room’s date', () => {
    expect(windowOpening(room, '2026-11-23')).toEqual(new Date('2026-11-20T09:00:00+09:00'));
  });

  it('is 09:00 of the day itself for a seat, booked on the day only', () => {
    const seat = catalogue.byId.get('7F-7A-zone2');

    expect(seat === undefined ? null : windowOpening(seat, '2026-11-23')).toEqual(
      new Date('2026-11-23T09:00:00+09:00'),
    );
  });
});

describe('A room request that waits for the booking window', () => {
  const monday = { date: '2026-11-23', start: '09:00', minutes: 180, people: 4 };

  it('is refused after the window as today unless it waits', () => {
    expect(checkBooking(catalogue, room, monday, NOW)).toEqual({
      refusals: [{ field: 'date', reason: '그룹스터디룸은 3일 뒤까지만 예약할 수 있어요', bound: '2026-11-20' }],
    });
  });

  it('is kept with its date, start and length when it waits', () => {
    expect(checkBooking(catalogue, room, monday, NOW, true)).toEqual({
      booking: { date: '2026-11-23', start: '09:00', minutes: 180, seat: null, equipment: null, useDesc: null },
    });
  });

  it('keeps every other check: a past day, the hours, and two weeks ahead at most', () => {
    expect(checkBooking(catalogue, room, { ...monday, date: '2026-11-16' }, NOW, true)).toMatchObject({
      refusals: [{ field: 'date', reason: '지난 날짜는 예약할 수 없어요' }],
    });
    expect(checkBooking(catalogue, room, { ...monday, start: '21:00' }, NOW, true)).toMatchObject({
      refusals: [{ field: 'start', reason: '그룹스터디룸은 09:00–23:00에 이용할 수 있어요' }],
    });
    expect(checkBooking(catalogue, room, { ...monday, date: '2026-12-01' }, NOW, true)).toHaveProperty('booking');
    expect(checkBooking(catalogue, room, { ...monday, date: '2026-12-02' }, NOW, true)).toEqual({
      refusals: [{ field: 'date', reason: '그룹스터디룸은 14일 뒤까지만 미리 정해 둘 수 있어요', bound: '2026-12-01' }],
    });
  });
});

describe('The card of a room request that waits for the booking window', () => {
  it('has a key that says it waits, which the request reads back', () => {
    const card = bookCard(room, {
      date: '2026-11-23',
      start: '09:00',
      minutes: 180,
      seat: null,
      equipment: null,
      useDesc: null,
      companions: [],
      questId: null,
      waitsForWindow: true,
    });

    expect(card.library.key).toBe('book:4F-group-6:2026-11-23:0900:180:wait');
    expect(isLibraryKey(card.library.key)).toBe(true);
    expect(bookKeyOf(card.library.key)).toEqual({
      spaceId: '4F-group-6',
      date: '2026-11-23',
      start: '09:00',
      minutes: 180,
      waitsForWindow: true,
    });
    expect(bookKeyOf('book:4F-group-6:2026-11-20:0900:180')).not.toHaveProperty('waitsForWindow');
  });
});

describe("A person's note on the study room's card", () => {
  const booking = { start: '15:30', end: '18:30' };

  it.each([
    ['지은', '15:19', { from: '15:30', until: '16:56' }, '지은 15:19 도착 · 16:56에 먼저 나서요'],
    ['민수', '17:01', { from: '17:01', until: '18:30' }, '민수 17:01 도착'],
    ['서준', '14:30', { from: '15:30', until: '18:30' }, '서준 14:30 도착'],
    ['나', null, { from: '15:30', until: '18:30' }, '나 15:30부터'],
    ['하은', '14:29', { from: '15:30', until: '17:00' }, '하은 15:30부터 · 17:00에 먼저 나서요'],
  ])('for %s arriving at %s reads "%s"', (name, arrival, stay, note) => {
    expect(stayNote(name, arrival, stay, booking)).toBe(note);
  });
});
