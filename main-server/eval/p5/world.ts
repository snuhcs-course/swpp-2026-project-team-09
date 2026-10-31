/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { connect } from '../../test/containers.js';
import { signInUser, type TestUser } from '../../test/friends.js';
import { attend, ownQuest, storeEvent, storeSharedQuest } from '../../test/quests.js';
import { withAccessToken } from '../../test/sign-in.js';
import { type Seeded, seedOf, type World } from '../world.ts';
import { type AskersQuest, type OthersQuest, type P5WorldData, p5WorldData } from './world-data.ts';

// The P05 world (P05 spec, "The P05 eval suite"): eval/p5/world.yaml, seeded with the test helpers into a fresh
// database beside the shared Places seed. What the answers were worked from is that file, so nothing here decides
// anything: it only stores what the file says, as the app would. Its Quests may start before the run's clock, which the
// app allows.

type Seeds = Record<string, Seeded>;

const inKorea = (time: string): string => new Date(`${time}+09:00`).toISOString();

const idSchema = z.object({ id: z.string() });

async function seedPlaces(prisma: PrismaClient, { places }: P5WorldData, seeds: Seeds): Promise<void> {
  for (const [name, number] of Object.entries(places)) {
    // oxlint-disable-next-line no-await-in-loop -- a few Places
    const place = await prisma.place.findFirstOrThrow({ where: { name, number } });
    seeds[name] = { kind: 'place', id: place.id, name };
  }
}

async function seedEvents(prisma: PrismaClient, { globalEvents }: P5WorldData, seeds: Seeds): Promise<void> {
  for (const { title, description, starts, ends, place, point } of globalEvents) {
    // oxlint-disable-next-line no-await-in-loop -- a few events
    const event = await storeEvent(prisma, {
      title,
      description,
      startsAt: new Date(inKorea(starts)),
      endsAt: ends === null ? null : new Date(inKorea(ends)),
      place,
      ...point,
    });
    seeds[title] = { kind: 'globalEvent', id: event.id, name: title };
  }
}

function subQuestOf(
  title: string,
  { starts, ends, place }: { starts: string; ends?: string; place: { seed: string } | { label: string } },
  seeds: Seeds,
): object {
  return {
    title,
    startsAt: inKorea(starts),
    endsAt: ends === undefined ? null : inKorea(ends),
    place: 'seed' in place ? { placeId: seedOf(seeds, 'place', place.seed).id } : place,
  };
}

// A Quest for its Global Event, made as the app makes one and then opened on its Board.
async function seedEventQuest(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  leader: TestUser,
  quest: OthersQuest,
  globalEventId: string,
): Promise<string> {
  const { title, board, joinPolicy, capacity } = quest;
  const response = await attend(app, leader, globalEventId, { title });
  if (response.status !== 201) {
    throw new Error(`Attending answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { id } = idSchema.parse(response.body);
  await prisma.quest.update({ where: { id }, data: { board, joinPolicy, capacity } });
  return id;
}

// Adds Users to a Quest as Holders, directly: an Approval Quest's come through its Leader, whom a world does not run.
async function fillHolders(
  prisma: PrismaClient,
  questId: string,
  people: readonly TestUser[],
  globalEventId: string | null,
): Promise<void> {
  if (people.length > 0) {
    await prisma.quest.update({
      where: { id: questId },
      data: { holders: { create: people.map(({ id: userId }) => ({ userId, globalEventId })) } },
    });
  }
}

// The Users next after `start` in the rotation, so that nobody holds two Quests for one Global Event by accident.
function rotation(people: readonly TestUser[], start: number, count: number): TestUser[] {
  return Array.from({ length: count }, (_, index) => {
    const user = people[(start + index) % people.length];
    if (user === undefined) {
      throw new Error('The world holds no people');
    }
    return user;
  });
}

async function seedOthersQuests(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  { quests }: P5WorldData,
  { asker, people }: { asker: TestUser; people: readonly TestUser[] },
  seeds: Seeds,
): Promise<void> {
  let next = 0;
  for (const quest of quests) {
    const [leader, ...others] = rotation(people, next, quest.holders);
    next += quest.holders;
    if (leader === undefined) {
      throw new Error(`${quest.title} has no Leader`);
    }
    const globalEventId = 'globalEvent' in quest ? seedOf(seeds, 'globalEvent', quest.globalEvent).id : null;
    const { title, board, joinPolicy, capacity } = quest;
    const id =
      globalEventId === null
        ? // oxlint-disable-next-line no-await-in-loop -- in a fixed order
          await ownQuest(app, leader, {
            title,
            board,
            joinPolicy,
            capacity,
            ...('starts' in quest ? { subQuest: subQuestOf(title, quest, seeds) } : {}),
          })
        : // oxlint-disable-next-line no-await-in-loop -- as above
          await seedEventQuest(app, prisma, leader, quest, globalEventId);
    // oxlint-disable-next-line no-await-in-loop -- as above
    await fillHolders(prisma, id, others, globalEventId);
    seeds[title] = { kind: 'quest', id, name: title };
    if (quest.askedByAsker) {
      const asked = withAccessToken(request(app.getHttpServer()).post('/quest-join-requests'), asker.accessToken);
      // oxlint-disable-next-line no-await-in-loop -- as above
      const response = await asked.send({ questId: id });
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Asking to join ${title} answered ${response.status}: ${JSON.stringify(response.body)}`);
      }
    }
  }
}

// The Quests the asker holds: alone, leading on a Board, or having joined someone else's.
async function seedAskersQuests(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  held: readonly AskersQuest[],
  { asker, people }: { asker: TestUser; people: readonly TestUser[] },
  seeds: Seeds,
): Promise<void> {
  for (const quest of held) {
    const { title, role, board, joinPolicy, capacity, holders } = quest;
    const leader = role === 'joined' ? people[0] : asker;
    if (leader === undefined) {
      throw new Error('The world holds no people');
    }
    // oxlint-disable-next-line no-await-in-loop -- in a fixed order
    const id = await ownQuest(app, leader, {
      title,
      ...(board === null ? {} : { board }),
      joinPolicy,
      capacity,
      subQuest: subQuestOf(title, quest, seeds),
    });
    // oxlint-disable-next-line no-await-in-loop -- as above
    await fillHolders(prisma, id, role === 'joined' ? [asker] : rotation(people, 0, holders - 1), null);
    seeds[title] = { kind: 'quest', id, name: title };
  }
}

// Seeds the world into the app's database, at `databaseUrl`, through a connection of its own, as the tests store Global
// Events.
export async function seedP5World(app: INestApplication<Server>, databaseUrl: string): Promise<World> {
  const data = p5WorldData();
  const prisma = connect(databaseUrl);
  const asker = await signInUser(app, data.asker);
  const people: TestUser[] = [];
  for (const profile of data.people) {
    // oxlint-disable-next-line no-await-in-loop -- one sign-in at a time
    people.push(await signInUser(app, profile));
  }
  const seeds: Seeds = {};
  try {
    await seedPlaces(prisma, data, seeds);
    await seedEvents(prisma, data, seeds);
    const shared = seedOf(seeds, 'globalEvent', data.sharedQuest);
    const other = people.at(-1);
    if (other === undefined) {
      throw new Error('The world holds no people');
    }
    await storeSharedQuest(prisma, { id: shared.id, title: shared.name }, [asker.id, other.id]);
    await seedAskersQuests(app, prisma, data.heldByAsker, { asker, people }, seeds);
    await seedOthersQuests(app, prisma, data, { asker, people }, seeds);
  } finally {
    await prisma.$disconnect();
  }
  return { accessToken: asker.accessToken, askers: {}, seeds, refresh: () => Promise.resolve() };
}
