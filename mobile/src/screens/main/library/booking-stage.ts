/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import type { LibraryFailure } from '@/library/client';
import type { LibrarySeat } from '@/library/replies';
import { needsLogin, type Write } from './use-library-call';

// What the seat card of a booking on the map (P04 ticket 07) tells the screen around it: the seat it offers, its main
// action, which the button beside the input takes ("예약하기", or "로그인" while logged out of the library), and the
// seat picture's opening, which the flag's card offers as 다른 자리 고르기.
export interface BookingTold {
  place: string;
  seat: string | null;
  main: { words: string; onPress: () => void; disabled: boolean } | null;
  pick: (() => void) | null;
}

// What the screen reads of it: the words alone, which change only when the card's do.
export interface BookingSeen {
  place: string;
  seat: string | null;
  words: string | null;
  disabled: boolean;
  picks: boolean;
}

export interface BookingStage {
  seen: BookingSeen | null;
  // The card tells what it offers at each render, and null once it is gone.
  tell: (told: BookingTold | null) => void;
  press: () => void;
  pick: () => void;
  // The minutes of the walk the map draws from the User to the booking's building; null without the User's position
  // (P01 ticket 06).
  walk: number | null;
  tellWalk: (minutes: number | null) => void;
}

function same(one: BookingSeen | null, other: BookingSeen | null): boolean {
  return JSON.stringify(one) === JSON.stringify(other);
}

function ignore(): void {
  // Nothing told yet.
}

// The card's words in state, so that the screen draws them, and its presses in a ref, so that telling them at each
// render costs no render.
export function useBookingStage(): BookingStage {
  const presses = useRef<{ press: () => void; pick: () => void }>({ press: ignore, pick: ignore });
  const [seen, setSeen] = useState<BookingSeen | null>(null);
  const tell = useCallback((told: BookingTold | null): void => {
    if (told === null) {
      setSeen((last) => (last === null ? last : null));
      return;
    }
    const { place, seat, main, pick } = told;
    presses.current = { press: main?.onPress ?? ignore, pick: pick ?? ignore };
    const next = { place, seat, words: main?.words ?? null, disabled: main?.disabled ?? true, picks: pick !== null };
    setSeen((last) => (same(last, next) ? last : next));
  }, []);
  const press = useCallback(() => {
    presses.current.press();
  }, []);
  const pick = useCallback(() => {
    presses.current.pick();
  }, []);
  const [walk, tellWalk] = useState<number | null>(null);
  return { seen, tell, press, pick, walk, tellWalk };
}

export type Tell = BookingStage['tell'];

interface Telling {
  place: string;
  seat: string | null;
  // The seats' reading or the last write asked for the library's login.
  logInAsked: boolean;
  busy: boolean;
  // The seats are being read or the rooms listed: 예약하기 stays in place, disabled (P01 ticket 03).
  waiting: boolean;
  book: () => void;
  logIn: () => void;
  pick: (() => void) | null;
}

// A seat card on the map tells the screen what it offers at each render, and that it is gone once it unmounts.
export function useTellBooking(tell: Tell | null, telling: Telling): void {
  const { place, seat, logInAsked, busy, waiting, book, logIn, pick } = telling;
  useEffect(() => {
    if (tell === null) {
      return;
    }
    const main = logInAsked
      ? { words: '로그인', onPress: logIn, disabled: false }
      : waiting
        ? { words: '예약하기', onPress: book, disabled: true }
        : seat === null
          ? null
          : { words: busy ? '예약하는 중' : '예약하기', onPress: book, disabled: busy };
    tell({ place, seat, main, pick });
  });
  useEffect(
    () => (): void => {
      tell?.(null);
    },
    [tell],
  );
}

interface SeatOnMapOf {
  place: string;
  seat: LibrarySeat | null;
  loaded: { state: 'loading' } | { state: 'ready' } | { state: 'failed'; failure: LibraryFailure };
  write: Write<LibrarySeat>;
  // 로그인 after the seats could not be read.
  logIn: () => void;
  shown: LibrarySpace;
  // The rooms are listed, or a full room is being swapped.
  choosing: boolean;
}

// A seat card whose booking the map draws (`tell` given): it tells its seat, 예약하기 or 로그인, and its seat picture's
// opening, which it holds here so that the flag's card opens it too.
export function useSeatOnMap(
  tell: Tell | null,
  { place, seat, loaded, write, logIn, shown, choosing }: SeatOnMapOf,
): { picking: boolean; setPicking: (picking: boolean) => void; onMap: boolean } {
  const [picking, setPicking] = useState(false);
  const failures = [loaded.state === 'failed' ? loaded.failure : null, write.failure?.failure ?? null];
  useTellBooking(tell, {
    place,
    seat: seat?.VNAME ?? null,
    logInAsked: failures.some((failure) => failure !== null && needsLogin(failure)),
    busy: write.busy,
    waiting: choosing || loaded.state === 'loading',
    book: (): void => {
      if (seat !== null) {
        write.run(seat);
      }
    },
    logIn: loaded.state === 'failed' ? logIn : write.logIn,
    pick:
      shown.mapImage === null || seat === null
        ? null
        : (): void => {
            setPicking(true);
          },
  });
  return { picking, setPicking, onMap: tell !== null };
}
