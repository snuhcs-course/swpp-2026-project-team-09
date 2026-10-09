// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { ApiError } from '@/api/errors';
import type { Friend, InviteLink, OpenedInviteLink, Position, SentFriendRequest, UserSummary } from '@/api/types';
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
  requests: Request[];
  links: Map<string, Link>;
  made: number;
}

function firstState(): State {
  return {
    friends: [...FRIENDS],
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

// Both switches start on, so a new Friend is seen when the mock has a position for them.
function befriend(id: string): void {
  const { name, department } = personOf(id);
  state.requests = state.requests.filter(({ from, to }) => from !== id && to !== id);
  state.friends = [...state.friends, { id, name, department, sharing: true, visible: hasPosition(id) }].toSorted(
    (one, other) => one.name.localeCompare(other.name, 'ko'),
  );
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

export const mockFriendships = {
  listFriends: (): Friend[] => state.friends,
  // The positions of the Friends the User sees, and of the member of the User's Party who is no Friend.
  listPositions: (): Position[] =>
    POSITIONS.filter(
      ({ userId }) =>
        !FRIENDS.some(({ id }) => id === userId) || state.friends.some(({ id, visible }) => id === userId && visible),
    ),
  setFriendSharing: (userId: string, on: boolean): void => {
    const friend = friendOrRefuse(userId);
    state.friends = state.friends.map((other) =>
      other === friend ? { ...friend, sharing: on, visible: on && hasPosition(userId) } : other,
    );
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
  },
  listFriendRequests: (): FriendRequests => {
    const requests = state.requests.toSorted(NEWEST_FIRST);
    return {
      received: requests
        .filter(({ to }) => to === ME.id)
        .map(({ id, from, sentAt }) => ({ id, sender: summaryOf(from), sentAt })),
      sent: requests
        .filter(({ from }) => from === ME.id)
        .map(({ id, to, sentAt }) => ({ id, receiver: summaryOf(to), sentAt })),
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
