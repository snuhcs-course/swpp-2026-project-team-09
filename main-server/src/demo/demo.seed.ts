// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { type Place, PrismaClient, type User } from '../generated/prisma/client.js';
import {
  DEMO_ACCOUNT_SHARE,
  DEMO_FRIENDSHIPS,
  DEMO_GLOBAL_EVENTS,
  DEMO_PARTY,
  DEMO_USERS,
  type DemoTime,
  demoId,
} from './demo-data.js';
import { DEMO_QUESTS, type DemoQuest } from './demo-quests.js';

// SignalsService, or what a test watches in its place.
export interface DemoSignals {
  send(to: readonly string[] | 'everyone', name: string): void;
}

type PlaceOf = (number: string) => Place;

const MINUTE = 60 * 1000;
const HALF_HOUR = 30 * MINUTE;
const SEOUL_OFFSET = 9 * 60 * MINUTE;

export function demoUserId(key: string): string {
  return demoId(`user:${key}`);
}

export function demoSessionId(key: string): string {
  return demoId(`session:${key}`);
}

function at(now: Date, time: DemoTime): Date {
  if ('hours' in time) {
    return new Date(Math.ceil(now.getTime() / HALF_HOUR) * HALF_HOUR + time.hours * 60 * MINUTE);
  }
  const day = new Date(now.getTime() + SEOUL_OFFSET + time.days * 24 * 60 * MINUTE).toISOString().slice(0, 10);
  return new Date(`${day}T${time.at}:00+09:00`);
}

// The two Users of a friendship in the order the table keeps them.
function pair(oneId: string, otherId: string): { userAId: string; userBId: string } {
  return oneId < otherId ? { userAId: oneId, userBId: otherId } : { userAId: otherId, userBId: oneId };
}

async function placesByNumber(prisma: PrismaClient): Promise<PlaceOf> {
  const places = await prisma.place.findMany({ where: { origin: 'campus_map', number: { not: null } } });
  return (number) => {
    const place = places.find((candidate) => candidate.number === number);
    if (place === undefined) {
      throw new Error(`No Place ${number} of the campus map: load the seed first (pnpm db:seed)`);
    }
    return place;
  };
}

async function seedUsers(prisma: PrismaClient, now: Date): Promise<void> {
  for (const [index, user] of DEMO_USERS.entries()) {
    const id = demoUserId(user.key);
    const profile = {
      name: user.name,
      department: user.department,
      admissionYear: user.admissionYear,
      hashtags: user.hashtags,
      masterSwitchOn: user.masterSwitchOn,
      onboardedAt: now,
    };
    const create = {
      id,
      googleSubject: `demo-${index + 1}`,
      email: `${user.key}@demo.invalid`,
      friendId: user.friendId,
      googleName: `${user.name} / 학생 / ${user.department}`,
      ...profile,
    };
    const sessionId = demoSessionId(user.key);
    // oxlint-disable-next-line no-await-in-loop -- a User before the rows that point at it
    await prisma.$transaction([
      prisma.user.upsert({ where: { id }, create, update: profile }),
      prisma.session.upsert({
        where: { id: sessionId },
        create: { id: sessionId, userId: id },
        update: { endedAt: null, endReason: null },
      }),
    ]);
  }
  await prisma.$transaction(
    DEMO_FRIENDSHIPS.map(([one, other]) => {
      const users = pair(demoUserId(one), demoUserId(other));
      return prisma.friendship.upsert({
        where: { userAId_userBId: users },
        create: { ...users, senderId: demoUserId(one), acceptedAt: now },
        update: { acceptedAt: now, userASharing: true, userBSharing: true },
      });
    }),
  );
}

async function seedGlobalEvents(prisma: PrismaClient, place: PlaceOf, now: Date): Promise<void> {
  await prisma.$transaction(
    DEMO_GLOBAL_EVENTS.map((event) => {
      const id = demoId(`global-event:${event.key}`);
      const { name, latitude, longitude } = place(event.place);
      const values = {
        title: event.title,
        description: event.description,
        startsAt: at(now, event.startsAt),
        endsAt: at(now, event.endsAt),
        place: name,
        latitude,
        longitude,
        state: 'published' as const,
      };
      return prisma.globalEvent.upsert({
        where: { id },
        create: { id, ...values },
        // An Administrator's change from the version before is refused, as after any change.
        update: { ...values, version: { increment: 1 } },
      });
    }),
  );
}

async function seedQuest(
  prisma: PrismaClient,
  place: PlaceOf,
  now: Date,
  quest: DemoQuest,
  index: number,
): Promise<void> {
  const id = demoId(`quest:${quest.key}`);
  const globalEventId = quest.globalEvent === undefined ? null : demoId(`global-event:${quest.globalEvent}`);
  const values = {
    title: quest.title,
    description: quest.description,
    board: quest.board,
    joinPolicy: quest.joinPolicy,
    capacity: quest.capacity,
    leaderId: demoUserId(quest.holders[0] ?? ''),
    // Newest first on the boards, all made today.
    createdAt: new Date(now.getTime() - (index + 1) * 7 * MINUTE),
  };
  const subQuests = [
    ...(globalEventId === null ? [] : [{ id: demoId(`sub-quest:${quest.key}:attending`), attending: true }]),
    ...quest.subQuests.map((subQuest, position) => ({
      id: demoId(`sub-quest:${quest.key}:${position}`),
      attending: false,
      title: subQuest.title,
      startsAt: at(now, subQuest.startsAt),
      endsAt: at(now, subQuest.endsAt),
      placeId: place(subQuest.place).id,
    })),
  ];
  // The Holders and the Sub Quests one after the other, in the order they entered and were added.
  await prisma.$transaction([
    prisma.quest.upsert({ where: { id }, create: { id, globalEventId, ...values }, update: values }),
    ...quest.holders.map((holder) =>
      prisma.questHolder.upsert({
        where: { questId_userId: { questId: id, userId: demoUserId(holder) } },
        create: { questId: id, userId: demoUserId(holder), globalEventId },
        update: {},
      }),
    ),
    ...subQuests.map(({ id: subQuestId, ...subQuest }, position) => {
      const createdAt = new Date(values.createdAt.getTime() + position * 1000);
      return prisma.subQuest.upsert({
        where: { id: subQuestId },
        create: { id: subQuestId, questId: id, createdAt, ...subQuest },
        update: { createdAt, ...subQuest },
      });
    }),
  ]);
}

async function seedParty(prisma: PrismaClient): Promise<void> {
  const partyId = demoId(`party:${DEMO_PARTY.key}`);
  const members = DEMO_QUESTS.find(({ key }) => key === DEMO_PARTY.quest)?.holders ?? [];
  const party = {
    title: DEMO_PARTY.title,
    capacity: DEMO_PARTY.capacity,
    joinPolicy: DEMO_PARTY.joinPolicy,
    leaderId: demoUserId(members[0] ?? ''),
    questId: demoId(`quest:${DEMO_PARTY.quest}`),
  };
  await prisma.$transaction([
    prisma.party.upsert({ where: { id: partyId }, create: { id: partyId, ...party }, update: party }),
    ...members.map((member) =>
      prisma.partyMember.upsert({
        where: { userId: demoUserId(member) },
        create: { partyId, userId: demoUserId(member) },
        update: { partyId, sharing: true },
      }),
    ),
  ]);
}

// Writes the demo data, each row in place by its stable id, with the times counted from `now`.
export async function seedDemo(prisma: PrismaClient, signals: DemoSignals, now = new Date()): Promise<void> {
  const place = await placesByNumber(prisma);
  await seedUsers(prisma, now);
  await seedGlobalEvents(prisma, place, now);
  for (const [index, quest] of DEMO_QUESTS.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- few Quests
    await seedQuest(prisma, place, now, quest, index);
  }
  await seedParty(prisma);
  signals.send('everyone', 'global-events-changed');
}

// Leaves what already lies between the account and a demo User as it is.
async function prepareAccount(prisma: PrismaClient, place: PlaceOf, now: Date, account: User): Promise<void> {
  const befriend = (key: string, accepted: boolean): Promise<unknown> => {
    const users = pair(account.id, demoUserId(key));
    return prisma.friendship.upsert({
      where: { userAId_userBId: users },
      create: { ...users, senderId: demoUserId(key), acceptedAt: accepted ? now : null },
      update: {},
    });
  };
  await Promise.all([
    ...DEMO_ACCOUNT_SHARE.friends.map((key) => befriend(key, true)),
    ...DEMO_ACCOUNT_SHARE.friendRequestsFrom.map((key) => befriend(key, false)),
  ]);
  const questId = demoId(`quest:${DEMO_ACCOUNT_SHARE.invitedInto}`);
  const where = { questId_userId: { questId, userId: account.id } };
  if ((await prisma.questHolder.findUnique({ where })) === null) {
    await prisma.questInvitation.upsert({ where, create: { questId, userId: account.id }, update: {} });
  }
  const { meetup } = DEMO_ACCOUNT_SHARE;
  const meetupId = demoId(`meetup:${account.id}`);
  await prisma.meetup.upsert({
    where: { id: meetupId },
    create: {
      id: meetupId,
      proposerId: demoUserId(meetup.proposer),
      receiverId: account.id,
      title: meetup.title,
      startsAt: at(now, meetup.startsAt),
      endsAt: at(now, meetup.endsAt),
      placeId: place(meetup.place).id,
    },
    update: {},
  });
}

// Gives each onboarded User named by `emails`, but those `except`, their share of the demo (README.md: Demo data), and
// answers their ids.
export async function prepareDemoAccounts(
  prisma: PrismaClient,
  emails: readonly string[],
  signals: DemoSignals,
  { now = new Date(), except = new Set<string>() }: { now?: Date; except?: ReadonlySet<string> } = {},
): Promise<string[]> {
  if (emails.length === 0) {
    return [];
  }
  const accounts = await prisma.user.findMany({
    where: {
      onboardedAt: { not: null },
      id: { notIn: [...except] },
      OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
    },
  });
  const place = await placesByNumber(prisma);
  for (const account of accounts) {
    // oxlint-disable-next-line no-await-in-loop -- one account at a time
    await prepareAccount(prisma, place, now, account);
    for (const name of ['friends-changed', 'quests-changed', 'meetups-changed', 'party-changed']) {
      signals.send([account.id], name);
    }
  }
  return accounts.map(({ id }) => id);
}
