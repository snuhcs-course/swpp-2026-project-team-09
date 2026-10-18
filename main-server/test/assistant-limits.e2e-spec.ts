/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { APICallError, RetryError } from 'ai';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages, type SentMessage } from './assistant.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The chat Assistant's limits and failures: what a request may hold, how much a message may take, the daily limit,
// and the one error reply, whose cause only the server's log tells.

const UNAVAILABLE = { statusCode: 503, error: 'Service Unavailable', message: 'The Assistant cannot answer now' };
const USED_UP = { statusCode: 429, message: "Today's messages are used up" };

const model = new ScriptedModel();
let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The model's error as OpenRouter's provider throws it, carrying the request it sent.
function providerError(statusCode: number, sent: string): APICallError {
  return new APICallError({
    message: `Provider refused: ${sent}`,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    requestBodyValues: { messages: [{ role: 'user', content: sent }] },
    statusCode,
    responseBody: `{"error":"${sent}"}`,
  });
}

// Everything written to the server's log, to the console and to the process's output, from now on.
function captureLogs(): () => string {
  const spies = [
    ...(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level),
    ),
    ...(['log', 'warn', 'error', 'info', 'debug'] as const).map((level) => vi.spyOn(console, level)),
    vi.spyOn(process.stdout, 'write'),
    vi.spyOn(process.stderr, 'write'),
  ];
  return () =>
    spies
      .flatMap((spy) => {
        const values: unknown[] = spy.mock.calls.flat();
        return values;
      })
      .map((value) => (value instanceof Error ? `${value.message} ${value.stack}` : JSON.stringify(value)))
      .join('\n');
}

describe('A message the model fails on gets the error reply, and the log the cause', () => {
  it('when the model never answers within the step cap, after 8 calls', async () => {
    const date = '2027-02-01';
    model.script(...Array.from({ length: 9 }, () => ({ tool: 'getMenus', input: { date } })));

    const response = await postAssistantMessages(app, accessToken, ask('메뉴 알려줘'));

    expect(response.status).toBe(503);
    expect(response.body).toEqual(UNAVAILABLE);
    expect(model.received()).toHaveLength(8);
  });

  it('when the model throws', async () => {
    const logs = captureLogs();
    model.script({ error: providerError(500, '안녕') });

    const response = await postAssistantMessages(app, accessToken, ask('안녕'));

    expect(response.body).toEqual(UNAVAILABLE);
    expect(logs()).toContain('APICallError: HTTP 500');
  });

  it('when the credit is used up', async () => {
    const logs = captureLogs();
    model.script({ error: providerError(402, '안녕') });

    const response = await postAssistantMessages(app, accessToken, ask('안녕'));

    expect(response.body).toEqual(UNAVAILABLE);
    expect(logs()).toContain('the OpenRouter credit is used up');
  });
});

describe("The server's log", () => {
  const SECRET = '비밀 메시지 7f3a';
  const ANSWER = '비밀 답변 9c1d';

  it("holds none of the User's text or the model's answer, whether the model answers or fails", async () => {
    const logs = captureLogs();

    model.script({ tool: 'getMenus', input: { date: '2027-02-02' } }, { text: ANSWER });
    await postAssistantMessages(app, accessToken, ask(SECRET));
    model.script({ error: providerError(500, SECRET) });
    await postAssistantMessages(app, accessToken, ask(SECRET));
    const wrapped = new RetryError({
      message: `Failed after 1 attempt: ${SECRET}`,
      reason: 'maxRetriesExceeded',
      errors: [providerError(503, SECRET)],
    });
    model.script({ error: wrapped });
    const response = await postAssistantMessages(app, accessToken, ask(SECRET));

    expect(JSON.stringify(response.body)).not.toContain(SECRET);
    expect(logs()).toContain('APICallError: HTTP 503');
    expect(logs()).not.toContain(SECRET);
    expect(logs()).not.toContain(ANSWER);
  });
});

const QUEST_ID = randomUUID();

// A conversation of `count` messages, the User's first and last, each Assistant's with a card.
function conversation(count: number, words?: string): SentMessage[] {
  return Array.from({ length: count }, (_, index): SentMessage =>
    index % 2 === 0
      ? { role: 'user', text: words ?? `질문 ${index}` }
      : { role: 'assistant', text: words ?? `답변 ${index}`, cards: [{ kind: 'quest', id: QUEST_ID }] },
  );
}

describe('What the model is given', () => {
  it('is the latest 20 messages, each as text with the cards shown, and no tool results', async () => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, accessToken, conversation(25));

    expect(response.status).toBe(200);
    const prompt = model.received()[0]?.prompt.filter(({ role }) => role !== 'system') ?? [];
    expect(prompt).toHaveLength(20);
    expect(prompt.map(({ role }) => role)).not.toContain('tool');
    expect(prompt[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: `답변 5\n\n[Cards shown: quest ${QUEST_ID}]` }],
    });
    expect(prompt.at(-1)).toEqual({ role: 'user', content: [{ type: 'text', text: '질문 24' }] });
  });
});

describe('A request the endpoint refuses before the model is called', () => {
  it.each<[string, object[]]>([
    ["a User's message over 1,000 characters", ask('가'.repeat(1001))],
    ['messages over 24,000 characters together', conversation(25, '가'.repeat(1000))],
    ["cards on a User's message", [{ role: 'user', text: '안녕', cards: [] }]],
    [
      'a card of an unknown kind',
      [{ role: 'assistant', text: '네', cards: [{ kind: 'place', id: QUEST_ID }] }, ...ask('안녕')],
    ],
  ])('%s', async (_, messages) => {
    model.script({ text: '네' });

    const response = await postAssistantMessages(app, accessToken, messages);

    expect(response.status).toBe(400);
    expect(model.received()).toHaveLength(0);
  });
});

// An app with a time per message of 200 ms and a daily limit of 2 messages.
let limited: INestApplication<Server>;

beforeAll(async () => {
  limited = await startApp(
    { ...inject('settings'), ASSISTANT_TIMEOUT_MS: '200', ASSISTANT_DAILY_MESSAGES: '2' },
    [],
    refuseKakao,
    refuseMatchServer,
    model.model,
  );
});

afterAll(async () => {
  await limited.close();
});

// Sends a message to the limited app, and answers the reply's status.
async function sendLimited(token: string): Promise<number> {
  model.script({ text: '네' });
  return (await postAssistantMessages(limited, token, ask('안녕'))).status;
}

describe('With a shorter time per message', () => {
  it('a model that stalls past the time gets the error reply', async () => {
    const logs = captureLogs();
    const { accessToken: token } = await signIn(limited);
    model.script({ stall: true });

    const response = await postAssistantMessages(limited, token, ask('안녕'));

    expect(response.body).toEqual(UNAVAILABLE);
    expect(logs()).toContain('TimeoutError');
  });
});

describe('With a shorter daily limit', () => {
  it("a message past the day's limit gets the limit reply without calling the model", async () => {
    const { accessToken: token } = await signIn(limited);
    expect([await sendLimited(token), await sendLimited(token)]).toEqual([200, 200]);
    model.script({ text: '네' });

    const response = await postAssistantMessages(limited, token, ask('안녕'));

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject(USED_UP);
    expect(model.received()).toHaveLength(0);
  });

  it('counts again from midnight in Korea', async () => {
    const { accessToken: token } = await signIn(limited);
    const clock = vi.spyOn(limited.get<Clock>(CLOCK), 'now');
    // 23:59 on 2027-03-01 in Korea, then midnight.
    clock.mockReturnValue(new Date('2027-03-01T14:59:00Z'));
    expect([await sendLimited(token), await sendLimited(token), await sendLimited(token)]).toEqual([200, 200, 429]);
    clock.mockReturnValue(new Date('2027-03-01T15:00:00Z'));

    expect(await sendLimited(token)).toBe(200);
  });
});

describe('Without an OpenRouter key', () => {
  let keyless: INestApplication<Server>;

  beforeAll(async () => {
    keyless = await startApp(
      { ...inject('settings'), OPENROUTER_API_KEY: '' },
      [],
      refuseKakao,
      refuseMatchServer,
      model.model,
    );
  });

  afterAll(async () => {
    await keyless.close();
  });

  it('the server starts and serves the rest, and the endpoint gives the error reply without calling the model', async () => {
    const { accessToken: token } = await signIn(keyless);
    expect((await request(keyless.getHttpServer()).get('/health/ready')).status).toBe(200);
    model.script({ text: '네' });

    const response = await postAssistantMessages(keyless, token, ask('안녕'));

    expect(response.body).toEqual(UNAVAILABLE);
    expect(model.received()).toHaveLength(0);
  });
});
