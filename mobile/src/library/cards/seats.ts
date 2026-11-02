/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
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

function byLabel(one: LibrarySeat, other: LibrarySeat): number {
  return one.VNAME.localeCompare(other.VNAME, 'ko', { numeric: true });
}

export function freeSeats(seats: readonly LibrarySeat[]): LibrarySeat[] {
  return seats.filter((seat) => seatState(seat) === 'free').toSorted(byLabel);
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
  return free.find(({ VNAME }) => VNAME.localeCompare(label, 'ko', { numeric: true }) > 0) ?? free[0] ?? null;
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
