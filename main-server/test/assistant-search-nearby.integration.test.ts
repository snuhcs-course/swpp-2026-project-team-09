/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { METRES_PER_DEGREE, metresBetween, type Position } from '../src/common/geometry.js';
import { Place, PrismaClient } from '../src/generated/prisma/client.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, ownQuest, storeEvent, subQuestIn } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The Place and radius of the chat Assistant's searchRecruitingQuests, with the scripted model in the model's place. The
// files share the database, so each test seeds what it reads on a day of 2091 of its own, which no other file uses, and
// always searches on that day.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let leader: TestUser;
let reader: TestUser;
let engineering: Place;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  prisma = connectToDatabase();
  leader = await signInUser(app);
  reader = await signInUser(app);
  engineering = await prisma.place.findFirstOrThrow({ where: { number: '301' } });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const korea = (time: string): Date => new Date(`${time}+09:00`);

// An Open Quest of the leader's that first meets at that time in Korea, at `place` if any.
function questAt(time: string, place?: object, body: object = {}): Promise<string> {
  return ownQuest(app, leader, {
    joinPolicy: 'open',
    subQuest: { title: '모임', startsAt: korea(time).toISOString(), ...(place === undefined ? {} : { place }) },
    ...body,
  });
}

const point = ({ latitude, longitude }: Position): object => ({ label: '여기', latitude, longitude });

// Metres north of the Place, as metresBetween reads them.
const north = (metres: number): Position => ({
  latitude: engineering.latitude + metres / METRES_PER_DEGREE,
  longitude: engineering.longitude,
});

// A position at the east metres given, and this much north of the Place: east metres read its own latitude.
function eastAndNorth(east: number, northMetres: number): Position {
  const { latitude } = north(northMetres);
  const perDegree = METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
  return { latitude, longitude: engineering.longitude + east / perDegree };
}

async function questsFound(input: object): Promise<string[]> {
  model.script({ tool: 'searchRecruitingQuests', input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('근처에 파티 있어?'));
  const [result] = z
    .array(z.object({ quests: z.array(z.object({ id: z.string() })).default([]) }))
    .parse(model.toolResults());
  return result?.quests.map(({ id }) => id) ?? [];
}

async function placesAround(): Promise<{ inside: Place; outside: Place }> {
  const places = await prisma.place.findMany({ where: { id: { not: engineering.id } } });
  const inside = places.find((place) => metresBetween(place, engineering) < 250);
  const outside = places.find((place) => metresBetween(place, engineering) > 350);
  if (inside === undefined || outside === undefined) {
    throw new Error('The shared seed has no Place near 301동, or none far from it');
  }
  return { inside, outside };
}

describe('searchRecruitingQuests, given a Place', () => {
  it('takes the Quests at that Place and at a nearby one, and leaves out those farther away', async () => {
    const { inside, outside } = await placesAround();
    const there = await questAt('2091-01-05T09:00:00', { placeId: engineering.id });
    const nearby = await questAt('2091-01-05T10:00:00', { placeId: inside.id });
    await questAt('2091-01-05T11:00:00', { placeId: outside.id });

    expect(await questsFound({ from: '2091-01-05', to: '2091-01-05', placeId: engineering.id })).toEqual([
      there,
      nearby,
    ]);
  });

  it('measures from a point on the map', async () => {
    const near = await questAt('2091-01-06T09:00:00', point(north(200)));
    await questAt('2091-01-06T10:00:00', point(north(400)));

    expect(await questsFound({ from: '2091-01-06', to: '2091-01-06', placeId: engineering.id })).toEqual([near]);
  });

  it("measures from a Global Event's position for a Quest attending one", async () => {
    const startsAt = korea('2091-01-07T09:00:00');
    const endsAt = korea('2091-01-07T11:00:00');
    const questFor = async (position: Partial<Position> | { latitude: null; longitude: null }): Promise<string> => {
      const event = await storeEvent(prisma, { startsAt, endsAt, ...position });
      const quest = await prisma.quest.create({
        data: {
          title: '같이 가요',
          globalEventId: event.id,
          leaderId: leader.id,
          joinPolicy: 'open',
          board: 'show',
          holders: { create: { userId: leader.id, globalEventId: event.id } },
          subQuests: { create: { attending: true } },
        },
      });
      return quest.id;
    };
    const near = await questFor(north(100));
    await questFor(north(400));
    await questFor({ latitude: null, longitude: null });

    expect(await questsFound({ from: '2091-01-07', to: '2091-01-07', placeId: engineering.id })).toEqual([near]);
  });
});

describe('searchRecruitingQuests, given a Place, among other Quests', () => {
  it('leaves out a Quest with words only, or no place at all', async () => {
    const near = await questAt('2091-01-08T09:00:00', point(north(100)));
    const words = await questAt('2091-01-08T10:00:00', { label: '서울대입구역' });
    const none = await questAt('2091-01-08T11:00:00');
    const day = { from: '2091-01-08', to: '2091-01-08' };

    expect(await questsFound({ ...day, placeId: engineering.id })).toEqual([near]);
    expect(await questsFound(day)).toEqual([near, words, none]);
  });

  it("goes by the first Sub Quest's position", async () => {
    const quest = await questAt('2091-01-09T09:00:00', point(north(400)));
    await subQuestIn(app, leader, quest, { title: '카페', place: { placeId: engineering.id } });

    expect(await questsFound({ from: '2091-01-09', to: '2091-01-09', placeId: engineering.id })).toEqual([]);
  });

  it('finds the later Quest past those farther away that are more than the list holds', async () => {
    await Promise.all(Array.from({ length: 31 }, () => questAt('2091-01-10T09:00:00', point(north(400)))));
    const later = await questAt('2091-01-10T18:00:00', point(north(100)));

    expect(await questsFound({ from: '2091-01-10', to: '2091-01-10', placeId: engineering.id })).toEqual([later]);
    expect(model.toolResults()).toEqual([expect.objectContaining({ more: false })]);
  });

  it('only ever narrows the result, and ranks what it keeps by the words', async () => {
    const plain = await questAt('2091-01-11T09:00:00', point(north(100)));
    const held = await questAt('2091-01-11T10:00:00', point(north(100)), { title: '콘서트' });
    const far = await questAt('2091-01-11T11:00:00', point(north(400)));
    const day = { from: '2091-01-11', to: '2091-01-11' };

    expect(await questsFound(day)).toEqual([plain, held, far]);
    expect(await questsFound({ ...day, placeId: engineering.id, words: ['콘서트'] })).toEqual([held, plain]);
  });
});

describe('searchRecruitingQuests, at the radius', () => {
  it('holds 300 m or less, as metresBetween reads it', async () => {
    const atTheEdge = north(300);
    expect(metresBetween(atTheEdge, engineering)).toBeLessThanOrEqual(300);
    const inside = await questAt('2091-02-05T09:00:00', point(atTheEdge));
    await questAt('2091-02-05T10:00:00', point(north(300.001)));

    expect(await questsFound({ from: '2091-02-05', to: '2091-02-05', placeId: engineering.id })).toEqual([inside]);
  });

  it('includes the radius itself', async () => {
    const position = north(250);
    const quest = await questAt('2091-02-09T09:00:00', point(position));
    const radius = metresBetween(position, engineering);

    expect(await questsFound({ from: '2091-02-09', to: '2091-02-09', placeId: engineering.id, radius })).toEqual([
      quest,
    ]);
  });

  it("reads the east metres at the Quest's latitude, not the Place's", async () => {
    // North of the Place, where a degree east is shorter: within 300 m at its own latitude, past it at the Place's.
    let position = eastAndNorth(295.79, 50);
    for (let east = 295.79; metresBetween(engineering, position) <= 300; east += 0.0005) {
      position = eastAndNorth(east, 50);
    }
    expect(metresBetween(position, engineering)).toBeLessThanOrEqual(300);
    expect(metresBetween(engineering, position)).toBeGreaterThan(300);
    const quest = await questAt('2091-02-06T09:00:00', point(position));

    expect(await questsFound({ from: '2091-02-06', to: '2091-02-06', placeId: engineering.id })).toEqual([quest]);
  });
});

describe('searchRecruitingQuests, given a radius', () => {
  it('takes another radius', async () => {
    const quest = await questAt('2091-02-07T09:00:00', point(north(400)));
    const day = { from: '2091-02-07', to: '2091-02-07', placeId: engineering.id };

    expect(await questsFound(day)).toEqual([]);
    expect(await questsFound({ ...day, radius: 500 })).toEqual([quest]);
  });

  it('refuses a radius without a Place, back to the model', async () => {
    model.script({ tool: 'searchRecruitingQuests', input: { radius: 300 } }, { text: '…' });

    await postAssistantMessages(app, reader.accessToken, ask('근처에 파티 있어?'));

    expect(JSON.stringify(model.received().at(-1)?.prompt)).toContain('Give placeId with radius');
  });

  it('takes the largest radius', async () => {
    const quest = await questAt('2091-02-11T09:00:00', point(north(2900)));

    expect(await questsFound({ from: '2091-02-11', to: '2091-02-11', placeId: engineering.id, radius: 3000 })).toEqual([
      quest,
    ]);
  });

  it('refuses a radius past the largest, back to the model', async () => {
    model.script({ tool: 'searchRecruitingQuests', input: { placeId: engineering.id, radius: 3000.5 } }, { text: '…' });

    await postAssistantMessages(app, reader.accessToken, ask('근처에 파티 있어?'));

    expect(JSON.stringify(model.received().at(-1)?.prompt)).toContain('too_big');
  });
});

describe('searchRecruitingQuests, given a Place with no Quest found', () => {
  it('says "none" because nothing is around a Place that exists', async () => {
    const date = '2091-02-08';
    await questAt(`${date}T09:00:00`, point(north(400)));
    model.script(
      { tool: 'searchRecruitingQuests', input: { from: date, to: date, placeId: engineering.id } },
      { text: '…' },
    );

    await postAssistantMessages(app, reader.accessToken, ask('근처에 파티 있어?'));

    expect(model.toolResults()).toEqual([
      {
        result: 'none',
        reason: `No 파티 that the User can join within 300 m of that Place is found from ${date}T00:00 to ${date}T23:59.`,
      },
    ]);
  });

  it('says "none" because there is no such Place', async () => {
    const date = '2091-02-10';
    await questAt(`${date}T09:00:00`, point(north(400)));
    model.script(
      {
        tool: 'searchRecruitingQuests',
        input: { from: date, to: date, placeId: '00000000-0000-4000-8000-000000000000' },
      },
      { text: '…' },
    );

    await postAssistantMessages(app, reader.accessToken, ask('근처에 파티 있어?'));

    expect(model.toolResults()).toEqual([{ result: 'none', reason: 'There is no such Place.' }]);
  });
});
