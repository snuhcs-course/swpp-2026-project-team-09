/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { minutesOfClock, PARTY_MAX, PARTY_REFUSAL, type Refusal } from './booking-rules.js';
import { type Catalogue, type LibrarySpace, statusOf } from './catalogue.js';

// The room a study group books, and the words of its card, apart from the tool that picks the time.

const FLOORS_FIRST = [4, 2];

// An arrival longer than this before the start is not when the person comes: they come for the start.
const ARRIVAL_SHOWN_MINUTES = 60;

const WEEKDAYS = '일월화수목금토';

export type GroupRoom = LibrarySpace & { capacity: { min: number; max: number } };

// The group study room sizes a party can book.
export function groupRooms({ spaces }: Catalogue): GroupRoom[] {
  return spaces.filter(
    (space): space is GroupRoom =>
      space.kind === 'group-study-room' &&
      space.unit === 'room' &&
      statusOf(space, null) === 'implemented' &&
      space.capacity !== null &&
      space.capacity.min <= PARTY_MAX,
  );
}

const floorRank = ({ floor }: LibrarySpace): number => {
  const rank = FLOORS_FIRST.indexOf(floor ?? 0);
  return rank === -1 ? FLOORS_FIRST.length : rank;
};

// The smallest group study room size whose minimum and maximum hold the people, the 4th floor before the 2nd.
export function studyRoomFor(catalogue: Catalogue, people: number): { space: LibrarySpace } | { refusal: Refusal } {
  if (people > PARTY_MAX) {
    return { refusal: { field: 'friendIds', reason: PARTY_REFUSAL, bound: PARTY_MAX } };
  }
  const rooms = groupRooms(catalogue);
  const [space] = rooms
    .filter(({ capacity }) => capacity.min <= people && capacity.max >= people)
    .toSorted((a, b) => a.capacity.max - b.capacity.max || floorRank(a) - floorRank(b));
  if (space !== undefined) {
    return { space };
  }
  const min = Math.min(...rooms.map(({ capacity }) => capacity.min));
  if (people >= min) {
    return { refusal: { field: 'friendIds', reason: `${people}명이 함께 쓸 그룹스터디룸이 없어요` } };
  }
  return {
    refusal: {
      field: 'friendIds',
      reason: `그룹스터디룸은 ${min}명 이상이어야 예약할 수 있어요. ${min - people}명 더 필요해요`,
      bound: { min, more: min - people },
    },
  };
}

// "목".
export function weekdayWord(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '';
}

// "11월 20일".
export function monthDayWords(date: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

// "지은 15:19 도착 · 16:56에 먼저 나서요": when the person comes, and when they leave before the end.
export function stayNote(
  name: string,
  arrival: string | null,
  stay: { from: string; until: string },
  booking: { start: string; end: string },
): string {
  const comes =
    arrival !== null && minutesOfClock(arrival) >= minutesOfClock(booking.start) - ARRIVAL_SHOWN_MINUTES
      ? `${arrival} 도착`
      : `${stay.from}부터`;
  const leaves = stay.until < booking.end ? ` · ${stay.until}에 먼저 나서요` : '';
  return `${name} ${comes}${leaves}`;
}
