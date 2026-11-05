/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { JoinPolicy } from '../../generated/prisma/client.js';

// As the party form starts (mobile/src/features/party/making.ts): 4 people.
const DEFAULT_CAPACITY = 4;

interface Fillable {
  joinPolicy?: JoinPolicy;
  capacity?: number;
}

// The fields the model left out, filled as the form would start, so that a request that named what matters is
// proposed at once and the card, which shows every field, takes the correction: a 파티 with invited Friends is 비공개
// for them and the User, another 공개 for 4.
export function withDefaults<T extends Fillable>(given: T, invitees: number): T & Required<Fillable> {
  const joinPolicy = given.joinPolicy ?? (invitees > 0 ? JoinPolicy.closed : JoinPolicy.open);
  const capacity = given.capacity ?? (joinPolicy === JoinPolicy.closed ? invitees + 1 : DEFAULT_CAPACITY);
  return { ...given, joinPolicy, capacity };
}
