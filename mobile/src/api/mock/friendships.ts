/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type {
  AskedMoment,
  Friend,
  FriendLevel,
  InviteLink,
  OpenedInviteLink,
  Position,
  SentFriendRequest,
  UserSummary,
} from '@/api/types';
import type { FriendRequests } from '@/api/waiting-types';
import { now } from '@/clock';
import {
  FRIEND_IDS,
  FRIEND_REQUESTS,
  FRIENDS,
  INVITE_LINK_FROM_YUJIAN,
  MY_FRIEND_ID,
  OTHER_USERS,
  POSITIONS,
} from './data/friends';
import { FRAME_NOW, ME } from './data/frame';

// The friendships of the mock, kept in memory while the app runs and refused as the main server refuses
// (`main-server/README.md`, "Friends" and "Invite Links"). `me` is the User.

interface Person extends UserSummary {
  id: string;
  friendId: string;
}

interface Request {
  id: string;
  from: string;
  to: string;
  sentAt: string;
}

interface Link {
  senderId: string;
  expiresAt: number;
  used: boolean;
}

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

const PEOPLE: readonly Person[] = [
  { id: ME.id, name: ME.name, department: ME.department, friendId: MY_FRIEND_ID },
  ...FRIENDS.map(({ id, name, department }) => ({ id, name, department, friendId: FRIEND_IDS[id] ?? '' })),
  ...OTHER_USERS,
];

interface State {
  friends: Friend[];
  // Each Friend's own end, which the User never changes: what the two see at the start, and the building for a new
  // Friend.
  ends: Map<string, FriendLevel>;
  requests: Request[];
  links: Map<string, Link>;
  made: number;
}

function firstState(): State {
  return {
    friends: [...FRIENDS],
    ends: new Map(FRIENDS.map(({ id, seen }) => [id, seen])),
    requests: [...FRIEND_REQUESTS],
    links: new Map([
      [INVITE_LINK_FROM_YUJIAN, { senderId: 'u5', expiresAt: Date.parse(FRAME_NOW) + LINK_LIFETIME_MS, used: false }],
    ]),
    made: 0,
  };
}

let state = firstState();

// Back to the state the app starts in, for a test.
export function resetMockFriendships(): void {
  state = firstState();
}

function refused(status: number, code: string): ApiError {
  return new ApiError(status, code);
}

function personOf(id: string): Person {
  const person = PEOPLE.find((other) => other.id === id);
  if (person === undefined) {
    throw new Error(`The mock has no User ${id}`);
  }
  return person;
}

function summaryOf(id: string): UserSummary {
  const { name, department } = personOf(id);
  return { name, department };
}

function isFriend(id: string): boolean {
  return state.friends.some((friend) => friend.id === id);
}

function hasPosition(id: string): boolean {
  return POSITIONS.some(({ userId }) => userId === id);
}

// A new friendship starts at the building, so a new Friend is seen when the mock has a position for them.
function befriend(id: string): void {
  const { name, department } = personOf(id);
  state.requests = state.requests.filter(({ from, to }) => from !== id && to !== id);
  const friend: Friend = {
    id,
    name,
    department,
    level: 'building',
    seen: 'building',
    sharing: true,
    visible: hasPosition(id),
    askedOff: false,
    askedPlan: false,
  };
  state.ends.set(id, 'building');
  state.friends = [...state.friends, friend].toSorted((one, other) => one.name.localeCompare(other.name, 'ko'));
}

const FROM_LEAST: readonly FriendLevel[] = ['timetable', 'building', 'exact'];

function lower(one: FriendLevel, other: FriendLevel): FriendLevel {
  return FROM_LEAST.indexOf(one) < FROM_LEAST.indexOf(other) ? one : other;
}

// Whether the User sees the Friend is left to the User's end, as before the Friend's end was kept.
function atLevel(friend: Friend, level: FriendLevel): Friend {
  const sharing = level !== 'timetable';
  const seen = lower(level, state.ends.get(friend.id) ?? level);
  return { ...friend, level, seen, sharing, visible: sharing && hasPosition(friend.id) };
}

function friendOrRefuse(userId: string): Friend {
  const friend = state.friends.find(({ id }) => id === userId);
  if (friend === undefined) {
    throw refused(404, 'FRIEND_NOT_FOUND');
  }
  return friend;
}

function requestOrRefuse(requestId: string, side: 'from' | 'to'): Request {
  const request = state.requests.find(({ id, ...ends }) => id === requestId && ends[side] === ME.id);
  if (request === undefined) {
    throw refused(404, 'FRIEND_REQUEST_NOT_FOUND');
  }
  state.requests = state.requests.filter((other) => other !== request);
  return request;
}

function ownerOrRefuse(friendId: string): Person {
  const owner = PEOPLE.find((person) => person.friendId === friendId.toUpperCase());
  if (owner === undefined) {
    throw refused(404, 'FRIEND_ID_NOT_FOUND');
  }
  return owner;
}

// A Friend Request from the User to another, under the main server's rules.
function requestTo(owner: Person): SentFriendRequest {
  if (isFriend(owner.id)) {
    throw refused(409, 'ALREADY_FRIENDS');
  }
  if (state.requests.some(({ from, to }) => from === ME.id && to === owner.id)) {
    throw refused(409, 'FRIEND_REQUEST_ALREADY_SENT');
  }
  if (state.requests.some(({ from, to }) => from === owner.id && to === ME.id)) {
    befriend(owner.id);
    return { status: 'friends' };
  }
  state.made += 1;
  state.requests = [
    { id: `request-${state.made}`, from: ME.id, to: owner.id, sentAt: now().toISOString() },
    ...state.requests,
  ];
  return { status: 'waiting' };
}

function linkOrRefuse(token: string): Link {
  const link = state.links.get(token);
  if (link === undefined) {
    throw refused(404, 'INVITE_LINK_NOT_FOUND');
  }
  return link;
}

function statusOf(link: Link): OpenedInviteLink['status'] {
  if (link.senderId === ME.id) {
    return 'own';
  }
  if (link.used) {
    return 'used';
  }
  if (link.expiresAt <= now().getTime()) {
    return 'expired';
  }
  return isFriend(link.senderId) ? 'friend' : 'usable';
}

const NEWEST_FIRST = (one: Request, other: Request): number => other.sentAt.localeCompare(one.sentAt);

// A Friend's position as GET /positions answers it: none for a Friend the User does not see or sees through the
// Timetable only, else with the level the two see each other at, which the mock writes as the main server sends it.
function seenPosition(position: Position): Position[] {
  if (!FRIENDS.some(({ id }) => id === position.userId)) {
    return [position];
  }
  const friend = state.friends.find(({ id }) => id === position.userId);
  if (friend === undefined || !friend.visible || friend.seen === 'timetable') {
    return [];
  }
  return [{ ...position, level: friend.seen }];
}

export const mockFriendships = {
  listFriends: (): Friend[] => state.friends,
  // The positions of the Friends the User sees, and of the member of the User's Party who is no Friend.
  listPositions: (): Position[] => POSITIONS.flatMap((position) => seenPosition(position)),
  setFriendLevel: (userId: string, level: FriendLevel): void => {
    const friend = friendOrRefuse(userId);
    state.friends = state.friends.map((other) => (other === friend ? atLevel(friend, level) : other));
  },
  // Refused as a whole when one is no Friend.
  recordAsked: (userIds: string[], moment: AskedMoment): void => {
    for (const userId of userIds) {
      friendOrRefuse(userId);
    }
    state.friends = state.friends.map((friend) => {
      if (!userIds.includes(friend.id)) {
        return friend;
      }
      return moment === 'off' ? { ...friend, askedOff: true } : { ...friend, askedPlan: true };
    });
  },
  lowerLevels: (level: FriendLevel): void => {
    const above = new Set(FROM_LEAST.slice(FROM_LEAST.indexOf(level) + 1));
    state.friends = state.friends.map((friend) => (above.has(friend.level) ? atLevel(friend, level) : friend));
  },
  endFriendship: (userId: string): void => {
    const friend = friendOrRefuse(userId);
    state.friends = state.friends.filter((other) => other !== friend);
  },
  findFriendId: (friendId: string): UserSummary => summaryOf(ownerOrRefuse(friendId).id),
  sendFriendRequest: (friendId: string): SentFriendRequest => {
    const owner = ownerOrRefuse(friendId);
    if (owner.id === ME.id) {
      throw refused(400, 'OWN_FRIEND_ID');
    }
    return requestTo(owner);
  },
  // The mock keeps no Holders, so anyone it knows holds a Quest with the User.
  sendFriendRequestToUser: (userId: string): SentFriendRequest => {
    const owner = PEOPLE.find(({ id }) => id === userId && id !== ME.id);
    if (owner === undefined) {
      throw userId === ME.id ? refused(400, 'OWN_USER_ID') : refused(403, 'NOT_FELLOW_HOLDER');
    }
    return requestTo(owner);
  },
  listFriendRequests: (): FriendRequests => {
    const requests = state.requests.toSorted(NEWEST_FIRST);
    return {
      received: requests
        .filter(({ to }) => to === ME.id)
        .map(({ id, from, sentAt }) => ({ id, sender: { id: from, ...summaryOf(from) }, sentAt })),
      sent: requests
        .filter(({ from }) => from === ME.id)
        .map(({ id, to, sentAt }) => ({ id, receiver: { id: to, ...summaryOf(to) }, sentAt })),
    };
  },
  acceptFriendRequest: (requestId: string): void => {
    befriend(requestOrRefuse(requestId, 'to').from);
  },
  declineFriendRequest: (requestId: string): void => {
    requestOrRefuse(requestId, 'to');
  },
  cancelFriendRequest: (requestId: string): void => {
    requestOrRefuse(requestId, 'from');
  },
  createInviteLink: (): InviteLink => {
    state.made += 1;
    const token = `invite-${state.made}`;
    const expiresAt = now().getTime() + LINK_LIFETIME_MS;
    state.links.set(token, { senderId: ME.id, expiresAt, used: false });
    return { url: `https://snunow.example/invite/${token}`, expiresAt: new Date(expiresAt).toISOString() };
  },
  getInviteLink: (token: string): OpenedInviteLink => {
    const link = linkOrRefuse(token);
    return { sender: summaryOf(link.senderId), status: statusOf(link) };
  },
  acceptInviteLink: (token: string): void => {
    const link = linkOrRefuse(token);
    const refusals = {
      own: refused(400, 'OWN_INVITE_LINK'),
      used: refused(409, 'INVITE_LINK_USED'),
      expired: refused(410, 'INVITE_LINK_EXPIRED'),
      friend: refused(409, 'ALREADY_FRIENDS'),
    } as const;
    const status = statusOf(link);
    if (status !== 'usable') {
      throw refusals[status];
    }
    link.used = true;
    befriend(link.senderId);
  },
};
