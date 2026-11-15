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
