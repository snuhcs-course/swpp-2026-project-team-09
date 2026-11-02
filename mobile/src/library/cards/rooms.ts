/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryRoomTimes } from '../replies';
import { clockOf, minutesOf, siteInstant, STEP_MINUTES } from './times';

// The rooms of a room sector on a date, as getRoomList lists them: ABLETIME holds each free 30-minute start, such as
// "2026-11-02 17:30:00".

// The free starts of a room on `date`, as minutes of the day.
function freeStarts(room: LibraryRoomTimes, date: string): Set<number> {
  const starts = room.ABLETIME.split(',')
    .map((text) => siteInstant(text.trim()))
    .filter((instant) => instant.date === date)
    .map(({ clock }) => minutesOf(clock));
  return new Set(starts);
}

// Whether every 30-minute step from `start` for `minutes` is free in the room.
export function roomCovers(room: LibraryRoomTimes, date: string, start: string, minutes: number): boolean {
  const free = freeStarts(room, date);
  const from = minutesOf(start);
  for (let step = from; step < from + minutes; step += STEP_MINUTES) {
    if (!free.has(step)) {
      return false;
    }
  }
  return minutes > 0;
}

// The rooms of the card: the sector's, or the equipment group's when the card names its rooms.
export function roomsOf(rooms: readonly LibraryRoomTimes[], seatNos: readonly number[]): LibraryRoomTimes[] {
  return seatNos.length === 0 ? [...rooms] : rooms.filter(({ SEATNO }) => seatNos.includes(Number(SEATNO)));
}

// The card's rooms free for the whole slot, in the site's order.
export function freeRooms(
  rooms: readonly LibraryRoomTimes[],
  seatNos: readonly number[],
  slot: { date: string; start: string; minutes: number },
): LibraryRoomTimes[] {
  return roomsOf(rooms, seatNos).filter((room) => roomCovers(room, slot.date, slot.start, slot.minutes));
}

// When no room is free for the slot: the starts that day, nearest to the asked one first, at which some room of the
// card is free for as long, none before `earliest` ("HH:MM").
export function nearestStarts(
  rooms: readonly LibraryRoomTimes[],
  seatNos: readonly number[],
  slot: { date: string; start: string; minutes: number; earliest: string },
  most = 4,
): string[] {
  const own = roomsOf(rooms, seatNos);
  const asked = minutesOf(slot.start);
  const starts = new Set(own.flatMap((room) => [...freeStarts(room, slot.date)]));
  return [...starts]
    .filter((start) => start >= minutesOf(slot.earliest) && start !== asked)
    .filter((start) => own.some((room) => roomCovers(room, slot.date, clockOf(start), slot.minutes)))
    .toSorted((one, other) => Math.abs(one - asked) - Math.abs(other - asked) || one - other)
    .slice(0, most)
    .toSorted((one, other) => one - other)
    .map((start) => clockOf(start));
}

// A room's free stretches that day, as "09:00–12:30" each, for the seats card of a room sector.
export function freeStretches(room: LibraryRoomTimes, date: string): string[] {
  const starts = [...freeStarts(room, date)].toSorted((one, other) => one - other);
  const stretches: [number, number][] = [];
  for (const start of starts) {
    const last = stretches.at(-1);
    if (last?.[1] === start) {
      last[1] = start + STEP_MINUTES;
    } else {
      stretches.push([start, start + STEP_MINUTES]);
    }
  }
  return stretches.map(([from, to]) => `${clockOf(from)}–${clockOf(to)}`);
}
