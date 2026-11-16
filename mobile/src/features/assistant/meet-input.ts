/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import type { MeetInput } from '@/api/meet-plan-types';
import { koreaDateKey } from '@/korea-time';

// What "만나고 싶다" asks: when the asker and the Friend are both free on the day in Korea, and where they meet, with
// nothing fixed.
export function meetInput(askerId: string, friendId: string, at: Date): MeetInput {
  return {
    kind: 'meet',
    date: koreaDateKey(at),
    people: [
      { userId: askerId, constraints: [] },
      { userId: friendId, constraints: [] },
    ],
    window: { from: null, until: null },
    placeId: null,
  };
}

// The Friend of a meet with one Friend, null for anything else: a meet without its Friend has nothing to plan, so
// that Friend's ✕ goes back to their card.
export function onlyFriendOf(input: PlanInput): string | null {
  if (input.kind !== 'meet' || input.people.length !== 2) {
    return null;
  }
  return input.people[1]?.userId ?? null;
}
