/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { isNothing } from './answers';
import { call } from './http';
import { isMeetup } from './waiting-answers';

// The operations of Meetups, each from its route of the main server.

async function answerMeetup(meetupId: string, answer: 'accept' | 'decline' | 'withdraw'): Promise<void> {
  await call('POST', `/meetups/${encodeURIComponent(meetupId)}/${answer}`, isNothing);
}

export const meetupClient: Pick<ApiClient, 'proposeMeetup' | 'acceptMeetup' | 'declineMeetup' | 'withdrawMeetup'> = {
  proposeMeetup: (proposal, idempotencyKey) =>
    call('POST', '/meetups', isMeetup, { body: proposal, headers: { 'Idempotency-Key': idempotencyKey } }),
  acceptMeetup: (meetupId) => answerMeetup(meetupId, 'accept'),
  declineMeetup: (meetupId) => answerMeetup(meetupId, 'decline'),
  withdrawMeetup: (meetupId) => answerMeetup(meetupId, 'withdraw'),
};
