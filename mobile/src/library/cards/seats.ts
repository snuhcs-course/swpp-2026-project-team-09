/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySeat } from '../replies';

// The seats of a reading room's sector, as the site lists them for a time, and where the seat map draws them.

// The size of each seat's box on the site's map, in image pixels.
export const SEAT_BOX = { width: 33, height: 28 } as const;

export type SeatState = 'free' | 'taken' | 'accessible';

// Free is STATUS 1 and USECNT 0. STATUS 9 is an accessible seat, which is not booked online.
export function seatState({ STATUS, USECNT }: Pick<LibrarySeat, 'STATUS' | 'USECNT'>): SeatState {
  if (STATUS === 9) {
    return 'accessible';
  }
  return STATUS === 1 && USECNT === 0 ? 'free' : 'taken';
}

// One collator for every comparison: `localeCompare` with a locale builds one per call, and a sector of 560 seats is
// sorted with thousands of them (P01 ticket 08).
const LABELS = new Intl.Collator('ko', { numeric: true });

function byLabel(one: LibrarySeat, other: LibrarySeat): number {
  return LABELS.compare(one.VNAME, other.VNAME);
}

export function freeSeats(seats: readonly LibrarySeat[]): LibrarySeat[] {
  return seats.filter((seat) => seatState(seat) === 'free').toSorted(byLabel);
}

// How many seats are free, with no order needed: what a room's count shows.
export function freeSeatCount(seats: readonly LibrarySeat[]): number {
  return seats.filter((seat) => seatState(seat) === 'free').length;
}

// The seat a book card offers: the named or tapped one while it is free, else the first free seat in label order.
// Null when no seat is free.
export function chooseSeat(seats: readonly LibrarySeat[], named: string | null): LibrarySeat | null {
  const free = freeSeats(seats);
  return free.find(({ VNAME }) => VNAME === named) ?? free[0] ?? null;
}

// The next free seat after `label` in label order, else the first: what a card offers when its seat was just taken.
export function nextFreeSeat(seats: readonly LibrarySeat[], label: string): LibrarySeat | null {
  const free = freeSeats(seats);
  return free.find(({ VNAME }) => LABELS.compare(VNAME, label) > 0) ?? free[0] ?? null;
}

export interface SeatBox {
  seat: LibrarySeat;
  state: SeatState;
  left: number;
  top: number;
  width: number;
  height: number;
}

// Each seat's box on a map image `imageWidth` pixels wide drawn `shownWidth` points wide: at POSX, POSY, 33×28, all
// scaled alike.
export function seatBoxes(seats: readonly LibrarySeat[], imageWidth: number, shownWidth: number): SeatBox[] {
  const scale = imageWidth > 0 ? shownWidth / imageWidth : 0;
  return seats.map((seat) => ({
    seat,
    state: seatState(seat),
    left: seat.POSX * scale,
    top: seat.POSY * scale,
    width: SEAT_BOX.width * scale,
    height: SEAT_BOX.height * scale,
  }));
}

// The smallest and largest size the seat picture draws a seat's number at, in points.
export const SEAT_NUMBER_MIN = 8;
const SEAT_NUMBER_MOST = 14;
// A digit's width as a share of the font size, with room to spare, and the room left at each side of the number.
const DIGIT_WIDTH = 0.7;
const NUMBER_SIDE = 1;

// A seat number's font size in its box: the largest at which the whole number fits the box's width and 0.8 of its
// height, at most SEAT_NUMBER_MOST. Null when that is below SEAT_NUMBER_MIN: the seat then shows no number rather than a
// cut one (P01 ticket 01 of Iteration 5).
export function seatNumberSize(box: Pick<SeatBox, 'width' | 'height'>, label: string): number | null {
  const wide = (box.width - 2 * NUMBER_SIDE) / (DIGIT_WIDTH * Math.max(label.length, 1));
  const size = Math.min(SEAT_NUMBER_MOST, 0.8 * box.height, wide);
  return size >= SEAT_NUMBER_MIN ? size : null;
}
