/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { type Prisma, type PrismaClient } from '../../../src/generated/prisma/client.js';
import { connect } from '../../../test/containers.js';
import { signInUser, type TestUser } from '../../../test/friends.js';
import { type Seeded, type World } from '../../world.ts';
import { type LargeGlobalEvent, type LargeQuest, type LargeWorldData, largeWorldData } from './world-data.ts';

// The loader of a large world (P05 ticket 02b): the data file, stored as it says into the database of a run, beside the
// shared Places seed. It decides nothing and never runs the generator: a run reads only the file. It writes the rows
// directly, in batches, since a thousand Quests through the app would take minutes and the app allows every one of them;
// when the schema changes, this is what changes, and the data file stays.

const inKorea = (time: string): Date => new Date(`${time}+09:00`);

async function placeIds(prisma: PrismaClient, { places }: LargeWorldData): Promise<Map<string, string>> {
  const stored = await prisma.place.findMany({ where: { number: { in: Object.values(places).map((p) => p.number) } } });
  return new Map(
    Object.entries(places).map(([name, { number }]) => {
      const place = stored.find((one) => one.name === name && one.number === number);
      if (place === undefined) {
        throw new Error(`The shared seed has no Place ${name} (${number})`);
      }
      return [name, place.id];
    }),
  );
}

function eventRow(event: LargeGlobalEvent, id: string): Prisma.GlobalEventCreateManyInput {
  const { title, description, starts, ends, place, latitude, longitude } = event;
  return {
    id,
    title,
    description,
    startsAt: inKorea(starts),
    endsAt: ends === null ? null : inKorea(ends),
    place,
    latitude,
    longitude,
    state: 'published',
  };
}

// A Quest's one Sub Quest: attending its Global Event, which stores no time or place, or its own.
function subQuestRow(
  quest: LargeQuest,
  questId: string,
  places: ReadonlyMap<string, string>,
): Prisma.SubQuestCreateManyInput {
  if ('globalEvent' in quest) {
    return { questId, attending: true };
  }
  const { title, starts, ends, place } = quest;
  const common = { questId, attending: false, title, startsAt: inKorea(starts), endsAt: inKorea(ends) };
  if (place === null) {
    return common;
  }
  if ('seed' in place) {
    return { ...common, placeId: places.get(place.seed) };
  }
  const { latitude, longitude } = 'latitude' in place ? place : { latitude: null, longitude: null };
  return { ...common, placeLabel: place.label, latitude, longitude };
}

// Who holds each Quest: its number of Holders, taken in turn from the people, the asker among them when it holds it.
// A Quest for a Global Event takes from where that event's last one stopped, since a User holds one Quest for an event.
class Holders {
  private next = 0;
  private readonly nextForEvent = new Map<string, number>();

  constructor(
    private readonly asker: TestUser,
    private readonly people: readonly TestUser[],
  ) {}

  of(quest: LargeQuest): string[] {
    const count = quest.holders - (quest.asker === 'holds' ? 1 : 0);
    const eventKey = 'globalEvent' in quest ? quest.globalEvent : null;
    const start = eventKey === null ? this.next : (this.nextForEvent.get(eventKey) ?? 0);
    const taken = Array.from({ length: count }, (_, index) => {
      const person = this.people[(start + index) % this.people.length];
      if (person === undefined) {
        throw new Error('The world holds no people');
      }
      return person.id;
    });
    if (eventKey === null) {
      this.next = start + count;
    } else {
      this.nextForEvent.set(eventKey, start + count);
    }
    return quest.asker === 'holds' ? [...taken, this.asker.id] : taken;
  }
}

async function storeQuests(
  prisma: PrismaClient,
  data: LargeWorldData,
  { asker, people }: { asker: TestUser; people: readonly TestUser[] },
  places: ReadonlyMap<string, string>,
  seeds: Record<string, Seeded>,
): Promise<void> {
  const eventIdOf = (key: string): string => {
    const seed = seeds[key];
    if (seed?.kind !== 'globalEvent') {
      throw new Error(`The world has no Global Event ${key}`);
    }
    return seed.id;
  };
  const holders = new Holders(asker, people);
  const rows = data.quests.map((quest) => {
    const id = randomUUID();
    const held = holders.of(quest);
    const [leaderId] = held;
    if (leaderId === undefined) {
      throw new Error(`${quest.key} has no Leader`);
    }
    const globalEventId = 'globalEvent' in quest ? eventIdOf(quest.globalEvent) : null;
    seeds[quest.key] = { kind: 'quest', id, name: quest.key };
    return { quest, id, held, leaderId, globalEventId };
  });
  await prisma.quest.createMany({
    data: rows.map(({ quest, id, leaderId, globalEventId }) => ({
      id,
      title: quest.title,
      description: quest.description,
      globalEventId,
      leaderId,
      capacity: quest.capacity,
      joinPolicy: quest.joinPolicy,
      board: quest.board,
    })),
  });
  await prisma.subQuest.createMany({ data: rows.map(({ quest, id }) => subQuestRow(quest, id, places)) });
  await prisma.questHolder.createMany({
    data: rows.flatMap(({ id, held, globalEventId }) => held.map((userId) => ({ questId: id, userId, globalEventId }))),
  });
  await prisma.questJoinRequest.createMany({
    data: rows.filter(({ quest }) => quest.asker === 'asked').map(({ id }) => ({ questId: id, userId: asker.id })),
  });
}

// Seeds a version's data file into the app's database, at `databaseUrl`. Its seed names are the file's keys.
export async function seedLargeWorld(
  app: INestApplication<Server>,
  databaseUrl: string,
  data: LargeWorldData = largeWorldData(),
): Promise<World> {
  const prisma = connect(databaseUrl);
  const asker = await signInUser(app, data.asker);
  const people: TestUser[] = [];
  for (const profile of data.people) {
    // oxlint-disable-next-line no-await-in-loop -- one sign-in at a time
    people.push(await signInUser(app, profile));
  }
  const seeds: Record<string, Seeded> = {};
  try {
    const events = data.globalEvents.map((event) => ({ event, id: randomUUID() }));
    await prisma.globalEvent.createMany({ data: events.map(({ event, id }) => eventRow(event, id)) });
    for (const { event, id } of events) {
      seeds[event.key] = { kind: 'globalEvent', id, name: event.key };
    }
    const places = await placeIds(prisma, data);
    await storeQuests(prisma, data, { asker, people }, places, seeds);
    for (const [name, id] of places) {
      seeds[name] = { kind: 'place', id, name };
    }
  } finally {
    await prisma.$disconnect();
  }
  return { accessToken: asker.accessToken, askers: {}, seeds, refresh: () => Promise.resolve() };
}
