/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect } from '../test/containers.js';
import { befriend, signInUser, type TestUser } from '../test/friends.js';
import { menusMessage } from '../test/menus.js';
import { attend, joinQuest, ownQuest, storeEvent } from '../test/quests.js';
import { vehiclesMessage } from '../test/shuttle.js';
import { sendAsWorker } from '../test/worker.js';
import {
  ASKER,
  at,
  FRIENDS,
  GLOBAL_EVENTS,
  JOINER,
  LEADER,
  MENUS,
  MENUS_COLLECTED_AT,
  PLACES,
  QUESTS,
  type QuestSeed,
  VEHICLES,
  VEHICLES_COLLECTED_AT,
} from './world-data.ts';

// The fixed world of the benchmark (spec P19, "The fixed world"), seeded with the e2e helpers into a fresh database
// beside the shared Places seed, never the demo seed, which may change for demos. Every right answer of the cases
// refers to it, so the seed and the cases change together: test/eval-cases.e2e-spec.ts checks that every seed name a
// case gives is one of `seeds`.
//
// The run's clock stands at 2026-10-21 (수) 14:05 in Korea (eval/runner.ts). The week of the cases is Monday 10-19 to
// Sunday 10-25:
// - menus for 10-21 (today) and 10-22 (tomorrow), with breakfast, lunch and dinner;
// - 10-23 (금, 모레) is the day of "no data": no menus, no Global Event and no recruiting Quest of the meal Board;
// - Global Events of several kinds through the week, one of which ended on 10-20 and two whose titles hold 축제;
// - recruiting Quests on the Boards meal, career (study), hobby (운동 and not) and show, one full and one ended;
// - the shuttle's stops from the seed and two vehicles, stored anew before each case (`refresh`), since the server
//   forgets a set of vehicles a minute after it was stored.

// Something a case names by its seed name, such as a card it showed or a Friend it invited.
export interface Seeded {
  kind: 'quest' | 'globalEvent' | 'place' | 'friend';
  id: string;
  name: string;
}

export interface World {
  // The asking User's, with which every message is sent.
  accessToken: string;
  // By seed name.
  seeds: Record<string, Seeded>;
  // Brings back what the server keeps only for a while (the shuttle's vehicles), before each case.
  refresh: () => Promise<void>;
}

// The seed of that kind and name, which a case must name rightly.
export function seedOf(seeds: Readonly<Record<string, Seeded>>, kind: Seeded['kind'], name: string): Seeded {
  const seed = seeds[name];
  if (seed?.kind !== kind) {
    throw new Error(`The world has no ${kind} named ${name}`);
  }
  return seed;
}

async function seedFriends(
  app: INestApplication<Server>,
  asker: TestUser,
  seeds: Record<string, Seeded>,
): Promise<void> {
  for (const [seed, profile] of Object.entries(FRIENDS)) {
    // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time, each read by its receiver
    const friend = await signInUser(app, profile);
    // oxlint-disable-next-line no-await-in-loop -- as above
    await befriend(app, asker, friend);
    seeds[seed] = { kind: 'friend', id: friend.id, name: profile.name };
  }
}

async function seedPlaces(prisma: PrismaClient, seeds: Record<string, Seeded>): Promise<void> {
  for (const [seed, { name, number }] of Object.entries(PLACES)) {
    // oxlint-disable-next-line no-await-in-loop -- two Places
    const place = await prisma.place.findFirstOrThrow({ where: { name, number } });
    seeds[seed] = { kind: 'place', id: place.id, name };
  }
}

async function seedGlobalEvents(prisma: PrismaClient, seeds: Record<string, Seeded>): Promise<void> {
  for (const [title, { description, startsAt, endsAt, place }] of Object.entries(GLOBAL_EVENTS)) {
    // oxlint-disable-next-line no-await-in-loop -- a few events
    const event = await storeEvent(prisma, { title, description, startsAt: at(startsAt), endsAt: at(endsAt), place });
    seeds[title] = { kind: 'globalEvent', id: event.id, name: title };
  }
}

const idSchema = z.object({ id: z.string() });

// A Quest for its Global Event, made as the app makes one and then opened on its Board.
async function eventQuest(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  leader: TestUser,
  title: string,
  quest: QuestSeed,
  globalEventId: string,
): Promise<string> {
  const response = await attend(app, leader, globalEventId, { title });
  if (response.status !== 201) {
    throw new Error(`Attending answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { id } = idSchema.parse(response.body);
  const { board, joinPolicy, capacity, description } = quest;
  await prisma.quest.update({ where: { id }, data: { board, joinPolicy, capacity, description } });
  return id;
}

async function seedQuests(
  app: INestApplication<Server>,
  prisma: PrismaClient,
  seeds: Record<string, Seeded>,
): Promise<void> {
  const leader = await signInUser(app, LEADER);
  const joiner = await signInUser(app, JOINER);
  for (const [title, quest] of Object.entries(QUESTS)) {
    const { board, joinPolicy, capacity, description, startsAt, place, globalEvent } = quest;
    const id =
      globalEvent === undefined
        ? // oxlint-disable-next-line no-await-in-loop -- a few Quests, in a fixed order
          await ownQuest(app, leader, {
            title,
            board,
            joinPolicy,
            capacity,
            description,
            subQuest: {
              title,
              startsAt: startsAt === undefined ? null : at(startsAt).toISOString(),
              place:
                place === undefined
                  ? null
                  : 'seed' in place
                    ? { placeId: seedOf(seeds, 'place', place.seed).id }
                    : { label: place.label },
            },
          })
        : // oxlint-disable-next-line no-await-in-loop -- as above
          await eventQuest(app, prisma, leader, title, quest, seedOf(seeds, 'globalEvent', globalEvent).id);
    if (quest.full === true) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      const response = await joinQuest(app, joiner, id);
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Joining answered ${response.status}: ${JSON.stringify(response.body)}`);
      }
    }
    seeds[title] = { kind: 'quest', id, name: title };
  }
}

async function storeVehicles(app: INestApplication<Server>): Promise<void> {
  await sendAsWorker(
    app,
    '/shuttle/vehicles/collected',
    vehiclesMessage(VEHICLES, { collectedAt: VEHICLES_COLLECTED_AT }),
  );
}

// Seeds the world into the app's database, at `databaseUrl`, through a connection of its own, as the tests store
// Global Events. The app's clock must already stand at the run's time.
export async function seedWorld(app: INestApplication<Server>, databaseUrl: string): Promise<World> {
  const prisma = connect(databaseUrl);
  const asker = await signInUser(app, ASKER);
  const seeds: Record<string, Seeded> = {};
  try {
    await seedFriends(app, asker, seeds);
    await seedPlaces(prisma, seeds);
    await seedGlobalEvents(prisma, seeds);
    await seedQuests(app, prisma, seeds);
  } finally {
    await prisma.$disconnect();
  }
  await sendAsWorker(app, '/menus/collected', menusMessage(MENUS, { collectedAt: MENUS_COLLECTED_AT }));
  return { accessToken: asker.accessToken, seeds, refresh: () => storeVehicles(app) };
}
