import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser } from './friends.js';
import { attend, connectToDatabase, getQuest, getQuests, place132, questFor, storeEvent } from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('Attending a Global Event', () => {
  it('gives a Quest with the Global Event, the User as its Holder and a Sub Quest for attending', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const event = await storeEvent(prisma, { endsAt: null });

    const response = await attend(app, user, event.id);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: ANY_STRING,
      title: '지능형통신 연합전공 설명회',
      globalEvent: { id: event.id, title: '지능형통신 연합전공 설명회' },
      holders: [{ id: user.id, name: '김철수', department: '경영학과' }],
      subQuests: [
        {
          id: ANY_STRING,
          attending: true,
          title: '지능형통신 연합전공 설명회',
          startsAt: event.startsAt?.toISOString(),
          endsAt: null,
          place: { placeId: null, label: '뉴미디어통신공동연구소 이충웅홀(132동 103호)', ...place132 },
          completion: 'by_hand',
          cancelled: false,
          done: false,
          ended: false,
        },
      ],
      classQuest: false,
    });
  });

  it('gives each User a Quest of their own', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);

    const mine = await questFor(app, user, event.id);
    const theirs = await attend(app, other, event.id);

    expect(theirs.body).not.toMatchObject({ id: mine.questId });
    expect(theirs.body).toMatchObject({ holders: [{ id: other.id }] });
  });
});

describe('Attending a Global Event the User holds a Quest for', () => {
  it('gives the same Quest again', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const first = await attend(app, user, event.id);

    const again = await attend(app, user, event.id);

    expect(again.status).toBe(201);
    expect(again.body).toEqual(first.body);
    expect((await getQuests(app, user)).body).toEqual([first.body]);
  });

  it('gives one Quest when the User attends twice at the same moment', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);

    const [first, second] = await Promise.all([attend(app, user, event.id), attend(app, user, event.id)]);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(second.body).toEqual(first.body);
    expect((await getQuests(app, user)).body).toHaveLength(1);
  });
});

describe('Attending a Global Event that is not published', () => {
  it.each(['draft', 'cancelled', 'discarded'] as const)('is refused for a Global Event that is %s', async (state) => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma, { state });

    const response = await attend(app, user, event.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
    expect((await getQuests(app, user)).body).toEqual([]);
  });

  it('is refused for a Global Event that does not exist', async () => {
    const user = await signInUser(app);

    const response = await attend(app, user, randomUUID());

    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
  });
});

// 학생회관, 63동.
const studentCenter = { latitude: 37.4596, longitude: 126.9505 };

describe('The attending Sub Quest', () => {
  it('shows the time and the place the Global Event has now', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const moved = { title: '설명회 (장소 변경)', startsAt, endsAt, place: '학생회관', ...studentCenter };

    await prisma.globalEvent.update({ where: { id: event.id }, data: moved });

    expect((await getQuest(app, user, questId)).body).toMatchObject({
      title: '지능형통신 연합전공 설명회',
      subQuests: [
        {
          title: '설명회 (장소 변경)',
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          place: { placeId: null, label: '학생회관', ...studentCenter },
          completion: 'by_time',
          cancelled: false,
          ended: false,
        },
      ],
    });
  });

  it('is cancelled and ended once the Global Event is cancelled', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);

    await prisma.globalEvent.update({ where: { id: event.id }, data: { state: 'cancelled' } });

    expect((await getQuest(app, user, questId)).body).toMatchObject({
      subQuests: [{ attending: true, cancelled: true, ended: true }],
    });
    expect((await getQuests(app, user)).body).toEqual([]);
  });
});
