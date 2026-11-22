/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import type { ConfirmedPress } from '@/library/client';
import { doneOf } from '@/library/cards/done';
import { type Slot, seatBookingOf } from '@/library/cards/payloads';
import { nextFreeSeat, seatState } from '@/library/cards/seats';
import { liveSlot, sameSlot } from '@/library/cards/slot-band';
import { library } from '@/library/library';
import type { LibrarySeat } from '@/library/replies';
import { BOOKING_CLOSED } from './seats-card';
import { bseqnoOf, type CardFailure, type LibraryCardActions, libraryMessage } from './use-library-call';
import { seatsFor } from './use-room-counts';
import type { HoldStay } from './use-seat-stay';

// The seat book card's booking (moved out of `book-seat-card.tsx`): what it sends on 예약하기 and what the card says.

export const SEAT_TAKEN = '그 자리는 방금 다른 사람이 예약했어요';
export const NO_FREE_SEAT = '그 시간에 빈 자리가 없어요';
export const NOT_BOOKED = '알겠어요. 예약하지 않았어요.';
export const BOOK_FAILED = '예약하지 못했어요';
export const SEATS_UNREAD = '관정의 자리 정보를 받지 못했어요';

export { SEATS_WAIT_MS, withinWait } from './seats-wait';
// The time's start went by while the card was open.
export const SLOT_PASSED = '시작 시각이 지났어요. 시간을 다시 골라 주세요.';
// Under a time the User changed: the Assistant's words above were for the card's own time.
export const TIME_CHANGED = '바꾼 시간이에요. 위 답의 시각은 처음 시간 기준이에요.';
// 대학원 열람실, which the library may refuse to an undergraduate: the card then says only that it failed.
const GRADUATE_ROOM = '8F-grad-reading-room';

export interface Booking {
  card: LibraryCardData;
  space: LibrarySpace;
  slot: Slot;
  actions: LibraryCardActions;
  close: (closed: 'booked' | 'declined') => void;
  choose: (label: string) => void;
  reload: () => void;
  // The stay held as the User's own Quest once booked (P05-14).
  hold: HoldStay;
}

// 예약하기: the booking, then the done message; a seat just taken offers the next free one. A time whose start has
// gone by at the press, or that the space no longer has room for, is never sent, whatever the band did.
export async function sendBooking(
  booking: Booking,
  seat: LibrarySeat,
  press: ConfirmedPress,
): Promise<CardFailure | null> {
  const { card, space, slot } = booking;
  const live = liveSlot(space, slot, now());
  if (live === null || !sameSlot(live, slot)) {
    return { failure: null, message: live === null ? BOOKING_CLOSED : SLOT_PASSED };
  }
  const result = await library.book(seatBookingOf(space, slot, seat), press);
  const info = result.bookingResultInfo;
  if (info !== undefined) {
    booking.close('booked');
    const made = { slot, label: seat.VNAME, bseqno: bseqnoOf(info), notes: card.notes };
    booking.hold(space, slot, made.bseqno);
    const done = doneOf(space, made, now());
    booking.actions.addOwn({ text: done.title, done });
    return null;
  }
  const fresh = await seatsFor(space, slot);
  const after = fresh.find(({ SEATNO }) => SEATNO === seat.SEATNO);
  if (after !== undefined && seatState(after) !== 'free') {
    const next = nextFreeSeat(fresh, seat.VNAME);
    if (next !== null) {
      booking.choose(next.VNAME);
    }
    booking.reload();
    return { failure: null, message: SEAT_TAKEN };
  }
  const message = libraryMessage(result);
  return {
    failure: null,
    message: space.id === GRADUATE_ROOM || message === '' ? BOOK_FAILED : `${BOOK_FAILED}: ${message}`,
  };
}
