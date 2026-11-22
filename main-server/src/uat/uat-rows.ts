/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { JoinPolicy, type Prisma, PrismaClient, QuestBoard } from '../generated/prisma/client.js';
import { type Letter, UAT_ACCOUNT_LIST, type UatAccount } from './uat-accounts.js';
import {
  type ClassSpec,
  DAY,
  type Days,
  type EventSpec,
  MINUTE,
  PLACE_NUMBERS,
  type QuestSpec,
  uatId,
} from './uat-specs.js';

// What the UAT preparation empties and writes (uat.seed.ts), one kind of row each.

interface PlaceRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// A Place by the campus map's number.
export type PlaceOf = (number: string) => PlaceRow;

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

// The account as a User past Onboarding who never turned 위치 공유 off, kept with its Sessions when it is there, so
// that the phone stays signed in. A key that signed in before the first run made its User, which is taken as it is.
export async function writeUser(
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
    masterOffAskedAt: null,
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
  const ids = await Promise.all(
    UAT_ACCOUNT_LIST.map(async (account) => {
      const id = await writeUser(prisma, account, masterSwitchOn.includes(account.letter), now);
      return [account.letter, id] as const;
    }),
  );
  return Object.fromEntries(ids) as Users;
}

// The accounts' Users as they are, for a command that leaves the others alone. An account that never signed in and
// was never prepared has none.
export async function readUsers(prisma: PrismaClient): Promise<Partial<Users>> {
  const rows = await prisma.user.findMany({
    where: { googleSubject: { in: UAT_ACCOUNT_LIST.map(({ key }) => key) } },
    select: { id: true, googleSubject: true },
  });
  const found: Partial<Users> = {};
  for (const { letter, key } of UAT_ACCOUNT_LIST) {
    const row = rows.find(({ googleSubject }) => googleSubject === key);
    if (row !== undefined) {
      found[letter] = row.id;
    }
  }
  return found;
}

// Everything Users made: the Quests with their Holders, requests and invitations, the Parties, the friendships and
// Friend Requests, the Invite Links, the Timetables, the tutorial's progress, the room requests, the Notifications,
// the Favorite Events, the watched interests and the Private Zones. The tables that hang on them empty with them. The
// Users, their Sessions and push tokens, the Places, the menus and the events stay.
export async function emptyWhatUsersMade(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE quests, parties, friendships, invite_links, meetups, timetable_classes, tutorial_progress,
       tutorial_quest_progress, room_requests, room_consents, room_notices, notifications, global_event_favorites,
       watched_interests, private_zones CASCADE`,
  );
}

// The Users that are not the accounts, such as the earlier UAT's and the demo's. A failure is told and does not stop
// the preparation: they are in no UAT account's lists once the friendships are gone.
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
  { at, now }: Days,
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
        publishedAt: state === 'draft' ? null : now,
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
  const holders = [quest.leader, ...(quest.members ?? [])];
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    capacity: quest.capacity,
    joinPolicy: quest.joinPolicy ?? JoinPolicy.closed,
    board: quest.joinPolicy === undefined ? null : (quest.board ?? QuestBoard.hobby),
    leader: { connect: { id: leaderId } },
    ...(globalEventId === null ? {} : { globalEvent: { connect: { id: globalEventId } } }),
    createdAt,
    holders: {
      create: holders.map((letter, index) => ({
        userId: users[letter],
        globalEventId,
        joinedAt: new Date(createdAt.getTime() + index * 1000),
      })),
    },
    joinRequests: { create: (quest.asked ?? []).map((letter) => ({ userId: users[letter], sentAt: createdAt })) },
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

// Friends since yesterday, each at the level a new Friend starts at.
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
