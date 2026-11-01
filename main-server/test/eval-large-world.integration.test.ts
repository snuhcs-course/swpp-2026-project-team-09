/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { z } from 'zod';
import { casesIn, loadCases, WORLD_CLOCKS } from '../eval/cases.ts';
import { seedLargeWorld } from '../eval/p5/large-world/world.ts';
import { type Intended, intendedCalls, LARGE_WORLD, largeWorldData } from '../eval/p5/large-world/world-data.ts';
import { type World } from '../eval/world.ts';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { unseeded } from './eval-refs.ts';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The large world, seeded by its loader into a database of its own, and the server recall of each of its cases (P05
// ticket 02b): with no model, the search tools called with the case's intended calls must hold every card of its answer,
// so that a failed run can be told apart: the server did not give it, or the model did not choose it. A case marked in
// large-world-v1/intended.yaml is expected to fail until what it waits for lands, and this test then says to take the
// mark away. Those marked `search stage 1` wait beyond P05 (P05 spec, "Further Notes").

const data = largeWorldData();
const cases = casesIn(loadCases(), LARGE_WORLD);
const intended = intendedCalls();

const resultSchema = z.looseObject({
  quests: z.array(z.object({ id: z.string() })).optional(),
  events: z.array(z.object({ id: z.string() })).optional(),
});

const model = new ScriptedModel();
let database: SeededDatabase<ProvidedContext['settings']>;
let app: INestApplication<Server>;
let world: World;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  app = await startApp(
    { ...database.settings, ASSISTANT_DAILY_MESSAGES: '1000000' },
    [],
    refuseKakao,
    refuseMatchServer,
    model.model,
  );
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(WORLD_CLOCKS[LARGE_WORLD]));
  world = await seedLargeWorld(app, database.url);
}, 180_000);

afterAll(async () => {
  await app.close();
  await database.drop();
});

const idOf = (name: unknown): string | undefined => world.seeds[String(name)]?.id;

// The intended calls with seed names as the tools take them: the ids of this database.
function inputOf(input: Intended['calls'][number]['input']): object {
  const { placeId, globalEventId } = input;
  return {
    ...input,
    ...(placeId === undefined ? {} : { placeId: idOf(placeId) }),
    ...(globalEventId === undefined ? {} : { globalEventId: idOf(globalEventId) }),
  };
}

// The cards of the answer that the search tools, called as intended, did not hold.
async function missingFrom({ case: id, calls }: Intended): Promise<string[]> {
  model.script(...calls.map(({ tool, input }) => ({ tool, input: inputOf(input) })), { text: '…' });
  const response = await postAssistantMessages(app, world.accessToken, ask('…'));
  expect([id, response.status]).toEqual([id, 200]);
  const given = new Set(
    model.toolResults().flatMap((result) => {
      const parsed = resultSchema.safeParse(result);
      return parsed.success ? [...(parsed.data.quests ?? []), ...(parsed.data.events ?? [])].map((one) => one.id) : [];
    }),
  );
  const expected = cases.find((one) => one.id === id)?.expect?.cards?.flatMap(({ seeds }) => seeds) ?? [];
  return expected.filter((seed) => !given.has(idOf(seed) ?? ''));
}

describe('The large world', () => {
  it('holds every seed name a case gives, as the kind of thing the case takes it for', () => {
    expect(unseeded(cases, world)).toEqual([]);
  });

  it('stores what the data file says', async () => {
    const prisma = connect(database.url);
    const quests = await prisma.quest.findMany({ include: { holders: true, subQuests: true } });
    const events = await prisma.globalEvent.count();
    const asked = await prisma.questJoinRequest.count();
    await prisma.$disconnect();
    const byId = new Map(quests.map((quest) => [quest.id, quest]));
    const wrong = data.quests.filter(({ key, title, capacity, holders, joinPolicy, board }) => {
      const stored = byId.get(idOf(key) ?? '');
      return (
        stored?.title !== title ||
        stored.capacity !== capacity ||
        stored.holders.length !== holders ||
        stored.joinPolicy !== joinPolicy ||
        stored.board !== board ||
        stored.subQuests.length !== 1
      );
    });

    expect(wrong).toEqual([]);
    expect(quests.length).toBe(data.quests.length);
    expect(events).toBe(data.globalEvents.length);
    expect(asked).toBe(data.quests.filter(({ asker }) => asker === 'asked').length);
  });

  it('gives its Places where the shared seed places them', async () => {
    const prisma = connect(database.url);
    const stored = await prisma.place.findMany({ where: { name: { in: Object.keys(data.places) } } });
    await prisma.$disconnect();

    expect(
      Object.entries(data.places).filter(
        ([name, { number, latitude, longitude }]) =>
          !stored.some(
            (place) =>
              place.name === name &&
              place.number === number &&
              place.latitude === latitude &&
              place.longitude === longitude,
          ),
      ),
    ).toEqual([]);
  });
});

describe('Server recall', () => {
  const holding = intended.filter(({ until }) => until === null);
  const waiting = intended.filter(({ until }) => until !== null);

  it.each(holding.map((one) => [one.case, one] as const))('%s: holds every card of the answer', async (_, one) => {
    expect(await missingFrom(one)).toEqual([]);
  });

  // Expected to fail. When one of these holds, what it waited for has landed: set its `until` to null.
  it.each(waiting.map((one) => [one.case, String(one.until), one] as const))(
    '%s: is expected to miss a card until %s',
    async (_, _until, one) => {
      expect(await missingFrom(one)).not.toEqual([]);
    },
  );

  it('marks search stage 1 only for the subsets that may wait for it', () => {
    expect(
      intended
        .filter(({ until }) => until === 'search stage 1')
        .filter(({ case: id }) => !/^large-(?:p|t1|c)-/u.test(id)),
    ).toEqual([]);
  });
});
