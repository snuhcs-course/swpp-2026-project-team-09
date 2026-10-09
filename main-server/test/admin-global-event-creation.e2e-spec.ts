/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { postGlobalEvent } from './global-event-changes.js';
import { eventDetailSchema, getAdminGlobalEvent, listedAmong } from './global-event-lists.js';
import { place132 } from './quests.js';
import { refused } from './signals.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await app.close();
});

const submission = {
  title: '  동아리 박람회  ',
  description: '중앙동아리 70여 곳이 참여합니다.',
  startsAt: '2099-10-13T17:00:00+09:00',
  endsAt: '2099-10-13T19:00:00+09:00',
  place: ' 뉴미디어통신공동연구소 이충웅홀(132동 103호) ',
  ...place132,
};

describe('A Global Event created by an Administrator', () => {
  it('is a Draft at version 1, answered as reading it by id answers it', async () => {
    const response = await postGlobalEvent(app, accessToken, submission);

    expect(response.status).toBe(201);
    const created = eventDetailSchema.parse(response.body);
    expect(created).toEqual({
      id: created.id,
      title: '동아리 박람회',
      description: '중앙동아리 70여 곳이 참여합니다.',
      startsAt: '2099-10-13T08:00:00.000Z',
      endsAt: '2099-10-13T10:00:00.000Z',
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...place132,
      state: 'draft',
      version: 1,
      postNumber: null,
      sourceUrl: null,
      missing: [],
    });
    expect((await getAdminGlobalEvent(app, accessToken, created.id)).body).toEqual(created);
  });

  it('needs only a title and a description, and then misses its start and position', async () => {
    const response = await postGlobalEvent(app, accessToken, { title: '동아리 박람회', description: '' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      startsAt: null,
      endsAt: null,
      place: null,
      latitude: null,
      longitude: null,
      missing: ['startsAt', 'position'],
    });
  });
});

describe('Creating a Global Event by hand', () => {
  it('is done once when the same Idempotency-Key is sent again', async () => {
    const key = randomUUID();
    const first = await postGlobalEvent(app, accessToken, submission, key);

    const repeat = await postGlobalEvent(app, accessToken, submission, key);

    expect(repeat.status).toBe(201);
    expect(repeat.body).toEqual(first.body);
    const drafts = await listedAmong(app, accessToken, 'draft', [eventDetailSchema.parse(first.body).id]);
    expect(drafts).toHaveLength(1);
  });

  it('is refused without an Idempotency-Key', async () => {
    const response = await postGlobalEvent(app, accessToken, submission, null);

    expect(response.body).toMatchObject(refused(400, 'IDEMPOTENCY_KEY_REQUIRED'));
  });
});
