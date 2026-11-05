/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ClockRange, type EquipmentGroup, KWANJEONG_PLACE_NUMBER, type LibrarySpace } from './catalogue.js';

// A library card: what the phone fills from the library and acts on only when the User presses its button. The server
// fills it from the catalogue and the tool's checked input, so it holds no seat, no booking and nothing of any User's
// library account. Older apps refuse a reply with one, as they refuse any card they do not know, so it is attached only
// for a request that carries clientCapabilities ['library'].

export type LibraryAction = 'book' | 'cancel' | 'return' | 'seats' | 'myBookings';

export interface LibraryCardSpace {
  id: string;
  name: string;
  floor: number;
  placeNumber: string;
  unit: 'seat' | 'room';
  roomNo: number;
  sectorNo: number;
  // The rooms' seat numbers (the equipment group's, or the named room's, when asked); none for a seat sector.
  seatNos: number[];
  // The size of the seat sector's area_<sectorNo>.png; null for a room sector.
  mapImage: { width: number; height: number } | null;
  hours: ClockRange;
  minMinutes: number;
  maxMinutes: number;
  stepMinutes: number;
}

export interface LibraryCompanion {
  friendId: string;
  name: string;
}

// Which booking a cancel or return card looks for among the User's, on the phone.
export interface LibraryTarget {
  date?: string;
  spaceId?: string;
  start?: string;
}

export interface LibraryCard {
  kind: 'library';
  library: {
    key: string;
    action: LibraryAction;
    space: LibraryCardSpace | null;
    // YYYY-MM-DD and HH:MM in Korea.
    date: string | null;
    start: string | null;
    minutes: number | null;
    seat: string | null;
    useDesc: string | null;
    // The 사용용도 to choose from, when the card asks for it.
    useDescOptions: string[] | null;
    // The 서약서 text the card asks to agree to, for a media room.
    pledge: string | null;
    companions: LibraryCompanion[];
    questId: string | null;
    notes: string[];
    // For myBookings, the period, from date to `until`.
    until: string | null;
    target: LibraryTarget | null;
  };
}

// The card's id in the history the app sends back. It is checked against this grammar, never looked up.
export const LIBRARY_KEY_MAX = 120;

const ID = '[A-Za-z0-9-]{1,40}';
const DATE = '\\d{4}-\\d{2}-\\d{2}';
const HHMM = '\\d{4}';
const MINUTES = '\\d{1,4}';
const LABEL = '[A-Za-z0-9가-힣 ./-]{1,40}';
export const LIBRARY_KEY = new RegExp(
  [
    `book:${ID}:${DATE}:${HHMM}:${MINUTES}(?::s=${LABEL})?(?::e=${LABEL})?`,
    `seats:${ID}:${DATE}(?::${HHMM}:${MINUTES})?`,
    `cancel:(?:${ID}|-):(?:${DATE}|-):(?:${HHMM}|-)`,
    `return:(?:${ID}|-)`,
    `myBookings:${DATE}:${DATE}`,
  ]
    .map((form) => `^${form}$`)
    .join('|'),
  'u',
);

export function isLibraryKey(key: string): boolean {
  return key.length <= LIBRARY_KEY_MAX && LIBRARY_KEY.test(key);
}

function hhmm(clock: string): string {
  return clock.replace(':', '');
}

// A space as a card or the 공부공간 layer carries it; null for one the catalogue lacks the parts of.
export function cardSpace(space: LibrarySpace, seatNos: number[]): LibraryCardSpace | null {
  const { floor, unit, roomNo, sectorNo, hours } = space;
  if (floor === null || unit === null || roomNo === null || sectorNo === null || hours === null) {
    return null;
  }
  return {
    id: space.id,
    name: space.name,
    floor,
    placeNumber: KWANJEONG_PLACE_NUMBER,
    unit,
    roomNo,
    sectorNo,
    seatNos,
    mapImage: space.mapImage,
    hours,
    minMinutes: space.minMinutes,
    maxMinutes: space.maxMinutes,
    stepMinutes: space.stepMinutes,
  };
}

const EMPTY: Omit<LibraryCard['library'], 'key' | 'action'> = {
  space: null,
  date: null,
  start: null,
  minutes: null,
  seat: null,
  useDesc: null,
  useDescOptions: null,
  pledge: null,
  companions: [],
  questId: null,
  notes: [],
  until: null,
  target: null,
};

export interface BookCardInput {
  date: string;
  start: string;
  minutes: number;
  seat: string | null;
  equipment: EquipmentGroup | null;
  useDesc: string | null;
  companions: LibraryCompanion[];
  questId: string | null;
}

// The seat numbers the card picks from: the named room's, else the equipment group's, else the sector's rooms.
function seatNosOf(space: LibrarySpace, { seat, equipment }: Pick<BookCardInput, 'seat' | 'equipment'>): number[] {
  if (space.unit !== 'room') {
    return [];
  }
  const named = seat === null ? undefined : space.rooms.get(seat);
  if (named !== undefined) {
    return [named];
  }
  return equipment === null ? space.seatNos : equipment.seatNos;
}

export function bookCard(space: LibrarySpace, input: BookCardInput): LibraryCard {
  const { date, start, minutes, seat, equipment, useDesc, companions, questId } = input;
  const key = [
    `book:${space.id}:${date}:${hhmm(start)}:${minutes}`,
    ...(seat === null ? [] : [`s=${seat}`]),
    ...(equipment === null ? [] : [`e=${equipment.id}`]),
  ].join(':');
  return {
    kind: 'library',
    library: {
      ...EMPTY,
      key,
      action: 'book',
      space: cardSpace(space, seatNosOf(space, input)),
      date,
      start,
      minutes,
      seat,
      useDesc,
      useDescOptions: useDesc === null ? space.useDescOptions : null,
      pledge: space.pledge,
      companions,
      questId,
      notes: space.notes,
    },
  };
}

export function seatsCard(
  space: LibrarySpace,
  { date, start, minutes }: { date: string; start: string | null; minutes: number | null },
): LibraryCard {
  const time = start === null || minutes === null ? '' : `:${hhmm(start)}:${minutes}`;
  return {
    kind: 'library',
    library: {
      ...EMPTY,
      key: `seats:${space.id}:${date}${time}`,
      action: 'seats',
      space: cardSpace(space, space.unit === 'room' ? space.seatNos : []),
      date,
      start,
      minutes,
      notes: space.notes,
    },
  };
}

// A cancel or return card: the phone finds the booking that matches the target among the User's.
export function targetCard(
  action: 'cancel' | 'return',
  space: LibrarySpace | null,
  target: LibraryTarget,
): LibraryCard {
  const key =
    action === 'cancel'
      ? `cancel:${target.spaceId ?? '-'}:${target.date ?? '-'}:${target.start === undefined ? '-' : hhmm(target.start)}`
      : `return:${target.spaceId ?? '-'}`;
  return {
    kind: 'library',
    library: {
      ...EMPTY,
      key,
      action,
      space: space === null ? null : cardSpace(space, space.unit === 'room' ? space.seatNos : []),
      target,
    },
  };
}

export function myBookingsCard(from: string, until: string): LibraryCard {
  return {
    kind: 'library',
    library: { ...EMPTY, key: `myBookings:${from}:${until}`, action: 'myBookings', date: from, until },
  };
}

export interface BookKey {
  spaceId: string;
  date: string;
  start: string;
  minutes: number;
  seat?: string;
  equipment?: string;
}

// What a book card's key encodes, for a request the app makes from that card; null for any other key.
export function bookKeyOf(key: string): BookKey | null {
  if (!isLibraryKey(key) || !key.startsWith('book:')) {
    return null;
  }
  const [, spaceId = '', date = '', time = '', minutes = '', ...rest] = key.split(':');
  const named = (prefix: string): string | undefined =>
    rest.find((part) => part.startsWith(prefix))?.slice(prefix.length);
  const seat = named('s=');
  const equipment = named('e=');
  return {
    spaceId,
    date,
    start: `${time.slice(0, 2)}:${time.slice(2)}`,
    minutes: Number(minutes),
    ...(seat === undefined ? {} : { seat }),
    ...(equipment === undefined ? {} : { equipment }),
  };
}
