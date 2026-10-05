import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient, Weekday } from '../src/generated/prisma/client.js';
import { signInUser } from './friends.js';
import { overlapOnLock } from './overlap.js';
import { connectToDatabase } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { aClass, classesOf, postClass } from './timetable.js';

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

// Stored as they would be added, each with two times, which the limit counts as one class.
async function storeClasses(userId: string, count: number): Promise<void> {
  const times = [
    { weekday: Weekday.monday, startTime: '09:00', endTime: '10:00' },
    { weekday: Weekday.wednesday, startTime: '09:00', endTime: '10:00' },
  ];
  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      prisma.timetableClass.create({ data: { userId, courseName: `강의 ${index}`, times: { create: times } } }),
    ),
  );
}

describe('A User with 15 classes', () => {
  it('is refused a 16th with TIMETABLE_FULL', async () => {
    const { id, accessToken } = await signInUser(app);
    await storeClasses(id, 15);

    const response = await postClass(app, accessToken, aClass(null));

    expect(response.body).toMatchObject(refused(409, 'TIMETABLE_FULL'));
    expect(await classesOf(app, accessToken)).toHaveLength(15);
  });
});

describe('Several first adds of one User at the same moment', () => {
  it('each succeed', async () => {
    const { accessToken } = await signInUser(app);

    const answers = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        postClass(app, accessToken, aClass(null, { courseName: `강의 ${index}` })),
      ),
    );

    expect(answers.map(({ status }) => status)).toEqual([201, 201, 201, 201, 201]);
    expect(await classesOf(app, accessToken)).toHaveLength(5);
  });
});

describe('Two adds at the same moment with one place left', () => {
  it('add one class', async () => {
    const user = await signInUser(app);
    await storeClasses(user.id, 14);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM users WHERE id = ${user.id}::uuid FOR UPDATE`,
      () => postClass(app, user.accessToken, aClass(null, { courseName: '운영체제' })),
      () => postClass(app, user.accessToken, aClass(null, { courseName: '컴파일러' })),
    );

    expect(answers[0].status).toBe(201);
    expect(answers[1].body).toMatchObject(refused(409, 'TIMETABLE_FULL'));
    expect(await classesOf(app, user.accessToken)).toHaveLength(15);
  });
});
