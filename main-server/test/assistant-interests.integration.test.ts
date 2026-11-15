/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { INTEREST_RULES } from '../src/assistant/interests/interest-tools.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, type TestUser } from './friends.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// watchInterest and unwatchInterest at the Assistant's endpoint with the scripted model, which also answers the topics
// call the tool makes, and the chat of an app that does not draw answers.

const model = new ScriptedModel();
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], undefined, undefined, model.model);
});

afterAll(() => app.close());

const DRAWS_ANSWERS = { clientCapabilities: ['library', 'answer'] };

const topics = (...words: string[]): Step => ({ text: JSON.stringify({ topics: words }) });

function send(user: TestUser, text: string, steps: Step[], more: object = DRAWS_ANSWERS): request.Test {
  model.script(...steps);
  return postAssistantMessages(app, user.accessToken, ask(text), more);
}

function interestsOf(user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/interests'), user.accessToken);
}

const toolNames = (): string[] => (model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('watchInterest', () => {
  it('keeps the interest and answers its words and topics', async () => {
    const user = await signInUser(app);

    const response = await send(user, '채용 관련 행사 뜨면 알려 줘', [
      { tool: 'watchInterest', input: { words: '채용 관련 행사' } },
      topics('채용'),
      { text: '채용 관련 행사를 지켜볼게요.' },
    ]);

    expect(response.status).toBe(200);
    expect(model.toolResults()).toEqual([{ result: 'watching', words: '채용 관련 행사', topics: ['채용'] }]);
    expect((await interestsOf(user)).body).toMatchObject([{ words: '채용 관련 행사', topics: ['채용'] }]);
  });
});

describe('unwatchInterest', () => {
  it('removes the interest whose topic is the words', async () => {
    const user = await signInUser(app);
    model.script(topics('배드민턴'));
    await withAccessToken(request(app.getHttpServer()).post('/interests'), user.accessToken).send({
      words: '배드민턴 모임',
    });

    const response = await send(user, '배드민턴 이제 그만 알려 줘', [
      { tool: 'unwatchInterest', input: { words: '배드민턴' } },
      { text: '이제 배드민턴은 알려 드리지 않아요.' },
    ]);

    expect(response.status).toBe(200);
    expect(model.toolResults()).toEqual([{ result: 'removed', words: '배드민턴 모임' }]);
    expect((await interestsOf(user)).body).toEqual([]);
  });

  it('answers none when nothing is watched by the words', async () => {
    const user = await signInUser(app);

    await send(user, '등산 그만 알려 줘', [
      { tool: 'unwatchInterest', input: { words: '등산' } },
      { text: '지켜보던 게 없어요.' },
    ]);

    expect(model.toolResults()).toMatchObject([{ result: 'none' }]);
  });
});

describe('The chat', () => {
  it.each([
    ['answers', DRAWS_ANSWERS],
    ['answers and events', { clientCapabilities: ['library', 'answer', 'events'] }],
  ])('of an app that draws %s has the interest rules and tools', async (_drawn, more) => {
    await send(await signInUser(app), '네', [{ text: '네' }], more);

    expect(model.system()).toContain(INTEREST_RULES);
    expect(toolNames()).toEqual(expect.arrayContaining(['watchInterest', 'unwatchInterest']));
  });

  it('of an app that does not draw answers has neither', async () => {
    await send(await signInUser(app), '네', [{ text: '네' }], { clientCapabilities: ['library'] });

    expect(model.system()).not.toContain(INTEREST_RULES);
    expect(toolNames()).not.toContain('watchInterest');
    expect(toolNames()).not.toContain('unwatchInterest');
  });
});
