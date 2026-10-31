/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { casesIn, loadCases, WORLD_CLOCKS } from '../eval/cases.ts';
import { seedP4World } from '../eval/p4/world.ts';
import { requestMessages } from '../eval/runner.ts';
import { type World } from '../eval/world.ts';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { postAssistantMessages } from './assistant.js';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The P4 suite's fixed histories with Restaurant cards, sent as the runner sends them, without a model. The endpoint
// refused them until it took a Restaurant's key.

const withRestaurantCards = casesIn(loadCases(), 'p4').filter(({ turns }) =>
  turns.some((turn) => 'assistant' in turn && turn.assistant.cards.some(({ kind }) => kind === 'restaurant')),
);

const model = new ScriptedModel();
let database: SeededDatabase<ProvidedContext['settings']>;
let app: INestApplication<Server>;
let world: World;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  app = await startApp(database.settings, [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(WORLD_CLOCKS.p4));
  world = await seedP4World(app, database.url);
});

afterAll(async () => {
  await app.close();
  await database.drop();
});

describe('A fixed history with Restaurant cards', () => {
  it('is what the three follow-ups of the suite have', () => {
    expect(withRestaurantCards.map(({ id }) => id).toSorted()).toEqual([
      'meals-here-after-cards',
      'meals-no-noodles',
      'meals-soup-wanted',
    ]);
  });

  it.each(withRestaurantCards.map((evalCase) => [evalCase.id, evalCase] as const))(
    '%s reaches the model with its cards',
    async (_id, { turns }) => {
      model.script({ text: '…' });

      const response = await postAssistantMessages(app, world.accessToken, requestMessages(turns, world));

      expect(response.status).toBe(200);
      expect(JSON.stringify(model.received()[0]?.prompt)).toContain('restaurant 3식당');
    },
  );
});
