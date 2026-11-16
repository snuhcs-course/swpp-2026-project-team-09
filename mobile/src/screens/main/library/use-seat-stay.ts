/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { Slot } from '@/library/cards/payloads';
import { keepSeatStay } from '@/library/seat-stays';

export type HoldStay = (space: LibrarySpace, slot: Slot, bseqno: string) => void;

// After a seat is booked on the library's site, the main server holds the stay as a Quest the User holds alone and
// keeps its leave-by for the next item (P05-14), as "여기로" does for a Plan alone; the phone keeps which Quest is the
// booking's, so that a cancel or a return ends it. It runs beside the booking's done message and never undoes the
// booking: a failure leaves the seat booked with no Quest. The seat and the booking number stay on the phone.
export function useSeatStay(): HoldStay {
  return useCallback((space, { date, start, minutes }, bseqno) => {
    apiClient.makeSeatStay({ spaceId: space.id, date, start, minutes }, newIdempotencyKey()).then(
      ({ quest }) => (bseqno === '' ? undefined : keepSeatStay(bseqno, quest.id)),
      () => null,
    );
  }, []);
}
