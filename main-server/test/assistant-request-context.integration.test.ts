/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { ask, postAssistantMessages } from './assistant.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The request context the app sends beside the conversation, and the `answer` capability: what the endpoint accepts
// and refuses. That the context reaches the tools is tested at runFeature (assistant-answer-reply.unit.test.ts).

let app: INestApplication<Server>;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
});

afterAll(async () => {
  await app.close();
});

async function newAccessToken(): Promise<string> {
  return (await signIn(app)).accessToken;
}

function conditionsOf(): object {
  return {
    kind: 'meal',
    date: '2027-03-02',
    meal: 'lunch',
    people: [{ userId: randomUUID(), constraints: [{ kind: 'leaveBy', time: '12:50', source: 'asker' }] }],
    window: { from: '11:50', until: null },
    placeId: null,
  };
}

function fullContext(): object {
  return {
    location: { latitude: 37.4599, longitude: 126.9519 },
    viewport: { south: 37.45, west: 126.94, north: 37.47, east: 126.96 },
    tapped: { kind: 'place', placeId: randomUUID() },
    conditions: conditionsOf(),
    planId: 'plan-1',
  };
}

describe('The request context', () => {
  it('may be left out, and the reply is as before with no answer', async () => {
    model.script({ text: '안녕하세요!' });

    const response = await postAssistantMessages(app, await newAccessToken(), ask('안녕'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ text: '안녕하세요!', mapButtons: [], cards: [], proposal: null, answer: null });
  });

  it('is accepted whole: a location, a viewport, a tapped Place, conditions and a plan', async () => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, await newAccessToken(), ask('여기 어때?'), {
      context: fullContext(),
    });

    expect(response.status).toBe(200);
  });

  it.each([
    ['an unknown key', { ...fullContext(), weather: 'sunny' }],
    ['a latitude out of range', { location: { latitude: 91, longitude: 126.95 } }],
    ['a tapped thing of an unknown kind', { tapped: { kind: 'quest', questId: randomUUID() } }],
    ['conditions for a meal other than lunch or dinner', { conditions: { ...conditionsOf(), meal: 'breakfast' } }],
    [
      'conditions with more than 8 people',
      {
        conditions: {
          ...conditionsOf(),
          people: Array.from({ length: 9 }, () => ({ userId: randomUUID(), constraints: [] })),
        },
      },
    ],
  ])('is refused with 400 when it has %s, and the model is not called', async (_, context) => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, await newAccessToken(), ask('배고파'), { context });

    expect(response.status).toBe(400);
    expect(model.received()).toHaveLength(0);
  });
});

describe('The client capabilities', () => {
  it('take `answer` beside `library`', async () => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, await newAccessToken(), ask('배고파'), {
      clientCapabilities: ['library', 'answer'],
    });

    expect(response.status).toBe(200);
  });

  it('still refuse one the server does not know', async () => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, await newAccessToken(), ask('배고파'), {
      clientCapabilities: ['answer', 'hologram'],
    });

    expect(response.status).toBe(400);
  });
});
