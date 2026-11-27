/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { now } from '@/clock';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import type { CardRoom, Chat } from '@/features/assistant/use-chat';
import type { Slot } from '@/library/cards/payloads';
import { liveSlot } from '@/library/cards/slot-band';
import { cardSlot, keptRoom, type Shown } from './seat-room';

export interface BookingKept {
  kept: Shown;
  keep: (next: Partial<Shown>) => void;
  // The kept time as it may be booked now, null when none is left that day.
  live: Slot | null;
}

// The room, the time, and the seat of the booking on the map as the chat keeps them for its card, and how a change is
// kept: the time bar's handles change them as the card's band did (P04 ticket 07).
export function bookingKept({ card, space, place }: ShownBooking, chat: Pick<Chat, 'rooms' | 'showRoom'>): BookingKept {
  const at = now();
  const actions = { roomOf: (one: string): CardRoom | null => chat.rooms.get(one) ?? null, showRoom: chat.showRoom };
  const { kept, keep } = keptRoom({ card, space, place }, actions, cardSlot(card, at));
  return { kept, keep, live: liveSlot(kept.space, kept.slot, at) };
}

// The booking's time card while it stands: none while its booking is on its way or once it is booked, so that the time
// stays as it was booked (P04 ticket 07), nor when no time is left that day.
export function bookingBarOf(
  booking: ShownBooking,
  chat: Pick<Chat, 'rooms' | 'showRoom' | 'outcomes'>,
): (BookingKept & { live: Slot }) | null {
  const kept = bookingKept(booking, chat);
  const { live } = kept;
  const pending = chat.outcomes.get(booking.place)?.kind === 'pending';
  return live === null || pending || booking.booked ? null : { ...kept, live };
}
