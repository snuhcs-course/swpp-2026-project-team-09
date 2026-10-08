import type { Friend, FriendStatus, LatLng, Position, Presence } from '@/api/types';
import type { FriendRequests } from '@/api/waiting-types';
import { KEPT_POSITION_MS, OLD_POSITION_MS } from '@/position';

// One row of the friend list, and a Friend's Avatar on the map.
export interface FriendView {
  id: string;
  name: string;
  department: string;
  presence: Presence;
  // "공강 · 중앙도서관"
  line: string;
  detail: string;
  // "도보 4분", or "" when it is not known.
  walk: string;
  photo: string | null;
  // Null when the Friend cannot be seen.
  position: LatLng | null;
  // How many minutes ago an old position was measured; null for a recent one and for none.
  minutesOld: number | null;
  // Whether the User can see the Friend on the map now, as the main server says.
  visible: boolean;
  // The User's own switch for this friendship.
  sharing: boolean;
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  free: '공강',
  class: '수업 중',
  moving: '이동 중',
  off: '위치 꺼짐',
};

function line(presence: Presence, where: string): string {
  return where === '' ? PRESENCE_LABEL[presence] : `${PRESENCE_LABEL[presence]} · ${where}`;
}

const MINUTE_MS = 60 * 1000;

function ageOf({ measuredAt }: Position, now: Date): number {
  return now.getTime() - Date.parse(measuredAt);
}

// The positions the main server still keeps at `now`: one measured longer ago is no longer answered.
export function keptPositions(positions: readonly Position[], now: Date): Position[] {
  return positions.filter((position) => ageOf(position, now) < KEPT_POSITION_MS);
}

// How many whole minutes ago an old position was measured, or null for a recent one.
export function minutesOld(position: Position, now: Date): number | null {
  const age = ageOf(position, now);
  return age >= OLD_POSITION_MS ? Math.floor(age / MINUTE_MS) : null;
}

// A line with the age of an old position after it: "공강 · 3분 전 위치".
export function withAge(words: string, minutes: number | null): string {
  if (minutes === null) {
    return words;
  }
  return words === '' ? `${minutes}분 전 위치` : `${words} · ${minutes}분 전 위치`;
}

// Joins the three answers about Friends by the Friend's id, in the order of the Friends. A Friend whom the User
// cannot see has no position, also when an old one is still in the answer, and neither has a Friend whose position
// the main server no longer keeps at `now`.
export function toFriendViews(
  friends: readonly Friend[],
  positions: readonly Position[],
  statuses: readonly FriendStatus[],
  now: Date,
): FriendView[] {
  const kept = keptPositions(positions, now);
  return friends.map(({ id, name, department, visible, sharing }) => {
    // The main server's word on whether the Friend is seen wins over the app's own status.
    const status = statuses.find(({ userId, presence }) => userId === id && (presence !== 'off') === visible);
    const position = visible ? kept.find(({ userId }) => userId === id) : undefined;
    // Without a status, a Friend is shown by what the main server does say: whether the User can see the Friend.
    const presence = status?.presence ?? (visible ? 'free' : 'off');
    return {
      id,
      name,
      department,
      presence,
      line: line(presence, status?.where ?? ''),
      detail: status?.detail ?? '',
      walk: status?.walk ?? '',
      photo: status?.photo ?? null,
      position: position === undefined ? null : { latitude: position.latitude, longitude: position.longitude },
      minutesOld: position === undefined ? null : minutesOld(position, now),
      visible,
      sharing,
    };
  });
}

// One Friend Request in a list of 친구 요청: the other User, who sent it or received it.
export interface FriendRequestView {
  id: string;
  name: string;
  department: string;
}

export interface FriendRequestsView {
  received: FriendRequestView[];
  sent: FriendRequestView[];
}

export function toFriendRequestViews({ received, sent }: FriendRequests): FriendRequestsView {
  return {
    received: received.map(({ id, sender }) => ({ id, ...sender })),
    sent: sent.map(({ id, receiver }) => ({ id, ...receiver })),
  };
}
