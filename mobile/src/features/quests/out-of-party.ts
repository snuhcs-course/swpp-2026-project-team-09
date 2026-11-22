/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { apiClient } from '@/api/client';

// Where the User stands in a Quest's Party: its Leader, a member, or not in it.
export type PartyPlace = 'leads' | 'member' | 'none';

// How the User leaves the Quest's Party before the Quest: the Leader of the Party ends it, a member leaves it. The
// room's 나가기 and 파티 없애기 use it, and so does a Quest cancelled by words (P04 ticket 24).
export async function outOfParty(party: PartyPlace, ends: boolean): Promise<void> {
  if (party === 'leads' && ends) {
    await apiClient.endParty();
  } else if (party !== 'none') {
    await apiClient.leaveParty();
  }
}
