/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { v5 as uuidv5 } from 'uuid';
import { demoId } from '../demo/demo-data.js';
import { type Prisma, PrismaClient, Weekday } from '../generated/prisma/client.js';
import { HE_ACCOUNTS, type HeAccount, type HeMeeting, type HeTimetable } from './he-accounts.js';
import { HE_QUESTS, type HeQuest } from './he-quests.js';

const ID_NAMESPACE = '82529fdd-02fb-47b8-9185-f8d34df6c4b9';

// When the friendships were made: a fixed time of the evaluation's week, never the run's.
const MADE_AT = new Date('2026-11-03T12:00:00+09:00');

// When the Quests were made, on the morning of the evaluation: #1 a minute before, the newest on the Boards.
const QUESTS_MADE_AT = new Date('2026-11-04T09:00:00+09:00');

// A Class given a start alone.
const CLASS_MINUTES = 75;

// The weekdays each column of a Timetable is held on.
const HELD_ON: Record<keyof HeTimetable, Weekday[]> = {
  wednesday: [Weekday.monday, Weekday.wednesday],
  thursday: [Weekday.tuesday, Weekday.thursday],
  friday: [Weekday.friday],
};

// A Place's id by the campus map's number.
type PlaceOf = (number: string) => string;

// Every meeting of the Timetable, with the column it is in.
function meetingsOf(timetable: HeTimetable): [keyof HeTimetable, HeMeeting][] {
  return (['wednesday', 'thursday', 'friday'] as const).flatMap((column) =>
    timetable[column].map((meeting): [keyof HeTimetable, HeMeeting] => [column, meeting]),
  );
}

// The same id in every database and every run, which is how a later run finds what an earlier one wrote.
function heId(name: string): string {
  return uuidv5(`he:${name}`, ID_NAMESPACE);
}

function userId(key: string): string {
  return heId(`user:${key}`);
}

// The two Users of a friendship in the order the table keeps them.
function pair(oneId: string, otherId: string): { userAId: string; userBId: string } {
  return oneId < otherId ? { userAId: oneId, userBId: otherId } : { userAId: otherId, userBId: oneId };
}

async function missingUsers(prisma: PrismaClient): Promise<Prisma.UserCreateManyInput[]> {
  const ids = HE_ACCOUNTS.map(({ key }) => userId(key));
  const found = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const existing = new Set(found.map(({ id }) => id));
  return HE_ACCOUNTS.filter(({ key }) => !existing.has(userId(key))).map((account) => ({
    id: userId(account.key),
    googleSubject: account.key,
    email: account.email,
    googleName: account.googleName,
    friendId: account.friendId,
    name: account.name,
    department: account.department,
  }));
}

async function missingFriendships(prisma: PrismaClient): Promise<Prisma.FriendshipCreateManyInput[]> {
  const friendships = HE_ACCOUNTS.flatMap(({ key, friends }) =>
    friends.map((friend) => ({
      ...pair(userId(key), userId(friend)),
      senderId: userId(key),
      sentAt: MADE_AT,
      acceptedAt: MADE_AT,
    })),
  );
  const found = await prisma.friendship.findMany({
    where: { OR: friendships.map(({ userAId, userBId }) => ({ userAId, userBId })) },
    select: { userAId: true, userBId: true },
  });
  const existing = new Set(found.map(({ userAId, userBId }) => `${userAId}:${userBId}`));
  return friendships.filter(({ userAId, userBId }) => !existing.has(`${userAId}:${userBId}`));
}

function endOf({ start, end }: HeMeeting): string {
  if (end !== undefined) {
    return end;
  }
  const [hours = 0, minutes = 0] = start.split(':').map(Number);
  const total = hours * 60 + minutes + CLASS_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

interface HeClass {
  id: string;
  key: string;
  courseName: string;
  times: Prisma.ClassTimeCreateManyInput[];
}

// One Class for each course of the account, with a time on each weekday it is held.
function classesOf({ key, timetable }: HeAccount, place: PlaceOf): HeClass[] {
  const classes = new Map<string, HeClass>();
  for (const [column, meeting] of meetingsOf(timetable)) {
    const id = heId(`class:${key}:${meeting.course}`);
    const added = classes.get(meeting.course) ?? { id, key, courseName: meeting.course, times: [] };
    added.times.push(
      ...HELD_ON[column].map((weekday) => ({
        id: heId(`class-time:${key}:${meeting.course}:${weekday}`),
        classId: id,
        weekday,
        startTime: meeting.start,
        endTime: endOf(meeting),
        placeId: place(meeting.place),
      })),
    );
    classes.set(meeting.course, added);
  }
  return [...classes.values()];
}

// A Class the account still has is left as it is, with its times.
async function missingClasses(prisma: PrismaClient, place: PlaceOf): Promise<HeClass[]> {
  const classes = HE_ACCOUNTS.flatMap((account) => classesOf(account, place));
  const found = await prisma.timetableClass.findMany({
    where: { id: { in: classes.map(({ id }) => id) } },
    select: { id: true },
  });
  const existing = new Set(found.map(({ id }) => id));
  return classes.filter(({ id }) => !existing.has(id));
}

const inKorea = (time: string): Date => new Date(`${time}:00+09:00`);

interface QuestRows {
  id: string;
  quest: Prisma.QuestCreateManyInput;
  holder: Prisma.QuestHolderCreateManyInput;
  subQuest: Prisma.SubQuestCreateManyInput;
}

function rowsOf({ number, leader, subQuest, ...quest }: HeQuest, place: PlaceOf): QuestRows {
  const id = heId(`quest:${number}`);
  const createdAt = new Date(QUESTS_MADE_AT.getTime() - number * 60 * 1000);
  const globalEventId = 'globalEvent' in subQuest ? demoId(`global-event:${subQuest.globalEvent}`) : null;
  const leaderId = userId(leader);
  // The attending Sub Quest reads its title, time and place from the Global Event.
  const content =
    'globalEvent' in subQuest
      ? { attending: true }
      : {
          attending: false,
          title: subQuest.title,
          startsAt: inKorea(subQuest.startsAt),
          endsAt: inKorea(subQuest.endsAt),
          placeId: place(subQuest.place),
        };
  return {
    id,
    quest: { id, ...quest, leaderId, globalEventId, createdAt },
    holder: { id: heId(`quest-holder:${number}`), questId: id, userId: leaderId, globalEventId, joinedAt: createdAt },
    subQuest: { id: heId(`sub-quest:${number}`), questId: id, createdAt, ...content },
  };
}

// A Quest that is there is left as it is, with its Holders and Sub Quests.
async function missingQuests(prisma: PrismaClient, place: PlaceOf): Promise<QuestRows[]> {
  const quests = HE_QUESTS.map((quest) => rowsOf(quest, place));
  const found = await prisma.quest.findMany({
    where: { id: { in: quests.map(({ id }) => id) } },
    select: { id: true },
  });
  const existing = new Set(found.map(({ id }) => id));
  return quests.filter(({ id }) => !existing.has(id));
}

// The number before a hyphen, by which 43-1 comes after 43 and before 58.
const leading = (number: string): number => Number(number.split('-')[0]);

// The campus map's numbers of the Places the data names, in the order of the numbers.
function placeNumbers(): string[] {
  const numbers = new Set([
    ...HE_ACCOUNTS.flatMap(({ timetable }) => meetingsOf(timetable).map(([, { place }]) => place)),
    ...HE_QUESTS.flatMap(({ subQuest }) => ('place' in subQuest ? [subQuest.place] : [])),
  ]);
  return [...numbers].toSorted((a, b) => leading(a) - leading(b) || a.localeCompare(b));
}

const GLOBAL_EVENTS = HE_QUESTS.flatMap(({ subQuest }) => ('globalEvent' in subQuest ? [subQuest.globalEvent] : []));

// What other steps write first: the campus map's Places, which the seed files load, and the demo Global Events, which
// the demo data holds. Stops with all that is missing named, before anything is written.
async function prerequisites(prisma: PrismaClient): Promise<PlaceOf> {
  const numbers = placeNumbers();
  const [places, events] = await Promise.all([
    prisma.place.findMany({ where: { origin: 'campus_map', number: { in: numbers } } }),
    prisma.globalEvent.findMany({ where: { id: { in: GLOBAL_EVENTS.map((key) => demoId(`global-event:${key}`)) } } }),
  ]);
  const ids = new Map(places.map(({ number, id }) => [number, id]));
  const missingPlaces = numbers.filter((number) => !ids.has(number));
  const foundEvents = new Set(events.map(({ id }) => id));
  const missingEvents = GLOBAL_EVENTS.filter((key) => !foundEvents.has(demoId(`global-event:${key}`)));
  const missing = [
    ...(missingPlaces.length === 0
      ? []
      : [`the campus map's Places ${missingPlaces.join(', ')} (load the seed files: pnpm db:seed)`]),
    ...(missingEvents.length === 0
      ? []
      : [`the demo Global Event ${missingEvents.join(', ')} (write the demo data: the demo profile's demo-seed)`]),
  ];
  if (missing.length > 0) {
    throw new Error(`The HE seed wrote nothing. It needs ${missing.join(' and ')}.`);
  }
  return (number) => ids.get(number) ?? '';
}

// How many rows of each kind a run wrote.
export interface HeSeeded {
  users: number;
  friendships: number;
  classes: number;
  quests: number;
}

// Writes what is missing of the HE data, each row found by an id of its own, and changes nothing that is there.
export async function seedHe(prisma: PrismaClient): Promise<HeSeeded> {
  const place = await prerequisites(prisma);
  const users = await missingUsers(prisma);
  const friendships = await missingFriendships(prisma);
  const classes = await missingClasses(prisma, place);
  const quests = await missingQuests(prisma, place);
  await prisma.$transaction([
    prisma.user.createMany({ data: users }),
    prisma.friendship.createMany({ data: friendships }),
    prisma.timetableClass.createMany({
      data: classes.map(({ id, key, courseName }) => ({ id, userId: userId(key), courseName })),
    }),
    prisma.classTime.createMany({ data: classes.flatMap(({ times }) => times) }),
    prisma.quest.createMany({ data: quests.map(({ quest }) => quest) }),
    prisma.questHolder.createMany({ data: quests.map(({ holder }) => holder) }),
    prisma.subQuest.createMany({ data: quests.map(({ subQuest }) => subQuest) }),
  ]);
  return { users: users.length, friendships: friendships.length, classes: classes.length, quests: quests.length };
}
