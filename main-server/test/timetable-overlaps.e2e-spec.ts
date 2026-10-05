import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { aClass, addClass, aTime, classesOf, postClass, replaceClass } from './timetable.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

describe('Two times of one class', () => {
  it('that share a weekday and cross are refused, naming the later one', async () => {
    const { accessToken } = await signIn(app);
    const crossing = aClass(null, {
      times: [aTime(null, { weekday: 'friday' }), aTime(null), aTime(null, { startTime: '10:00', endTime: '11:00' })],
    });

    const response = await postClass(app, accessToken, crossing);

    expect(response.status).toBe(400);
    expect(z.object({ message: z.array(z.string()) }).parse(response.body).message[0]).toMatch(/^times\.2: /u);
    expect(await classesOf(app, accessToken)).toEqual([]);
  });

  it('that touch are accepted', async () => {
    const { accessToken } = await signIn(app);

    const added = await addClass(
      app,
      accessToken,
      aClass(null, { times: [aTime(null), aTime(null, { startTime: '10:45', endTime: '12:00' })] }),
    );

    expect(added.times).toHaveLength(2);
  });
});

describe('A class that overlaps another on one of its times', () => {
  it('is accepted, and the answer and the timetable name the classes it overlaps', async () => {
    const { accessToken } = await signIn(app);
    // On Tuesday and Thursday from 09:30 to 10:45.
    const database = await addClass(app, accessToken, aClass(null));
    // Crosses on Thursday only.
    const compilers = await addClass(app, accessToken, {
      courseName: '컴파일러',
      times: [
        aTime(null, { weekday: 'monday' }),
        aTime(null, { weekday: 'thursday', startTime: '10:00', endTime: '11:15' }),
      ],
    });
    // Starts on Thursday as 컴파일러 ends, and ends on Tuesday as 데이터베이스 starts.
    const graphics = await addClass(app, accessToken, {
      courseName: '그래픽스',
      times: [
        aTime(null, { weekday: 'tuesday', startTime: '08:00', endTime: '09:30' }),
        aTime(null, { weekday: 'thursday', startTime: '11:15', endTime: '12:30' }),
      ],
    });

    expect(database.overlaps).toEqual([]);
    expect(compilers.overlaps).toEqual([{ id: database.id, courseName: '데이터베이스' }]);
    expect(graphics.overlaps).toEqual([]);
    expect(await classesOf(app, accessToken)).toEqual([
      { ...compilers, overlaps: [{ id: database.id, courseName: '데이터베이스' }] },
      graphics,
      { ...database, overlaps: [{ id: compilers.id, courseName: '컴파일러' }] },
    ]);
  });

  it('no longer overlaps it once replaced onto another weekday', async () => {
    const { accessToken } = await signIn(app);
    const database = await addClass(app, accessToken, aClass(null));
    const compilers = await addClass(app, accessToken, aClass(null, { courseName: '컴파일러' }));

    const replaced = await replaceClass(app, accessToken, compilers.id, {
      courseName: '컴파일러',
      times: [aTime(null, { weekday: 'friday' })],
    });

    expect(compilers.overlaps).toEqual([{ id: database.id, courseName: '데이터베이스' }]);
    expect(replaced.overlaps).toEqual([]);
    expect(await classesOf(app, accessToken)).toEqual([{ ...database, overlaps: [] }, replaced]);
  });
});

describe('Adding a class', () => {
  it('without an Idempotency-Key is refused, and nothing is stored', async () => {
    const { accessToken } = await signIn(app);

    const response = await postClass(app, accessToken, aClass(null), null);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(await classesOf(app, accessToken)).toEqual([]);
  });

  it('twice with the same key stores one class and answers the same twice', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    const first = await postClass(app, accessToken, aClass(null), key);
    const repeat = await postClass(app, accessToken, aClass(null), key);

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect(await classesOf(app, accessToken)).toEqual([first.body]);
  });
});
