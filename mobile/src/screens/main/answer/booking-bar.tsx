/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LibrarySpace } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import { leftOutOf } from '@/features/assistant/left-out';
import type { Chat } from '@/features/assistant/use-chat';
import type { Slot } from '@/library/cards/payloads';
import { bookingBarOf } from '../library/booking-kept';
import { leftOutIdsOn, useBookingBand } from './booking-band';
import { useSeatTogether } from './seat-picking';
import { Bar, type BarProps } from './time-bar';

const NO_QUESTS: readonly Quest[] = [];

// A booking's bar (P04 ticket 07): the time card a meal's answer draws, with the seat card's band, whose handles change
// the start and the end the chat keeps for the card within the room's hours, steps, and lengths (P01 ticket 14). Its
// "＋ 같이" is the answers' own, chip and picker (P10 ticket 15). While a booking is on its way the bar is hidden, so
// that the time stays as it was booked. Under the bar of several requests it stands as the Plan's bar does (P03 ticket
// 23).
export function BookingBar({
  booking,
  chat,
  onHeight,
  offset,
  caret,
}: {
  booking: ShownBooking;
  chat: Pick<Chat, 'rooms' | 'showRoom' | 'outcomes' | 'bubbles' | 'putBack' | 'askApp' | 'waiting'>;
  onHeight: (height: number) => void;
} & Pick<BarProps, 'offset' | 'caret'>): ReactElement | null {
  const bar = bookingBarOf(booking, chat);
  // The User's Classes and Quests of the slot's date, which the band shows and names (P01 ticket 05).
  const quests = useQuery(questsQuery).data ?? NO_QUESTS;
  if (bar === null) {
    return null;
  }
  const { kept, keep, live } = bar;
  // The conversation's Classes left out on the booking's day, which its ✕ puts back (P01 ticket 40).
  const skipped = { ids: leftOutIdsOn(leftOutOf(chat.bubbles), live.date), putBack: chat.putBack };
  return (
    <BookingCard
      // A new answer's card sets its range anew (P01 ticket 17).
      key={booking.place}
      chat={chat}
      keep={(slot) => {
        keep({ slot });
      }}
      onHeight={onHeight}
      place={{ offset, caret }}
      quests={quests}
      skipped={skipped}
      slot={live}
      space={kept.space}
    />
  );
}

function BookingCard(p: {
  slot: Slot;
  space: LibrarySpace;
  quests: readonly Quest[];
  keep: (slot: Slot) => void;
  skipped: { ids: readonly string[]; putBack: (classId: string) => void };
  chat: Pick<Chat, 'askApp' | 'waiting'>;
  onHeight: (height: number) => void;
  place: Pick<BarProps, 'offset' | 'caret'>;
}): ReactElement {
  const band = useBookingBand(p.slot, p.space, p.quests, p.keep, p.skipped);
  const together = useSeatTogether(p.space, band.band, p.chat);
  return (
    <Bar
      add={together.add}
      band={{ ...band, band: together.band }}
      onHeight={p.onHeight}
      picking={together.picking}
      {...p.place}
    />
  );
}
