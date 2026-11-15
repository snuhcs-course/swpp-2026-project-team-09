/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { Friend, FriendLevel, FriendStatus, LatLng, Position, Presence } from '@/api/types';
import type { FriendRequests } from '@/api/waiting-types';
import { KEPT_POSITION_MS, OLD_POSITION_MS } from '@/position';

// One row of the friend list, and a Friend's Avatar on the map.
export interface FriendView {
  id: string;
  name: string;
  department: string;
  presence: Presence;
  // "중앙도서관", the Place nearest a Friend the User can see; "위치 꺼짐" for one the User cannot.
  line: string;
  detail: string;
  // "도보 4분", "근처" when the User and the Friend are nearest the same Place, or "" when it is not known.
  walk: string;
  photo: string | null;
  // Null when the Friend cannot be seen.
  position: LatLng | null;
  // How many minutes ago an old position was measured; null for a recent one and for none.
  minutesOld: number | null;
  // Whether the User can see the Friend on the map now, as the main server says.
  visible: boolean;
  // The User's own end of this friendship.
  level: FriendLevel;
  sharing: boolean;
  // Whether the app has asked the User before turning location off for this Friend.
  askedOff: boolean;
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  free: '공강',
  class: '수업 중',
  moving: '이동 중',
  on: '위치 켜짐',
  off: '위치 꺼짐',
};

function line(presence: Presence, where: string): string {
  return where === '' ? PRESENCE_LABEL[presence] : `${PRESENCE_LABEL[presence]} · ${where}`;
}

// The walk the main server gives from the Place nearest the User to the Place nearest the Friend: "근처" when it is
// the same Place, and nothing when the main server does not know it, as while the User's own position is unknown.
export function walkWords(position: Position | undefined): string {
  const minutes = position?.walkMinutes ?? null;
  if (minutes === null) {
    return '';
  }
  return minutes === 0 ? '근처' : `도보 ${minutes}분`;
}

// A Friend's line by what the main server knows alone: the Place nearest a Friend the User can see, or "위치 켜짐"
// while that is not known, and "위치 꺼짐" for a Friend the User cannot see. The age of an old position goes after it
// where the line is shown (`withAge`).
//
// "수업 중" and "이동 중" are not worked out here, nor "공강": the FriendView and the three Friend levels of package C
// (`.scratch/iteration-4/agentic-map-work-split.md`) redefine a Friend's status in this iteration, and the line takes
// more from there. Until then the app says no more than the
// main server's positions say, so a Friend in class is never "공강".
function knownLine(visible: boolean, position: Position | undefined): string {
  if (!visible) {
    return PRESENCE_LABEL.off;
  }
  return position?.nearPlace ?? PRESENCE_LABEL.on;
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
// the main server no longer keeps at `now`. Only the mock has statuses: the main server serves none.
export function toFriendViews(
  friends: readonly Friend[],
  positions: readonly Position[],
  statuses: readonly FriendStatus[],
  now: Date,
): FriendView[] {
  const kept = keptPositions(positions, now);
  return friends.map(({ id, name, department, visible, level, sharing, askedOff }) => {
    // The main server's word on whether the Friend is seen wins over the app's own status.
    const status = statuses.find(({ userId, presence }) => userId === id && (presence !== 'off') === visible);
    const position = visible ? kept.find(({ userId }) => userId === id) : undefined;
    // Without a status, a Friend is shown by what the main server does say: whether the User can see the Friend, the
    // Place nearest them and the walk there.
    const presence = status?.presence ?? (visible ? 'on' : 'off');
    return {
      id,
      name,
      department,
      presence,
      line: status === undefined ? knownLine(visible, position) : line(status.presence, status.where),
      detail: status?.detail ?? '',
      walk: status?.walk ?? walkWords(position),
      photo: status?.photo ?? null,
      position: position === undefined ? null : { latitude: position.latitude, longitude: position.longitude },
      minutesOld: position === undefined ? null : minutesOld(position, now),
      visible,
      level,
      sharing,
      askedOff,
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
