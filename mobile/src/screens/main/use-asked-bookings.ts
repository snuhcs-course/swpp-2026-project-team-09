/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import type { ArmedAct } from '@/api/library-card-types';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { myBookingsCardOf } from '@/library/cards/made';
import type { ChatSheetControl } from './chat-sheet';

// What 오늘's 예약 asks of the map (A04 ticket 11), by the main screen's address: `?myBookings=open` for a ticket,
// `?myBookings=<BSEQNO>:cancel` or `:return` for its link.
export const MY_BOOKINGS_ASKED = '내 예약';

export function bookingsAddress(armed: Omit<ArmedAct, 'asked'> | null): {
  pathname: '/main';
  params: { myBookings: string };
} {
  return {
    pathname: '/main',
    params: { myBookings: armed === null ? 'open' : `${String(armed.bseqno)}:${armed.act}` },
  };
}

// Counts the asks while the app runs, so that each is its own even within one millisecond or a restarted chat.
let asks = 0;

function armedOf(asked: string): ArmedAct | null {
  const [bseqno, act] = asked.split(':');
  const number = Number(bseqno);
  return Number.isInteger(number) && (act === 'cancel' || act === 'return')
    ? { bseqno: number, act, asked: (asks += 1) }
    : null;
}

// Starts a new conversation with the app's own turn "내 예약", whose reply is the 내 예약 card made on the phone, with the
// asked act armed: nothing is sent to the model, and nothing to the library but the card's own read.
export function useAskedBookings(chat: ChatSheetControl): void {
  const { myBookings } = useLocalSearchParams<{ myBookings?: string }>();
  const { askOwn } = chat.chat;
  useEffect(() => {
    if (myBookings === undefined) {
      return;
    }
    router.setParams({ myBookings: undefined });
    const card = myBookingsCardOf(koreaDateKey(now()), armedOf(myBookings));
    askOwn(MY_BOOKINGS_ASKED, { text: '', cards: [{ kind: 'library', library: card }] });
  }, [myBookings, askOwn]);
}
