/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { useKeepMadeQuest } from '@/features/assistant/made-quest-ids';
import type { Slot } from '@/library/cards/payloads';

export type HoldStay = (space: LibrarySpace, slot: Slot) => void;

// After a seat is booked on the library's site, the main server holds the stay as a Quest the User holds alone and
// keeps its leave-by for the next item (P05-14); the everyday map shows it as a Quest made on this phone. It runs beside
// the booking's done message and never undoes the booking: a failure leaves the seat booked with no Quest. The seat and
// the booking number stay on the phone.
export function useSeatStay(): HoldStay {
  const keepMade = useKeepMadeQuest();
  return useCallback(
    (space, { date, start, minutes }) => {
      apiClient.makeSeatStay({ spaceId: space.id, date, start, minutes }, newIdempotencyKey()).then(
        ({ quest }) => {
          keepMade(quest.id);
        },
        () => null,
      );
    },
    [keepMade],
  );
}
