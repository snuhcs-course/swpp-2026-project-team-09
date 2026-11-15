/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { Redis } from 'ioredis';
import { koreaDate } from '../assistant/korea-time.js';
import { JoinPolicy, type Prisma, PrismaClient, QuestBoard } from '../generated/prisma/client.js';
import { UAT_ACCOUNT_LIST, type UatAccount } from './uat-accounts.js';
import {
  type ClassSpec,
  DAY,
  type Days,
  type EventSpec,
  type Letter,
  MINUTE,
  type QuestSpec,
  uatId,
} from './uat-scenarios.js';

// What a UAT preparation empties and writes (uat.seed.ts), one kind of row each.

interface PlaceRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// A Place by the campus map's number.
export type PlaceOf = (number: string) => PlaceRow;

const PLACE_NUMBERS = ['301', '302'];

export async function places(prisma: PrismaClient): Promise<PlaceOf> {
  const rows = await prisma.place.findMany({ where: { origin: 'campus_map', number: { in: PLACE_NUMBERS } } });
  const byNumber = new Map(rows.map((row) => [row.number, row]));
  const missing = PLACE_NUMBERS.filter((number) => !byNumber.has(number));
  if (missing.length > 0) {
    throw new Error(`The UAT data wrote nothing. It needs the campus map's Places ${missing.join(', ')}.`);
  }
  return (number) => {
    const row = byNumber.get(number);
    if (row === undefined) {
      throw new Error(`No Place ${number}`);
    }
    return row;
  };
}

export type Users = Record<Letter, string>;

// The account as a User past Onboarding, kept with its Sessions when it is there, so that the phone stays signed in.
// A key that signed in before the first run made its User, which is taken as it is.
async function writeUser(
  prisma: PrismaClient,
  account: UatAccount,
  masterSwitchOn: boolean,
  now: Date,
): Promise<string> {
  const profile = {
    email: account.email,
    googleName: account.googleName,
    name: account.name,
    department: account.department,
    admissionYear: 2025,
    hashtags: [],
    friendId: account.friendId,
    masterSwitchOn,
  };
  const existing = await prisma.user.findUnique({ where: { googleSubject: account.key } });
  if (existing === null) {
    const id = uatId(`user:${account.key}`);
    await prisma.user.create({ data: { id, googleSubject: account.key, onboardedAt: now, ...profile } });
    return id;
  }
  await prisma.user.update({
    where: { id: existing.id },
    data: { onboardedAt: existing.onboardedAt ?? now, ...profile },
  });
  return existing.id;
}

export async function writeUsers(prisma: PrismaClient, masterSwitchOn: readonly Letter[], now: Date): Promise<Users> {
  const [A = '', B = '', C = ''] = await Promise.all(
    UAT_ACCOUNT_LIST.map((account) => writeUser(prisma, account, masterSwitchOn.includes(account.letter), now)),
  );
  return { A, B, C };
}

// Everything Users made: the Quests with their Holders, requests and invitations, the Parties, the friendships and
// Friend Requests, the Invite Links, the Timetables, the tutorial's progress and the room requests. The tables that
// hang on them empty with them. The Users, their Sessions, the Places, the menus and the events stay.
export async function emptyWhatUsersMade(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE quests, parties, friendships, invite_links, meetups, timetable_classes, tutorial_progress,
       tutorial_quest_progress, room_requests, room_consents, room_notices CASCADE`,
  );
}

// The Users that are not the three accounts, such as the Heuristic Evaluation's and the demo's. A failure is told and
// does not stop the preparation: they are in no UAT account's lists once the friendships are gone.
export async function removeOtherUsers(prisma: PrismaClient, users: Users): Promise<string | null> {
  const keep = Object.values(users);
  try {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { session: { userId: { notIn: keep } } } }),
      prisma.session.deleteMany({ where: { userId: { notIn: keep } } }),
      prisma.user.deleteMany({ where: { id: { notIn: keep } } }),
    ]);
    return null;
  } catch (error) {
    return `다른 계정을 지우지 못했어요 (진행에는 지장 없음): ${String(error).split('\n')[0] ?? ''}`;
  }
}

// The UAT's own events of an earlier run go, and every other published event that touches today or tomorrow is
// cancelled, so that the lists and the Assistant show only what the sheet names for those days. Later days keep
// their collected events.
export async function writeEvents(
  prisma: PrismaClient,
  place: PlaceOf,
  { at }: Days,
  events: readonly EventSpec[],
): Promise<void> {
  await prisma.globalEvent.deleteMany({ where: { title: { startsWith: '[UAT]' } } });
  await prisma.globalEvent.updateMany({
    where: {
      state: 'published',
      startsAt: { lt: at(2, '00:00') },
      OR: [{ endsAt: { gte: at(0, '00:00') } }, { endsAt: null, startsAt: { gte: at(0, '00:00') } }],
    },
    data: { state: 'cancelled', version: { increment: 1 } },
  });
  await prisma.globalEvent.createMany({
    data: events.map(({ id, title, startsAt, endsAt, place: number, state }) => {
      const { name, latitude, longitude } = place(number);
      return {
        id,
        title,
        description: 'UAT를 위해 준비한 행사입니다.',
        startsAt,
        endsAt,
        place: name,
        latitude,
        longitude,
        state,
        // As an Administrator's own: a Draft has no route yet.
        publicationRoute: state === 'draft' ? null : ('administrator' as const),
      };
    }),
  });
}

function questRow(quest: QuestSpec, place: PlaceOf, users: Users, createdAt: Date): Prisma.QuestCreateInput {
  const leaderId = users[quest.leader];
  const globalEventId = quest.globalEventId ?? null;
  const subQuest: Prisma.SubQuestCreateWithoutQuestInput =
    globalEventId === null
      ? {
          attending: false,
          title: quest.title,
          startsAt: quest.startsAt ?? null,
          endsAt: null,
          ...(quest.place === undefined ? {} : { place: { connect: { id: place(quest.place).id } } }),
          placeLabel: quest.placeLabel ?? null,
          createdAt,
        }
      : { attending: true, createdAt };
  return {
    title: quest.title,
    description: quest.description ?? '',
    capacity: quest.capacity,
    joinPolicy: quest.joinPolicy ?? JoinPolicy.closed,
    board: quest.joinPolicy === undefined ? null : (quest.board ?? QuestBoard.hobby),
    leader: { connect: { id: leaderId } },
    ...(globalEventId === null ? {} : { globalEvent: { connect: { id: globalEventId } } }),
    createdAt,
    holders: { create: [{ userId: leaderId, globalEventId, joinedAt: createdAt }] },
    subQuests: { create: subQuest },
  };
}

// The recruiting posts ("파티") in the order given, the first the newest on its Board.
export async function writeQuests(
  prisma: PrismaClient,
  place: PlaceOf,
  users: Users,
  now: Date,
  quests: readonly QuestSpec[],
): Promise<void> {
  await prisma.$transaction(
    quests.map((quest, index) =>
      prisma.quest.create({
        data: questRow(quest, place, users, new Date(now.getTime() - (index + 1) * MINUTE)),
      }),
    ),
  );
}

// Friends since yesterday, sharing with each other as new Friends do.
export async function writeFriendships(
  prisma: PrismaClient,
  users: Users,
  now: Date,
  pairs: readonly [Letter, Letter][],
): Promise<void> {
  const since = new Date(now.getTime() - DAY);
  await prisma.friendship.createMany({
    data: pairs.map(([one, other]) => {
      const [userAId = '', userBId = ''] = [users[one], users[other]].toSorted();
      return { userAId, userBId, senderId: users[one], sentAt: since, acceptedAt: since };
    }),
  });
}

export async function writeClasses(
  prisma: PrismaClient,
  place: PlaceOf,
  users: Users,
  classes: readonly ClassSpec[],
): Promise<void> {
  await prisma.$transaction(
    classes.map(({ owner, courseName, place: number, ...time }) =>
      prisma.timetableClass.create({
        data: { userId: users[owner], courseName, times: { create: [{ ...time, placeId: place(number).id }] } },
      }),
    ),
  );
}

// Every Restaurant's menus of the day, so that the day has none in the app and for the Assistant until a Collection
// writes them again.
export async function removeMenus(prisma: PrismaClient, day: string): Promise<void> {
  await prisma.restaurantDay.deleteMany({ where: { date: new Date(`${day}T00:00:00Z`) } });
}

// As SignalsService sends a signal, over NestJS's Redis messaging.
export function signal(redis: Redis, data: { userIds?: string[]; name: string }): Promise<number> {
  return redis.publish('signal', JSON.stringify({ pattern: 'signal', data }));
}

// What the phones and the Assistant keep outside the database: each account's position and today's count of
// Assistant messages. Then every connected app is told to fetch its lists again.
export async function clearKept(redis: Redis, users: Users, now: Date): Promise<void> {
  const userIds = Object.values(users);
  await redis.del(
    ...userIds.map((id) => `position:${id}`),
    ...userIds.map((id) => `assistant:messages:${id}:${koreaDate(now)}`),
  );
  await Promise.all([
    signal(redis, { name: 'global-events-changed' }),
    ...['quests-changed', 'party-changed', 'friends-changed'].map((name) => signal(redis, { userIds, name })),
  ]);
}
