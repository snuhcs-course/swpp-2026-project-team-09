/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { connect } from '../../test/containers.js';
import { befriend, signInUser, type TestUser } from '../../test/friends.js';
import { menusMessage } from '../../test/menus.js';
import { attend, joinQuest, ownQuest, storeEvent, storeSharedQuest, subQuestIn } from '../../test/quests.js';
import { withAccessToken } from '../../test/sign-in.js';
import { addClass } from '../../test/timetable.js';
import { sendAsWorker } from '../../test/worker.js';
import { type Seeded, seedOf, type World } from '../world.ts';
import {
  type HeldQuest,
  type Recruiting,
  type RestaurantDay,
  type SubQuest,
  type Weekday,
  WEEKDAYS,
  type WorldData,
  worldData,
} from './world-data.ts';

// The P4 world (spec P04, "Evaluation plan" 1): eval/p4/world.yaml, seeded with the test helpers into a fresh database
// beside the shared Places seed. What the labels were drafted from is that file, so nothing here decides anything: it
// only stores what the file says, as the app and the worker would.

const DAYS: Record<Weekday, string> = { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금' };

type Seeds = Record<string, Seeded>;

const inKorea = (time: string): string => new Date(`${time}+09:00`).toISOString();

// The name a case gives an item of the asker's, whose id `from` and `to` take: 논리설계 (목). A Class meeting's id is its
// ClassTime's, a Quest's item its Sub Quest's.
function itemSeed(name: string, day: Weekday): string {
  return `${name} (${DAYS[day]})`;
}

// The weekday of a time on Monday to Friday.
function weekdayOf(time: string): Weekday {
  return WEEKDAYS[new Date(`${time.slice(0, 10)}T00:00:00Z`).getUTCDay() - 1] ?? 'monday';
}

// Names the only Sub Quest of a Quest the asker holds.
async function seedItem(
  prisma: PrismaClient,
  questId: string,
  title: string,
  starts: string,
  seeds: Seeds,
): Promise<void> {
  const { id } = await prisma.subQuest.findFirstOrThrow({ where: { questId } });
  seeds[itemSeed(title, weekdayOf(starts))] = { kind: 'item', id, name: title };
}

async function seedPlaces(prisma: PrismaClient, { places, restaurants }: WorldData, seeds: Seeds): Promise<void> {
  for (const [name, number] of Object.entries(places)) {
    // oxlint-disable-next-line no-await-in-loop -- a few Places
    const place = await prisma.place.findFirstOrThrow({ where: { name, number } });
    seeds[name] = { kind: 'place', id: place.id, name };
  }
  for (const key of Object.keys(restaurants)) {
    seeds[key] = { kind: 'restaurant', id: key, name: key };
  }
}

// Stores a Timetable and answers each meeting's id with what names it.
async function seedTimetable(
  app: INestApplication<Server>,
  { accessToken }: TestUser,
  timetable: WorldData['timetable'],
  seeds: Seeds,
): Promise<{ id: string; seed: string; name: string }[]> {
  const meetings = [];
  for (const { course, meetings: written } of timetable) {
    const times = written.map(({ day, start, end, place }) => ({
      weekday: day,
      startTime: start,
      endTime: end,
      placeId: place === null ? null : seedOf(seeds, 'place', place).id,
    }));
    // oxlint-disable-next-line no-await-in-loop -- one class at a time, as the app adds them
    const stored = await addClass(app, accessToken, { courseName: course, times });
    for (const { day, start } of written) {
      const id = stored.times.find((time) => time.weekday === day && time.startTime === start)?.id ?? '';
      meetings.push({ id, seed: itemSeed(course, day), name: course });
    }
  }
  return meetings;
}

function contentOf(title: string, { starts, ends, place }: SubQuest, seeds: Seeds): object {
  return {
    title,
    startsAt: starts === undefined ? null : inKorea(starts),
    endsAt: ends === undefined ? null : inKorea(ends),
    place: 'seed' in place ? { placeId: seedOf(seeds, 'place', place.seed).id } : place,
  };
}

// A Closed Quest the User alone holds, with its one Sub Quest.
function seedHeldQuest(
  app: INestApplication<Server>,
  user: TestUser,
  { title, subQuest }: HeldQuest,
  seeds: Seeds,
): Promise<string> {
  return ownQuest(app, user, { title, subQuest: contentOf(title, subQuest, seeds) });
}

const idSchema = z.object({ id: z.string() });

// A Quest for its Global Event, made as the app makes one and then opened on its Board.
async function seedEventQuest(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  leader: TestUser,
  { title, board, joinPolicy, capacity }: Recruiting,
  globalEventId: string,
): Promise<string> {
  const response = await attend(app, leader, globalEventId, { title });
  if (response.status !== 201) {
    throw new Error(`Attending answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { id } = idSchema.parse(response.body);
  await prisma.quest.update({ where: { id }, data: { board, joinPolicy, capacity } });
  return id;
}

async function checked(answer: PromiseLike<request.Response>, what: string): Promise<void> {
  const response = await answer;
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`${what} answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// A Quest of the leader's: made, with its other Sub Quests, and then filled, joined or asked for.
async function seedRecruiting(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  users: { asker: TestUser; leader: TestUser; joiner: TestUser },
  quest: Recruiting,
  seeds: Seeds,
): Promise<void> {
  const { title, board, joinPolicy, capacity, globalEvent, subQuests } = quest;
  const { asker, leader, joiner } = users;
  const [first] = subQuests;
  const id =
    globalEvent === undefined
      ? await ownQuest(app, leader, {
          title,
          board,
          joinPolicy,
          capacity,
          subQuest: first === undefined ? undefined : contentOf(title, first, seeds),
        })
      : await seedEventQuest(app, prisma, leader, quest, seedOf(seeds, 'globalEvent', globalEvent).id);
  for (const subQuest of globalEvent === undefined ? subQuests.slice(1) : subQuests) {
    // oxlint-disable-next-line no-await-in-loop -- in the order written
    await subQuestIn(app, leader, id, contentOf(title, subQuest, seeds));
  }
  seeds[title] = { kind: 'quest', id, name: title };
  if (quest.full) {
    await checked(joinQuest(app, joiner, id), `Filling ${title}`);
  }
  if (quest.joinedByAsker) {
    await checked(joinQuest(app, asker, id), `Joining ${title}`);
    await seedItem(prisma, id, title, first?.starts ?? '', seeds);
  }
  if (quest.askedByAsker) {
    const asked = withAccessToken(request(app.getHttpServer()).post('/quest-join-requests'), asker.accessToken);
    await checked(asked.send({ questId: id }), `Asking to join ${title}`);
  }
}

function linesOf({ breakfast, lunch, dinner }: RestaurantDay): object[] {
  return Object.entries({ breakfast, lunch, dinner }).flatMap(([meal, lines]) =>
    lines.map((line) =>
      'note' in line
        ? { meal, text: line.note, kind: 'note', name: null, price: null }
        : {
            meal,
            text: `${line.dish} : ${line.price.toLocaleString('en-US')}원`,
            kind: 'dish',
            name: line.dish,
            price: line.price,
          },
    ),
  );
}

// Everyone the world holds, the asker's Friends befriended and each one's Timetable and Quests stored.
async function seedPeople(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  data: WorldData,
  asker: TestUser,
  seeds: Seeds,
): Promise<void> {
  for (const [seed, { timetable, quests, ...profile }] of Object.entries(data.friends)) {
    // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time, each read by its receiver
    const friend = await signInUser(app, profile);
    // oxlint-disable-next-line no-await-in-loop -- as above
    await befriend(app, asker, friend);
    seeds[seed] = { kind: 'friend', id: friend.id, name: profile.name };
    // oxlint-disable-next-line no-await-in-loop -- as above
    await seedTimetable(app, friend, timetable, seeds);
    for (const quest of quests) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      await seedHeldQuest(app, friend, quest, seeds);
    }
  }
  const meetings = await seedTimetable(app, asker, data.timetable, seeds);
  for (const { id, seed, name } of meetings) {
    seeds[seed] = { kind: 'item', id, name };
  }
  for (const quest of data.ownQuests) {
    // oxlint-disable-next-line no-await-in-loop -- a few Quests
    const id = await seedHeldQuest(app, asker, quest, seeds);
    // oxlint-disable-next-line no-await-in-loop -- as above
    await seedItem(prisma, id, quest.title, quest.subQuest.starts ?? '', seeds);
  }
}

async function seedQuests(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  data: WorldData,
  asker: TestUser,
  seeds: Seeds,
): Promise<void> {
  const leader = await signInUser(app, data.leader);
  const joiner = await signInUser(app, data.joiner);
  for (const { title, starts, ends, place, point } of data.globalEvents) {
    // oxlint-disable-next-line no-await-in-loop -- a few events
    const event = await storeEvent(prisma, {
      title,
      description: '',
      startsAt: new Date(inKorea(starts)),
      endsAt: ends === null ? null : new Date(inKorea(ends)),
      place,
      ...point,
    });
    seeds[title] = { kind: 'globalEvent', id: event.id, name: title };
  }
  const shared = seedOf(seeds, 'globalEvent', data.sharedQuest);
  const sharedId = await storeSharedQuest(prisma, { id: shared.id, title: shared.name }, [asker.id, joiner.id]);
  const sharedStart = data.globalEvents.find(({ title }) => title === shared.name)?.starts ?? '';
  await seedItem(prisma, sharedId, shared.name, sharedStart, seeds);
  for (const quest of data.quests) {
    // oxlint-disable-next-line no-await-in-loop -- in a fixed order
    await seedRecruiting(app, prisma, { asker, leader, joiner }, quest, seeds);
  }
}

// Seeds the world into the app's database, at `databaseUrl`, through a connection of its own, as the tests store Global
// Events. The app's clock must already stand at the world's.
export async function seedP4World(app: INestApplication<Server>, databaseUrl: string): Promise<World> {
  const data = worldData();
  const prisma = connect(databaseUrl);
  const asker = await signInUser(app, data.asker);
  const seeds: Seeds = {};
  const askers: Record<string, string> = {};
  try {
    await seedPlaces(prisma, data, seeds);
    await seedPeople(app, prisma, data, asker, seeds);
    await seedQuests(app, prisma, data, asker, seeds);
    for (const [name, profile] of Object.entries(data.askers)) {
      // oxlint-disable-next-line no-await-in-loop -- a few Users
      askers[name] = (await signInUser(app, profile)).accessToken;
    }
  } finally {
    await prisma.$disconnect();
  }
  const days = data.menus.map(({ date, restaurants }) => ({
    date,
    restaurants: restaurants.map((restaurant) => ({ name: restaurant.name, lines: linesOf(restaurant) })),
  }));
  await sendAsWorker(app, '/menus/collected', menusMessage(days, { collectedAt: data.menusCollectedAt }));
  return { accessToken: asker.accessToken, askers, seeds, refresh: () => Promise.resolve() };
}
