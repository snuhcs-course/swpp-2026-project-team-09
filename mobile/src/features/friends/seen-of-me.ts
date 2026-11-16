/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Friend, FriendLevel, MyParty } from '@/api/types';

// What a Friend sees of where the User is, as board a11 and the 위치 공유 screen say it.
const SEEN_WORDS: Readonly<Record<FriendLevel, string>> = {
  timetable: '시간표만',
  building: '지금 있는 건물',
  exact: '정확한 위치',
};

const IN_PARTY = '정확한 위치 · 파티 중';

const FROM_LEAST: readonly FriendLevel[] = ['timetable', 'building', 'exact'];

// The User's own switches, which decide what a Friend sees of the User: the Master Switch, and the Party the User is
// in, null for none, with the User's own switch for it.
export interface MySwitches {
  masterOn: boolean;
  party: MyParty | null;
}

// What a Friend and the User see of each other: the User's own end as the Friend sees it, what the two see, and
// whether the User's Party gives it.
export interface SeenLevels {
  mine: FriendLevel;
  both: FriendLevel;
  inParty: boolean;
}

function lowerOf(one: FriendLevel, other: FriendLevel): FriendLevel {
  return FROM_LEAST.indexOf(one) < FROM_LEAST.indexOf(other) ? one : other;
}

// The one rule of what a Friend sees of the User, which the User's own card and "어디까지 보이나" both say. A Friend in
// the User's Party sees the exact position while the User's Master Switch and the User's own switch for the Party are
// on, as the main server gives a common Party; `seen` leaves the Party out. Otherwise the User's end is `level`, the
// Timetable while the Master Switch is off, and the two see the lower of it and `seen`. The app does not know the
// Friend's own switches, so the Party may say more than the Friend sees, never less.
export function seenLevels(
  { id, level, seen }: Pick<Friend, 'id' | 'level' | 'seen'>,
  { masterOn, party }: MySwitches,
): SeenLevels {
  if (masterOn && party?.sharing === true && party.members.some((member) => member.id === id)) {
    return { mine: 'exact', both: 'exact', inParty: true };
  }
  const mine = masterOn ? level : 'timetable';
  return { mine, both: lowerOf(seen, mine), inParty: false };
}

// A level as the 위치 공유 screen names it, or "정확한 위치 · 파티 중" when the User's Party gives it.
export function levelWords(level: FriendLevel, inParty: boolean): string {
  return inParty ? IN_PARTY : SEEN_WORDS[level];
}

// One row of the User's own card: a Friend by full name, and what they see of the User now.
export interface SeenOfMe {
  id: string;
  name: string;
  words: string;
}

// Each Friend in the order of GET /friends, with what the two see of each other.
export function seenOfMe(friends: readonly Friend[], switches: MySwitches): SeenOfMe[] {
  return friends.map((friend) => {
    const { both, inParty } = seenLevels(friend, switches);
    return { id: friend.id, name: friend.name, words: levelWords(both, inParty) };
  });
}
