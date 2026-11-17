/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { SeatStayMade } from '@/api/seat-stay-types';
import { field, isText } from './answers';
import { call } from './http';
import { isQuest } from './quest-answers';

export function isSeatStayMade(value: unknown): value is SeatStayMade {
  const leaveAt = field(value, 'leaveAt');
  return isQuest(field(value, 'quest')) && (leaveAt === null || isText(leaveAt));
}

export const seatStayClient: Pick<ApiClient, 'makeSeatStay'> = {
  makeSeatStay: (stay, idempotencyKey) =>
    call('POST', '/library/seat-stays', isSeatStayMade, {
      body: stay,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};
