/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { MockLanguageModelV4 } from 'ai/test';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { signInUser } from './friends.js';
import { startApp } from './start-app.js';

// P15-52: `POST /timetable/readings` over HTTP, with a stand-in for the model that answers a fixed reading or fails.
// The model is never called for real.

type Result = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;
type CallOptions = MockLanguageModelV4['doGenerateCalls'][number];

const NO_USAGE: Result['usage'] = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

// What the model reads on everytime-2's first three blocks: a 12-hour axis, a name wrapped inside a word.
const ANSWER = {
  title: '2022년 1학기',
  axis: ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6'],
  blocks: [
    {
      day: '화',
      start: '11:00',
      end: '12:15',
      nameLines: ['대학영어 2: 말', '하기'],
      name: '대학영어 2: 말하기',
      room: '8-408',
      cut: false,
    },
    {
      day: '목',
      start: '11:00',
      end: '12:15',
      nameLines: ['대학영어 2: 말', '하기'],
      name: '대학영어 2: 말하기',
      room: '8-408',
      cut: false,
    },
    { day: '목', start: '5:00', end: '6:15', nameLines: ['물리학 1'], name: '물리학 1', room: '56-105', cut: false },
  ],
};

// The grid the phone found for the same three blocks: 9:00 at y = 300, 100 pixels an hour; and what the model reads
// on it, one end an hour off, which the pixels mend.
const GRID = {
  columns: 5,
  blocks: [
    { column: 1, top: 500, bottom: 625, colour: [160, 200, 100], fades: false },
    { column: 3, top: 500, bottom: 625, colour: [160, 200, 100], fades: false },
    { column: 3, top: 1100, bottom: 1225, colour: [250, 165, 90], fades: false },
  ],
};
const LAYOUT = {
  title: '2022년 1학기',
  axis: ANSWER.axis,
  blocks: [
    { number: 1, day: '화', start: '11:00', end: '12:15' },
    { number: 2, day: '목', start: '11:00', end: '1:15' },
    { number: 3, day: '목', start: '5:00', end: '6:15' },
  ],
};
const TEXT = {
  title: '2022년 1학기',
  blocks: [
    { number: 1, nameLines: ['대학영어 2: 말', '하기'], name: '대학영어 2: 말하기', room: '8-408' },
    { number: 2, nameLines: ['대학영어 2: 말', '하기'], name: '대학영어 2: 말하기', room: '8-408' },
    { number: 3, nameLines: ['물리학 1'], name: '물리학 1', room: '56-105' },
  ],
};

// The fake model answers the layout call, the text call and the whole picture's call each in its shape.
function answerFor(prompt: string): object {
  if (prompt.includes('column 1') || prompt.includes('column 2')) {
    return LAYOUT;
  }
  return prompt.includes('The blocks:') ? TEXT : ANSWER;
}

// A PNG's first bytes and a little more: the server reads the kind from them and sends the bytes on.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]).toString(
  'base64',
);

let failing = false;
const calls: CallOptions[] = [];
const model = new MockLanguageModelV4({
  provider: 'reading',
  modelId: 'reading',
  doGenerate: (options): Promise<Result> => {
    calls.push(options);
    if (failing) {
      return Promise.reject(new Error('The provider failed'));
    }
    return Promise.resolve({
      content: [{ type: 'text', text: JSON.stringify(answerFor(JSON.stringify(options.prompt))) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: NO_USAGE,
      warnings: [],
    });
  },
});

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp({ ...inject('settings'), TIMETABLE_READING_DAILY: '2' }, [], undefined, undefined, model);
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  failing = false;
  calls.length = 0;
});

function post(accessToken: string | null, body: Record<string, unknown>): request.Test {
  const test = request(app.getHttpServer()).post('/timetable/readings').send(body);
  return accessToken === null ? test : test.set('Authorization', `Bearer ${accessToken}`);
}

describe('reading a timetable screenshot', () => {
  it('answers the checked classes: the 12-hour axis on past noon, equal names one class, each time with its room', async () => {
    const { accessToken } = await signInUser(app);
    const response = await post(accessToken, { image: PNG }).expect(200);
    expect(response.body).toEqual({
      kind: 'read',
      title: '2022년 1학기',
      classes: [
        {
          name: '대학영어 2: 말하기',
          times: [
            { weekday: 'tuesday', start: '11:00', end: '12:15', room: '8-408' },
            { weekday: 'thursday', start: '11:00', end: '12:15', room: '8-408' },
          ],
        },
        { name: '물리학 1', times: [{ weekday: 'thursday', start: '17:00', end: '18:15', room: '56-105' }] },
      ],
      leftOut: [],
    });
    // The picture went to the model as an image, once.
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0]?.prompt)).toContain('"mediaType":"image/png"');
  });
});

describe('reading a timetable screenshot with the grid the phone found', () => {
  it('places the blocks from the pixels and takes their text from the model', async () => {
    const { accessToken } = await signInUser(app);
    const response = await post(accessToken, { image: PNG, grid: GRID }).expect(200);
    expect(response.body).toEqual({
      kind: 'read',
      title: '2022년 1학기',
      classes: [
        {
          name: '대학영어 2: 말하기',
          times: [
            { weekday: 'tuesday', start: '11:00', end: '12:15', room: '8-408' },
            { weekday: 'thursday', start: '11:00', end: '12:15', room: '8-408' },
          ],
        },
        { name: '물리학 1', times: [{ weekday: 'thursday', start: '17:00', end: '18:15', room: '56-105' }] },
      ],
      leftOut: [],
    });
  });

  it('refuses a grid of another shape', async () => {
    const { accessToken } = await signInUser(app);
    await post(accessToken, { image: PNG, grid: { columns: 9, blocks: [] } }).expect(400);
  });
});

describe('a refused timetable screenshot', () => {
  it('refuses a User who is not signed in', async () => {
    await post(null, { image: PNG }).expect(401);
    expect(calls).toHaveLength(0);
  });

  it('refuses a body that is not a picture, without calling the model', async () => {
    const { accessToken } = await signInUser(app);
    await post(accessToken, { image: 'not base64!' }).expect(400);
    const text = await post(accessToken, { image: Buffer.from('hello, not a picture').toString('base64') }).expect(422);
    expect(z.object({ code: z.string() }).parse(text.body).code).toBe('UNREADABLE_IMAGE');
    expect(calls).toHaveLength(0);
  });

  it('takes a body larger than other routes take, up to its own limit', async () => {
    const { accessToken } = await signInUser(app);
    // About 2 MB of base64: over the 1 MB of every other route.
    const large = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(1_500_000)]).toString('base64');
    await post(accessToken, { image: large }).expect(200);
    const tooLarge = 'A'.repeat(8 * 1024 * 1024);
    await post(accessToken, { image: tooLarge }).expect(413);
  });

  it('answers 503 when the model fails, so that the phone reads the picture', async () => {
    const { accessToken } = await signInUser(app);
    failing = true;
    await post(accessToken, { image: PNG }).expect(503);
  });

  it("answers 429 once the User's readings of the day are used up", async () => {
    const { accessToken } = await signInUser(app);
    await post(accessToken, { image: PNG }).expect(200);
    await post(accessToken, { image: PNG }).expect(200);
    await post(accessToken, { image: PNG }).expect(429);
    expect(calls).toHaveLength(2);
  });
});
