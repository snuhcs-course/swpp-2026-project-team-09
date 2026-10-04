import { PartyJoinPolicy, Prisma, User } from '../../generated/prisma/client.js';

export interface PartyMarkDto {
  questId: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
}

export interface PartyMemberDto {
  id: string;
  name: string;
  department: string;
  leader: boolean;
  // Whether the reading member can see this one on the map now, never why not.
  visible: boolean;
}

export interface PartyDto {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: PartyJoinPolicy;
  mark: PartyMarkDto | null;
  // The reading member's own switch for the Party.
  sharing: boolean;
  // In the order they joined.
  members: PartyMemberDto[];
}

// A Party as a list shows it to anyone.
export interface ListedPartyDto {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: PartyJoinPolicy;
  memberCount: number;
  mark: PartyMarkDto | null;
}

const MARK_INCLUDE = {
  quest: { include: { globalEvent: { select: { id: true, title: true } } } },
} satisfies Prisma.PartyInclude;

export const PARTY_INCLUDE = {
  ...MARK_INCLUDE,
  members: {
    include: { user: { select: { id: true, name: true, department: true } } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.PartyInclude;

export const LISTED_PARTY_INCLUDE = {
  ...MARK_INCLUDE,
  members: { select: { id: true } },
} satisfies Prisma.PartyInclude;

type StoredParty = Prisma.PartyGetPayload<{ include: typeof PARTY_INCLUDE }>;

type ListedParty = Prisma.PartyGetPayload<{ include: typeof LISTED_PARTY_INCLUDE }>;

function markOf({ quest }: Prisma.PartyGetPayload<{ include: typeof MARK_INCLUDE }>): PartyMarkDto | null {
  return quest === null ? null : { questId: quest.id, title: quest.title, globalEvent: quest.globalEvent };
}

// As the member `userId` reads it, who sees the Users in `visible` now.
export function toPartyDto(party: StoredParty, userId: string, visible: ReadonlySet<string>): PartyDto {
  return {
    id: party.id,
    title: party.title,
    capacity: party.capacity,
    joinPolicy: party.joinPolicy,
    mark: markOf(party),
    sharing: party.members.some((member) => member.userId === userId && member.sharing),
    members: party.members.map(({ user }) => ({
      ...user,
      leader: user.id === party.leaderId,
      visible: visible.has(user.id),
    })),
  };
}

export function toListedPartyDto(party: ListedParty): ListedPartyDto {
  return {
    id: party.id,
    title: party.title,
    capacity: party.capacity,
    joinPolicy: party.joinPolicy,
    memberCount: party.members.length,
    mark: markOf(party),
  };
}

// Who asked to join, or who leads the Party of an invitation.
export type UserSummaryDto = Pick<User, 'id' | 'name' | 'department'>;

export const USER_SUMMARY = { select: { id: true, name: true, department: true } } satisfies Prisma.UserDefaultArgs;
