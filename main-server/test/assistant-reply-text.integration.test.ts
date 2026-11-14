/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { FIXED_SENTENCE } from '../src/assistant/adapter.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The reply's text when the model's steps wrote it in different places, or wrote none, with the scripted model in the
// model's place. The files share the database, so the test's event stands in a month of 2097 no other file uses, and
// its clock on a morning of 2095 no other file uses.

const UNAVAILABLE = { statusCode: 503, error: 'Service Unavailable', message: 'The Assistant cannot answer now' };
// 2095-09-01 09:00 in Korea.
const NOW = new Date('2095-09-01T00:00:00Z');
const LUNCH = {
  title: '2095 학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2095-09-02T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

const model = new ScriptedModel();
let app: INestApplication<Server>;
let prisma: PrismaClient;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

function send(): Promise<{ status: number; body: unknown }> {
  return postAssistantMessages(app, accessToken, ask('질문이에요'));
}

// The server's warnings from now on, which are what it logs of a fixed sentence.
function captureWarnings(): () => unknown[] {
  const spy = vi.spyOn(Logger.prototype, 'warn');
  return () => spy.mock.calls.map(([message]) => message as unknown);
}

describe('The text of the steps', () => {
  it('uses a last step that has text, when no earlier step wrote any', async () => {
    model.script({ tool: 'showOnMap', input: { layer: 'dining' } }, { text: '마지막 글이에요.' });

    expect((await send()).body).toMatchObject({ text: '마지막 글이에요.', mapButtons: ['dining'] });
  });

  it('joins the steps that wrote text, in order, skipping the empty ones', async () => {
    model.script(
      { tool: 'showOnMap', input: { layer: 'dining' }, text: '첫 글이에요.' },
      { tool: 'showOnMap', input: { layer: 'shuttle' }, text: '  ' },
      { tool: 'showOnMap', input: { layer: 'dining' }, text: '둘째 글이에요.' },
      { text: '' },
    );

    expect((await send()).body).toMatchObject({ text: '첫 글이에요.\n\n둘째 글이에요.' });
  });

  it('answers with what an earlier step wrote when the last step is cut at the output limit with no text', async () => {
    model.script({ tool: 'showOnMap', input: { layer: 'dining' }, text: '앞 단계의 답이에요.' }, { cut: {} });

    const response = await send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ text: '앞 단계의 답이에요.', mapButtons: ['dining'] });
  });
});

describe('A run that wrote no text', () => {
  it('says the fixed sentence over map buttons, and the log says so', async () => {
    const warnings = captureWarnings();
    model.script({ tool: 'showOnMap', input: { layer: 'dining' } }, { text: '' });

    const response = await send();

    expect(response.status).toBe(200);
    const body = { text: FIXED_SENTENCE, mapButtons: ['dining'], cards: [], proposal: null, answer: null };
    expect(response.body).toEqual(body);
    expect(warnings()).toContain(
      'The Assistant answered with its fixed sentence: no step had text ' +
        '(finish reason stop, 0 cards, 1 map buttons, no Proposal)',
    );
  });

  it('says the fixed sentence over cards', async () => {
    const warnings = captureWarnings();
    const startsAt = new Date('2097-08-05T18:00:00+09:00');
    const event = await storeEvent(prisma, { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000) });
    model.script(
      { tool: 'searchGlobalEvents', input: { from: '2097-08-05', to: '2097-08-05' } },
      { tool: 'showGlobalEvents', input: { ids: [event.id] } },
      { cut: {} },
    );

    const response = await send();

    expect(response.body).toMatchObject({
      text: FIXED_SENTENCE,
      cards: [{ kind: 'globalEvent', globalEvent: { id: event.id } }],
    });
    expect(warnings()).toContain(
      'The Assistant answered with its fixed sentence: no step had text ' +
        '(finish reason length, 1 cards, 0 map buttons, no Proposal)',
    );
  });

  it('says the fixed sentence over a Proposal', async () => {
    const warnings = captureWarnings();
    model.script({ tool: 'proposeQuest', input: LUNCH }, { text: '' });

    const response = await send();

    expect(response.body).toMatchObject({ text: FIXED_SENTENCE, proposal: { title: LUNCH.title } });
    expect(warnings().join('\n')).toContain('(finish reason stop, 0 cards, 0 map buttons, a Proposal)');
  });
});

describe('The error reply stays', () => {
  it('for a run with no text that showed nothing', async () => {
    const warnings = captureWarnings();
    model.script({ tool: 'getMenus', input: { date: '2095-09-01' } }, { text: '   ' });

    const response = await send();

    expect(response.status).toBe(503);
    expect(response.body).toEqual(UNAVAILABLE);
    expect(warnings().join('\n')).not.toContain('fixed sentence');
  });

  it('for a run at the step limit, whatever its steps wrote and showed', async () => {
    const steps = Array.from({ length: 8 }, () => ({
      tool: 'showOnMap',
      input: { layer: 'dining' },
      text: '쓰다 만 글이에요.',
    }));
    model.script(...steps);

    const response = await send();

    expect(response.status).toBe(503);
    expect(response.body).toEqual(UNAVAILABLE);
    expect(model.received()).toHaveLength(8);
  });
});
