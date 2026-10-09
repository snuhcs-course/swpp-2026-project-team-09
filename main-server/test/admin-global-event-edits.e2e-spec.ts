// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createDraft, patchGlobalEvent } from './global-event-changes.js';
import { eventDetailSchema, getAdminGlobalEvent } from './global-event-lists.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const fullDraft = {
  description: '중앙동아리 70여 곳이 참여합니다.',
  startsAt: '2099-10-13T17:00:00+09:00',
  endsAt: '2099-10-13T19:00:00+09:00',
  place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  ...place132,
};

// 제2공학관, 302동.
const place302 = { latitude: 37.44887, longitude: 126.95265 };

describe('Editing a Draft', () => {
  it('changes the fields given, keeps those left out, and raises the version by one', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const response = await patchGlobalEvent(app, accessToken, draft.id, {
      version: 1,
      title: '  동아리 박람회 (장소 변경)  ',
      place: '제2공학관 101호',
      ...place302,
    });

    expect(response.status).toBe(200);
    expect(eventDetailSchema.parse(response.body)).toEqual({
      ...draft,
      title: '동아리 박람회 (장소 변경)',
      place: '제2공학관 101호',
      ...place302,
      version: 2,
    });
    expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(response.body);
  });
});

describe('Editing a Draft with null or empty fields', () => {
  it('clears an optional field sent as null', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const response = await patchGlobalEvent(app, accessToken, draft.id, {
      version: 1,
      endsAt: null,
      place: null,
      latitude: null,
      longitude: null,
    });

    expect(response.body).toEqual({
      ...draft,
      endsAt: null,
      place: null,
      latitude: null,
      longitude: null,
      version: 2,
      missing: ['position'],
    });
  });

  it('takes an empty description', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const response = await patchGlobalEvent(app, accessToken, draft.id, { version: 1, description: '' });

    expect(response.body).toMatchObject({ description: '', version: 2 });
  });
});

describe('Editing a published event', () => {
  it('changes it and keeps it published', async () => {
    const event = await storeEvent(prisma);

    const response = await patchGlobalEvent(app, accessToken, event.id, {
      version: 1,
      startsAt: '2099-10-20T17:00:00+09:00',
      endsAt: null,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: '지능형통신 연합전공 설명회',
      startsAt: '2099-10-20T08:00:00.000Z',
      endsAt: null,
      ...place132,
      state: 'published',
      version: 2,
      missing: [],
    });
  });
});

describe('Editing an event', () => {
  it.each(['cancelled', 'discarded'] as const)('that is %s is refused with its state', async (state) => {
    const event = await storeEvent(prisma, { state });

    const response = await patchGlobalEvent(app, accessToken, event.id, { version: 1, title: '다시 열기' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_STATE', state });
  });

  it('from an older version is refused with the stored version, and changes nothing', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);
    const edited = eventDetailSchema.parse(
      (await patchGlobalEvent(app, accessToken, draft.id, { version: 1, title: '먼저 고친 제목' })).body,
    );

    const response = await patchGlobalEvent(app, accessToken, draft.id, { version: 1, title: '나중에 고친 제목' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_CHANGED', version: 2 });
    expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(edited);
  });

  it('twice from the same version at the same moment applies one edit and refuses the other', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const responses = await Promise.all(
      ['한 편의 제목', '다른 편의 제목'].map((title) =>
        patchGlobalEvent(app, accessToken, draft.id, { version: 1, title }),
      ),
    );

    expect(responses.map(({ status }) => status).toSorted((a, b) => a - b)).toEqual([200, 409]);
    const applied = responses.find(({ status }) => status === 200);
    const refusedOne = responses.find(({ status }) => status === 409);
    expect(refusedOne?.body).toMatchObject({ code: 'GLOBAL_EVENT_CHANGED', version: 2 });
    expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(applied?.body);
  });

  it('that is unknown is refused with 404', async () => {
    const response = await patchGlobalEvent(app, accessToken, randomUUID(), { version: 1, title: '없는 행사' });

    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
  });
});
