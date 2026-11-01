/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { casesIn, loadCases, WORLD_CLOCKS } from '../eval/cases.ts';
import { seedP6World } from '../eval/p6/world.ts';
import { p6WorldData } from '../eval/p6/world-data.ts';
import { type World } from '../eval/world.ts';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { unseeded } from './eval-refs.ts';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { getTutorial, tutorialAfter } from './tutorial.js';
import { refuseKakao } from './walking-route.js';

// The P6 world seeded into a database of its own (P06 ticket 06), without a model: every seed name a case gives is in
// it as that kind of thing, each User's tutorial is in the state world.yaml gives, and the lunch Quest holds its five
// people. Reported apart from the product's pyramid (ADR 0007).

const cases = casesIn(loadCases(), 'p6');
const data = p6WorldData();

describe('The P6 world', () => {
  const model = new ScriptedModel();
  let database: SeededDatabase<ProvidedContext['settings']>;
  let app: INestApplication<Server>;
  let world: World;

  beforeAll(async () => {
    database = await seededDatabase(inject('settings'));
    app = await startApp(database.settings, [], refuseKakao, refuseMatchServer, model.model);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(WORLD_CLOCKS.p6));
    world = await seedP6World(app, database.url);
    // Seventeen Users signed in, befriended and given a profile through the app, which a loaded machine takes minutes for.
  }, 300_000);

  afterAll(async () => {
    await app.close();
    await database.drop();
  });

  it('holds every seed name a case gives, as the kind of thing the case takes it for', () => {
    expect(unseeded(cases, world)).toEqual([]);
  });

  it("gives each User's tutorial the state world.yaml gives it", async () => {
    const tokens = [world.accessToken, ...Object.keys(data.askers).map((name) => world.askers[name] ?? '')];
    const states = [];
    for (const accessToken of tokens) {
      // oxlint-disable-next-line no-await-in-loop -- a few Users
      states.push((await tutorialAfter(getTutorial(app, { id: '', friendId: '', accessToken }))).state);
    }

    expect(states).toEqual([data.asker, ...Object.values(data.askers)].map(({ tutorial }) => tutorial.state));
  });

  it('holds the lunch Quest with the asker and its four Friends', async () => {
    const prisma = connect(database.url);
    const quest = await prisma.quest.findFirstOrThrow({
      where: { title: data.lunchQuest.title },
      include: { holders: true },
    });
    await prisma.$disconnect();

    expect(quest.holders).toHaveLength(data.lunchQuest.holders.length + 1);
  });
});
