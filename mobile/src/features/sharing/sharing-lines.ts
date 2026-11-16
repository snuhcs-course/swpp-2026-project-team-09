/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { Friend, MyParty } from '@/api/types';

// The lines under the Master Switch on 내 정보's 위치 공유 card. Both count the User's own end only: someone sees the
// User only while both ends and both Master Switches are on, which the app does not know, so neither line says who
// sees the User.

// The Friends whose level the User set above the Timetable, whatever the Friend's own end.
export function friendsLine(friends: readonly Pick<Friend, 'sharing'>[]): string {
  return `위치 공유를 허용한 친구 ${friends.filter(({ sharing }) => sharing).length}명`;
}

// The other members of the 파티 that is on, while the User's own switch for it is on; null otherwise.
export function partyLine(party: MyParty | null): string | null {
  if (party === null || !party.sharing) {
    return null;
  }
  // The members hold the User too.
  return `${party.title} 파티에서 위치 공유를 허용한 멤버 ${party.members.length - 1}명`;
}
