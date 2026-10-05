import { JoinPolicy, Prisma, User } from '../../generated/prisma/client.js';

export interface PartyQuestDto {
  id: string;
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
  joinPolicy: JoinPolicy;
  quest: PartyQuestDto | null;
  // The reading member's own switch for the Party.
  sharing: boolean;
  // In the order they entered.
  members: PartyMemberDto[];
}

// A Party as a User who can see it and is not in it reads it in their list. No position.
export interface VisiblePartyDto {
  id: string;
  title: string;
  memberCount: number;
  capacity: number;
  joinPolicy: JoinPolicy;
  quest: PartyQuestDto | null;
  // Whether the reader holds the Party's Quest.
  holdsQuest: boolean;
  // The reader's Friends among the members, in the order they entered.
  friends: { id: string; name: string; department: string }[];
}

const PARTY_QUEST_INCLUDE = {
  quest: { include: { globalEvent: { select: { id: true, title: true } } } },
} satisfies Prisma.PartyInclude;

export const PARTY_INCLUDE = {
  ...PARTY_QUEST_INCLUDE,
  members: {
    include: { user: { select: { id: true, name: true, department: true } } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.PartyInclude;

type VisiblePartyInclude = typeof PARTY_INCLUDE & {
  quest: {
    include: typeof PARTY_QUEST_INCLUDE.quest.include & {
      holders: { where: { userId: string }; select: { id: true } };
    };
  };
};

// As PARTY_INCLUDE, with the reader among the Holders of the Party's Quest, if the reader holds it.
export function visiblePartyInclude(readerId: string): VisiblePartyInclude {
  return {
    ...PARTY_INCLUDE,
    quest: {
      include: { ...PARTY_QUEST_INCLUDE.quest.include, holders: { where: { userId: readerId }, select: { id: true } } },
    },
  } satisfies Prisma.PartyInclude;
}

type StoredParty = Prisma.PartyGetPayload<{ include: typeof PARTY_INCLUDE }>;

export type VisibleParty = Prisma.PartyGetPayload<{ include: VisiblePartyInclude }>;

function questOf({ quest }: Prisma.PartyGetPayload<{ include: typeof PARTY_QUEST_INCLUDE }>): PartyQuestDto | null {
  return quest === null ? null : { id: quest.id, title: quest.title, globalEvent: quest.globalEvent };
}

// As the member `userId` reads it, who sees the Users in `visible` now.
export function toPartyDto(party: StoredParty, userId: string, visible: ReadonlySet<string>): PartyDto {
  return {
    id: party.id,
    title: party.title,
    capacity: party.capacity,
    joinPolicy: party.joinPolicy,
    quest: questOf(party),
    sharing: party.members.some((member) => member.userId === userId && member.sharing),
    members: party.members.map(({ user }) => ({
      ...user,
      leader: user.id === party.leaderId,
      visible: visible.has(user.id),
    })),
  };
}

// As the reader of visiblePartyInclude, a Friend of the Users `friendIds`, reads it.
export function toVisiblePartyDto(party: VisibleParty, friendIds: ReadonlySet<string>): VisiblePartyDto {
  return {
    id: party.id,
    title: party.title,
    memberCount: party.members.length,
    capacity: party.capacity,
    joinPolicy: party.joinPolicy,
    quest: questOf(party),
    holdsQuest: (party.quest?.holders.length ?? 0) > 0,
    friends: party.members.flatMap(({ user }) => (friendIds.has(user.id) ? [user] : [])),
  };
}

// Who asked to enter, or who leads the Party of an invitation.
export type UserSummaryDto = Pick<User, 'id' | 'name' | 'department'>;

export const USER_SUMMARY = { select: { id: true, name: true, department: true } } satisfies Prisma.UserDefaultArgs;
