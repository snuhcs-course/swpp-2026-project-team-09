/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser } from './friends.js';
import { attend, connectToDatabase, getQuests, makeQuest, place132, storeEvent } from './quests.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

const subQuest = {
  title: '저녁',
  startsAt: '2030-10-13T09:00:00.000Z',
  endsAt: '2030-10-13T10:00:00.000Z',
  place: { label: '자하연 앞', ...place132 },
};

const post = { joinPolicy: 'open', board: 'meal', description: '학관에서 저녁 먹을 사람' };

describe('Making a Quest of one’s own', () => {
  it('gives a Quest without a Global Event, led and held by the User, with the Sub Quest given', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });

    const response = await makeQuest(app, user, {
      title: '저녁 같이 먹어요',
      subQuest,
      capacity: 6,
      ...post,
    });

    expect(response.status).toBe(201);
    const holder = { id: user.id, name: '김철수', department: '경영학과' };
    expect(response.body).toEqual({
      id: ANY_STRING,
      title: '저녁 같이 먹어요',
      globalEvent: null,
      leader: holder,
      capacity: 6,
      ...post,
      createdAt: ANY_STRING,
      holders: [holder],
      subQuests: [
        {
          id: ANY_STRING,
          attending: false,
          ...subQuest,
          place: { placeId: null, ...subQuest.place },
          completion: 'by_time',
          cancelled: false,
          done: false,
          ended: false,
        },
      ],
      classQuest: false,
      waitingJoinRequests: 0,
    });
    expect((await getQuests(app, user)).body).toEqual([response.body]);
  });

  it('is Closed with capacity 4 when the User gives neither', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest: { title: '산책' } });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ leader: { id: user.id }, capacity: 4, joinPolicy: 'closed' });
  });
});

describe('Making a Quest', () => {
  it('tells the User', async () => {
    const user = await signInUser(app);

    await makeQuest(app, user, { title: '산책', subQuest: { title: '산책' } });

    await vi.waitFor(() => {
      expect(watcher.for(user).map(({ name }) => name)).toEqual(['quests-changed']);
    });
  });
});

describe('A Quest from attending a Global Event', () => {
  it('is led by the User, Closed and of capacity 4', async () => {
    const user = await signInUser(app);

    const response = await attend(app, user, (await storeEvent(prisma)).id);

    expect(response.body).toMatchObject({ leader: { id: user.id }, capacity: 4, joinPolicy: 'closed' });
  });
});

describe('Making a Quest again with the same key', () => {
  it('leaves one Quest and answers the same twice', async () => {
    const user = await signInUser(app);
    const key = randomUUID();
    const body = { title: '산책', subQuest: { title: '산책' } };

    const first = await makeQuest(app, user, body, key);
    const repeat = await makeQuest(app, user, body, key);

    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect((await getQuests(app, user)).body).toEqual([first.body]);
  });

  it('is refused without a key', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest: { title: '산책' } }, null);

    expect(response.body).toMatchObject(refused(400, 'IDEMPOTENCY_KEY_REQUIRED'));
    expect((await getQuests(app, user)).body).toEqual([]);
  });
});

describe('Making a Quest with a body that does not match', () => {
  it.each([
    ['no title', { subQuest: { title: '산책' } }, 'title'],
    ['a title too long', { title: '가'.repeat(51), subQuest: { title: '산책' } }, 'title'],
    ['no Sub Quest', { title: '산책' }, 'subQuest'],
    [
      'a Sub Quest that ends before it starts',
      { title: '산책', subQuest: { ...subQuest, endsAt: subQuest.startsAt } },
      'subQuest.endsAt',
    ],
    ['a capacity of 0', { title: '산책', subQuest: { title: '산책' }, capacity: 0 }, 'capacity'],
    ['a capacity of 9', { title: '산책', subQuest: { title: '산책' }, capacity: 9 }, 'capacity'],
    ['an unknown Join Policy', { title: '산책', subQuest: { title: '산책' }, joinPolicy: 'public' }, 'joinPolicy'],
  ])('is refused: %s', async (_case, body, field) => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, body);

    expect(response.status).toBe(400);
    expect(z.object({ message: z.array(z.string()) }).parse(response.body).message[0]).toMatch(`${field}: `);
  });

  it('is refused for a Place that is not in the list', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, {
      title: '산책',
      subQuest: { title: '산책', place: { placeId: randomUUID() } },
    });

    expect(response.body).toMatchObject(refused(404, 'PLACE_NOT_FOUND'));
    expect((await getQuests(app, user)).body).toEqual([]);
  });
});
