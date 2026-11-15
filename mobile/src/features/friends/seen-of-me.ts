/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Friend, FriendLevel, MyParty } from '@/api/types';

// What a Friend sees of where the User is, as board a11 says it.
const SEEN_WORDS: Readonly<Record<FriendLevel, string>> = {
  timetable: '시간표만',
  building: '지금 있는 건물',
  exact: '정확한 위치',
};

const IN_PARTY = '정확한 위치 · 파티 중';

// One row of the User's own card: a Friend by full name, and what they see of the User now.
export interface SeenOfMe {
  id: string;
  name: string;
  words: string;
}

// Each Friend in the order of GET /friends, with what the two see of each other (`seen`). A Friend in the User's Party
// sees the exact position while the User's own switches, the Master Switch and the Party's, are on. The app does not
// know the Friend's own switches, so such a row may say more than the Friend sees, never less.
export function seenOfMe(friends: readonly Friend[], party: MyParty | null, masterOn: boolean): SeenOfMe[] {
  const members = masterOn && party?.sharing === true ? party.members : [];
  const inParty = new Set(members.map(({ id }) => id));
  return friends.map(({ id, name, seen }) => ({ id, name, words: inParty.has(id) ? IN_PARTY : SEEN_WORDS[seen] }));
}
