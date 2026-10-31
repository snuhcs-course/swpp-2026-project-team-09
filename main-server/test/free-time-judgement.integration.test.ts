/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { casesIn, type EvalCase, loadCases, nowOf, WORLD_CLOCKS } from '../eval/cases.ts';
import { type Names, namesOf } from '../eval/normalise.ts';
import { normaliseResult } from '../eval/normalise-result.ts';
import { isRecord } from '../eval/readers.ts';
import { FixtureTravel } from '../eval/p4/travel-fixture.ts';
import { seedP4World } from '../eval/p4/world.ts';
import { type World } from '../eval/world.ts';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The server's judgement against the reviewed labels (spec P04, "Testing Decisions"): the P4 world and its travel
// fixture, each 공강 tool called with the arguments of a label, and what it answers read as the labels write it. The
// labels were worked by hand from eval/p4/rules.md and do not follow the code.

const TOOLS = ['getMyDay', 'findFreeTimeEvents', 'findFreeFriends', 'findMealRestaurants'] as const;

type Tool = (typeof TOOLS)[number];

interface Label {
  evalCase: EvalCase;
  tool: Tool;
  args: Record<string, unknown>;
  answer: object;
}

const labels: Label[] = casesIn(loadCases(), 'p4').flatMap((evalCase) =>
  TOOLS.flatMap((tool) => {
    const label = evalCase.expect?.results?.[tool];
    if (label === undefined) {
      return [];
    }
    const { args, ...answer } = label;
    return [{ evalCase, tool, args, answer }];
  }),
);

const model = new ScriptedModel();
const travel = new FixtureTravel();
let database: SeededDatabase<ProvidedContext['settings']>;
let app: INestApplication<Server>;
let world: World;
let names: Names;
let now: string;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  // Each User's messages of a day are counted, and the suite sends more than the daily limit.
  const settings = { ...database.settings, ASSISTANT_DAILY_MESSAGES: '1000' };
  app = await startApp(settings, [], refuseKakao, refuseMatchServer, model.model, [], travel);
  now = WORLD_CLOCKS.p4;
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(now));
  world = await seedP4World(app, database.url);
  travel.bind(world.seeds);
  names = namesOf(world.seeds);
});

afterAll(async () => {
  await app.close();
  await database.drop();
});

function idOf(name: unknown): unknown {
  return typeof name === 'string' ? (world.seeds[name]?.id ?? name) : name;
}

const namesIn = (written: unknown): string[] => (Array.isArray(written) ? written.map(String) : []);

function nameOf(seed: string): string {
  return world.seeds[seed]?.name ?? seed;
}

// A label's arguments as the model passes them: items, Places and Friends by id.
function inputOf({ from, to, departurePlace, friends, ...rest }: Record<string, unknown>): object {
  return {
    ...rest,
    ...(from === undefined ? {} : { from: idOf(from) }),
    ...(to === undefined ? {} : { to: idOf(to) }),
    ...(departurePlace === undefined ? {} : { departurePlace: idOf(departurePlace) }),
    ...(friends === undefined ? {} : { friendIds: namesIn(friends).map((name) => idOf(name)) }),
  };
}

// The steps of the model: a departure Place is taken only from resolvePlace, and a Friend only from resolveFriend, in
// the same message.
function stepsOf(tool: Tool, args: Record<string, unknown>): Step[] {
  const { departurePlace, friends } = args;
  return [
    ...namesIn(friends).map((seed) => ({ tool: 'resolveFriend', input: { name: nameOf(seed) } })),
    ...(typeof departurePlace === 'string' ? [{ tool: 'resolvePlace', input: { words: departurePlace } }] : []),
    { tool, input: inputOf(args) },
    { text: '…' },
  ];
}

const bySeed = (a: unknown, b: unknown): number => JSON.stringify(a).localeCompare(JSON.stringify(b));

// The order of the Friends does not matter (rules.md, section 9).
function friendsInOneOrder(answer: unknown): unknown {
  return isRecord(answer) && Array.isArray(answer.friends)
    ? { ...answer, friends: answer.friends.toSorted(bySeed) }
    : answer;
}

function accessTokenOf({ asker }: EvalCase): string {
  return asker === undefined ? world.accessToken : (world.askers[asker] ?? '');
}

describe('The judgement of the 공강 tools, against the reviewed labels', () => {
  it('reads labels of every tool, of every case that gives them', () => {
    expect(labels.filter(({ tool }) => tool === 'findFreeTimeEvents').length).toBeGreaterThanOrEqual(15);
    expect(labels.filter(({ tool }) => tool === 'getMyDay').length).toBeGreaterThanOrEqual(2);
    expect(labels.filter(({ tool }) => tool === 'findFreeFriends').length).toBeGreaterThanOrEqual(4);
    expect(labels.filter(({ tool }) => tool === 'findMealRestaurants').length).toBeGreaterThanOrEqual(11);
  });

  it.each(labels.map((label) => [label.evalCase.id, label.tool, label] as const))(
    '%s: %s',
    async (_id, tool, { evalCase, args, answer }) => {
      now = nowOf(evalCase);
      model.script(...stepsOf(tool, args));

      const response = await postAssistantMessages(app, accessTokenOf(evalCase), ask('…'));

      expect(response.status).toBe(200);
      expect(friendsInOneOrder(normaliseResult(model.toolResults().at(-1), names))).toEqual(friendsInOneOrder(answer));
    },
  );
});
