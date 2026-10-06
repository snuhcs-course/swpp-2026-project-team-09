import type { Friend, FriendStatus, LatLng, Position, Presence } from '@/api/types';

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
  // Whether the User can see the Friend on the map now, as the main server says.
  visible: boolean;
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

// Joins the three answers about Friends by the Friend's id, in the order of the Friends. A Friend whom the User
// cannot see has no position, also when an old one is still in the answer.
export function toFriendViews(
  friends: readonly Friend[],
  positions: readonly Position[],
  statuses: readonly FriendStatus[],
): FriendView[] {
  return friends.map(({ id, name, department, visible }) => {
    const status = statuses.find(({ userId }) => userId === id);
    const position = visible ? positions.find(({ userId }) => userId === id) : undefined;
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
      visible,
    };
  });
}
