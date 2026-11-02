/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { connect } from '../../test/containers.js';
import { befriend, signInUser, type TestUser } from '../../test/friends.js';
import { ownQuest, storeEvent } from '../../test/quests.js';
import { addClass } from '../../test/timetable.js';
import { type Seeded, seedOf, type World } from '../world.ts';
import { type P6Person, type P6User, type P6WorldData, p6WorldData, type TutorialProgressData } from './world-data.ts';

// The P6 world (P06 spec, "The P6 eval suite"): eval/p6/world.yaml, seeded with the test helpers into a fresh database
// beside the shared Places seed. The labels are drafted from that file, so nothing here decides anything: it only stores
// what the file says, as the app would.
//
// The 학번, registered names and 소속 are P06 ticket 01's columns. Until it lands they are missing, and the world stores
// only what the database holds (the admission year and the tutorial progress); the file, and so the frozen answers, do
// not change. The library is the phone's, so the world holds none of it.

type Seeds = Record<string, Seeded>;

const inKorea = (time: string): Date => new Date(`${time}:00+09:00`);

// The profile columns of ticket 01, by their database names.
const PROFILE_COLUMNS = {
  registeredName: 'registered_name',
  studentNumber: 'student_number',
  affiliation: 'affiliation',
};

async function profileColumns(prisma: PrismaClient): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<{ column_name: string; udt_name: string }[]>`
    SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'users'`;
  return new Map(rows.map(({ column_name: column, udt_name: type }) => [column, type]));
}

// The admission year, and the 학번 (stored as nine digits), registered name and 소속 where the columns exist.
async function storeProfile(
  prisma: PrismaClient,
  columns: ReadonlyMap<string, string>,
  userId: string,
  person: P6Person & Partial<Pick<P6User, 'admissionYear' | 'affiliation'>>,
): Promise<void> {
  if (person.admissionYear !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { admissionYear: person.admissionYear } });
  }
  const values: [column: string, value: string | undefined][] = [
    [PROFILE_COLUMNS.registeredName, person.registeredName],
    [PROFILE_COLUMNS.studentNumber, person.studentNumber.replace('-', '')],
    [PROFILE_COLUMNS.affiliation, person.affiliation],
  ];
  for (const [column, value] of values) {
    const type = columns.get(column);
    if (type !== undefined && value !== undefined) {
      // The column and type names come from the table above and the database, never from the world's text.
      // oxlint-disable-next-line no-await-in-loop -- three columns
      await prisma.$executeRawUnsafe(
        `UPDATE users SET "${column}" = CAST($1 AS "${type}") WHERE id = CAST($2 AS uuid)`,
        value,
        userId,
      );
    }
  }
}

// The tutorial progress as the endpoints would have left it: no row while the tutorial was never turned on.
async function storeTutorial(prisma: PrismaClient, userId: string, tutorial: TutorialProgressData): Promise<void> {
  const firstStart = tutorial.quests.map(({ started }) => started).toSorted()[0];
  if (tutorial.enabled) {
    await prisma.tutorialProgress.create({
      data: {
        userId,
        enabledAt: inKorea(firstStart ?? '2026-11-02T09:00'),
        stoppedAt: tutorial.stopped === undefined ? null : inKorea(tutorial.stopped),
        finishedAt: tutorial.finished === undefined ? null : inKorea(tutorial.finished),
      },
    });
  }
  if (tutorial.quests.length > 0) {
    await prisma.tutorialQuestProgress.createMany({
      data: tutorial.quests.map(({ key, started, completed, completedBy }) => ({
        userId,
        questKey: key,
        startedAt: inKorea(started),
        completedAt: completed === undefined ? null : inKorea(completed),
        completedBy: completedBy ?? null,
      })),
    });
  }
}

async function seedUser(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  columns: ReadonlyMap<string, string>,
  user: P6User,
): Promise<TestUser> {
  const signedIn = await signInUser(app, { name: user.name, department: user.department });
  await storeProfile(prisma, columns, signedIn.id, user);
  await storeTutorial(prisma, signedIn.id, user.tutorial);
  return signedIn;
}

async function seedPlaces(prisma: PrismaClient, { places }: P6WorldData, seeds: Seeds): Promise<void> {
  for (const [name, number] of Object.entries(places)) {
    // oxlint-disable-next-line no-await-in-loop -- a few Places
    const place = await prisma.place.findFirstOrThrow({ where: { name, number } });
    seeds[name] = { kind: 'place', id: place.id, name };
  }
}

async function seedTimetable(
  app: INestApplication<Server>,
  { accessToken }: TestUser,
  { timetable }: P6WorldData,
  seeds: Seeds,
): Promise<void> {
  for (const { course, meetings } of timetable) {
    const times = meetings.map(({ day, start, end, place }) => ({
      weekday: day,
      startTime: start,
      endTime: end,
      placeId: place === null ? null : seedOf(seeds, 'place', place).id,
    }));
    // oxlint-disable-next-line no-await-in-loop -- one class at a time, as the app adds them
    await addClass(app, accessToken, { courseName: course, times });
  }
}

async function seedFriends(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  columns: ReadonlyMap<string, string>,
  { friends }: P6WorldData,
  asker: TestUser,
  seeds: Seeds,
): Promise<void> {
  for (const [seed, person] of Object.entries(friends)) {
    // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time, each read by its receiver
    const friend = await signInUser(app, { name: person.name, department: person.department });
    // oxlint-disable-next-line no-await-in-loop -- as above
    await befriend(app, asker, friend);
    // oxlint-disable-next-line no-await-in-loop -- as above
    await storeProfile(prisma, columns, friend.id, person);
    seeds[seed] = { kind: 'friend', id: friend.id, name: person.name };
  }
}

// The Closed lunch Quest the asker leads, its other Holders added directly, as a Closed Quest's come by invitation.
async function seedLunchQuest(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  { lunchQuest }: P6WorldData,
  asker: TestUser,
  seeds: Seeds,
): Promise<void> {
  const { title, capacity, holders, starts, ends, place } = lunchQuest;
  const id = await ownQuest(app, asker, {
    title,
    capacity,
    subQuest: {
      title,
      startsAt: inKorea(starts).toISOString(),
      endsAt: inKorea(ends).toISOString(),
      place: { placeId: seedOf(seeds, 'place', place).id },
    },
  });
  await prisma.quest.update({
    where: { id },
    data: { holders: { create: holders.map((name) => ({ userId: seedOf(seeds, 'friend', name).id })) } },
  });
  seeds[title] = { kind: 'quest', id, name: title };
}

async function seedGlobalEvents(prisma: PrismaClient, { globalEvents }: P6WorldData, seeds: Seeds): Promise<void> {
  for (const { title, description, starts, ends, place, point } of globalEvents) {
    // oxlint-disable-next-line no-await-in-loop -- a few events
    const event = await storeEvent(prisma, {
      title,
      description,
      startsAt: inKorea(starts),
      endsAt: inKorea(ends),
      place,
      ...point,
    });
    seeds[title] = { kind: 'globalEvent', id: event.id, name: title };
  }
}

// Seeds the world into the app's database, at `databaseUrl`, through a connection of its own. The app's clock must
// already stand at the world's.
export async function seedP6World(app: INestApplication<Server>, databaseUrl: string): Promise<World> {
  const data = p6WorldData();
  const prisma = connect(databaseUrl);
  const seeds: Seeds = {};
  const askers: Record<string, string> = {};
  try {
    const columns = await profileColumns(prisma);
    const asker = await seedUser(app, prisma, columns, data.asker);
    await seedPlaces(prisma, data, seeds);
    await seedTimetable(app, asker, data, seeds);
    await seedFriends(app, prisma, columns, data, asker, seeds);
    await seedLunchQuest(app, prisma, data, asker, seeds);
    await seedGlobalEvents(prisma, data, seeds);
    for (const [name, user] of Object.entries(data.askers)) {
      // oxlint-disable-next-line no-await-in-loop -- a few Users
      askers[name] = (await seedUser(app, prisma, columns, user)).accessToken;
    }
    return { accessToken: asker.accessToken, askers, seeds, refresh: () => Promise.resolve() };
  } finally {
    await prisma.$disconnect();
  }
}
