/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { FriendLevel } from '@/api/types';
import { type CardView, cardId, line, staleLine } from '@/features/map/adapter';
import { koreaCalendar } from '@/korea-time';
import type { FriendView } from './adapter';

// What the User sees of where a Friend is, by what the two see of each other, as row 6's boards say it.
const SEEN_WORDS: Readonly<Record<FriendLevel, string>> = {
  timetable: '시간표만 보여요',
  building: '지금 있는 건물까지 보여요',
  exact: '정확한 위치까지 보여요',
};

// What a Friend's profile says beside their card: what the User sees of them, and, once the main server sends them,
// their Friend ID and since when the two have been Friends; null for a field it does not send.
export interface FriendProfile {
  seen: string;
  friendId: string | null;
  since: string | null;
}

// "10월 3일부터 친구", by Korea's calendar.
function sinceWords(friendsSince: string): string {
  const { month, date } = koreaCalendar(new Date(friendsSince));
  return `${month}월 ${date}일부터 친구`;
}

export function profileOf({
  seen,
  friendId,
  friendsSince,
}: Pick<FriendView, 'seen' | 'friendId' | 'friendsSince'>): FriendProfile {
  return {
    seen: SEEN_WORDS[seen],
    friendId: friendId === undefined ? null : `친구 ID ${friendId}`,
    since: friendsSince === undefined ? null : sinceWords(friendsSince),
  };
}

const FROM_LEAST: readonly FriendLevel[] = ['timetable', 'building', 'exact'];

// A level as the 위치 공유 screen names it.
const LEVEL_WORDS: Readonly<Record<FriendLevel, string>> = {
  timetable: '시간표만',
  building: '지금 있는 건물',
  exact: '정확한 위치',
};

// What the two see of each other, as the 위치 공유 screen says it.
const BOTH_SEE: Readonly<Record<FriendLevel, string>> = {
  timetable: '서로 시간표만 보여요',
  building: '서로 지금 있는 건물까지 보여요',
  exact: '서로 정확한 위치까지 보여요',
};

// "어디까지 보이나" of a Friend (row 9 board 2): the Friend with where the map shows them, the User's own end, and
// what the two see, the lower end, which says so when the User's end is above it. The Friend's own end is never said.
export interface SeenCardWords {
  title: string;
  mine: string;
  both: string;
}

// `where`: the Place the map shows the Friend at, "301동", or null for none.
export function seenCardOf(
  { name, level, seen }: Pick<FriendView, 'name' | 'level' | 'seen'>,
  where: string | null,
): SeenCardWords {
  const lower = FROM_LEAST.indexOf(seen) < FROM_LEAST.indexOf(level);
  return {
    title: where === null ? name : `${name} · 지금 ${where}`,
    mine: `내가 ${name}에게: ${LEVEL_WORDS[level]}`,
    both: lower ? `${BOTH_SEE[seen]} (낮은 쪽을 따라요)` : BOTH_SEE[seen],
  };
}

// What a screen reader says of the button that opens a person's profile: "김민수 프로필".
export function profileLabel(name: string): string {
  return `${name} 프로필`;
}

// A Friend's card without the map's own parts, which a Friend whom the map does not show has too.
export type FriendCard = Pick<CardView, 'id' | 'mark' | 'subLabel' | 'title' | 'lines' | 'primary'>;

// A Friend's card as the everyday map draws it: the lines it has today, the status or how old an old position is and
// the way, and none without a position.
export function friendProfileCard(friend: FriendView): FriendCard {
  const { id, name, department, presence, detail, walk, photo, position, minutesOld } = friend;
  const status = minutesOld === null ? (detail === '' ? [] : [line('info', detail)]) : [staleLine(minutesOld)];
  return {
    id: cardId.friend(id),
    mark: { type: 'person', id, name, photo, presence, stale: minutesOld !== null },
    subLabel: department,
    title: name,
    lines: position === null ? [] : [...status, ...(walk === '' ? [] : [line('route', walk)])],
    primary: { label: '파티 만들기', action: 'private-party', userId: id },
  };
}
