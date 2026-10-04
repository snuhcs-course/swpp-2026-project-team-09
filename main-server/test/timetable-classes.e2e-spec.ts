import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass, postClass, putClass, timetableOf, twoPlaceIds } from './timetable.js';

// The validation pipe starts each message with the path of the field, such as `courseName: ` or `weekdays.0: `.
const refusalSchema = z.object({ message: z.array(z.string()) });

let app: INestApplication<Server>;
let placeId: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  [placeId] = await twoPlaceIds(app, (await signIn(app)).accessToken);
});

afterAll(async () => {
  await app.close();
});

function aClass(fields: object = {}): object {
  return {
    courseName: '데이터베이스',
    weekdays: ['tuesday', 'thursday'],
    startTime: '09:30',
    endTime: '10:45',
    placeId,
    room: '101호',
    ...fields,
  };
}

describe('A class with an invalid field', () => {
  it.each([
    ['courseName', 'an empty course name', { courseName: '' }],
    ['courseName', 'a blank course name', { courseName: '   ' }],
    ['courseName', 'a course name longer than 30 characters', { courseName: 'a'.repeat(31) }],
    ['weekdays', 'no weekday', { weekdays: [] }],
    ['weekdays', 'a weekday that is not one', { weekdays: ['someday'] }],
    ['weekdays', 'the same weekday twice', { weekdays: ['monday', 'monday'] }],
    ['startTime', 'a start that is not a time of day', { startTime: '24:00' }],
    ['startTime', 'a start without minutes', { startTime: '9' }],
    ['endTime', 'an end that is not a time of day', { endTime: '10:60' }],
    ['endTime', 'an end at the start', { endTime: '09:30' }],
    ['endTime', 'an end before the start', { endTime: '09:00' }],
    ['placeId', 'a Place that is not an id', { placeId: '301동' }],
    ['placeId', 'a Place the list does not hold', { placeId: randomUUID() }],
    ['room', 'an empty room', { room: '' }],
    ['room', 'a room longer than 20 characters', { room: 'a'.repeat(21) }],
  ])('is refused with 400 naming %s when it has %s, and is not stored', async (field, _case, fields) => {
    const { accessToken } = await signIn(app);

    const response = await postClass(app, accessToken, aClass(fields));

    expect(response.status).toBe(400);
    expect(refusalSchema.parse(response.body).message[0]).toMatch(new RegExp(`^${field}[.:]`, 'u'));
    expect((await timetableOf(app, accessToken)).classes).toEqual([]);
  });

  it('is refused when edited, and the class stays as it was', async () => {
    const { accessToken } = await signIn(app);
    const added = await addClass(app, accessToken, aClass());

    const response = await putClass(app, accessToken, added.id, aClass({ placeId: randomUUID() }));

    expect(response.status).toBe(400);
    expect((await timetableOf(app, accessToken)).classes).toEqual([added]);
  });
});

describe('A class at a limit', () => {
  it('is accepted', async () => {
    const { accessToken } = await signIn(app);
    const fields = {
      courseName: 'a'.repeat(30),
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      startTime: '00:00',
      endTime: '23:59',
      room: 'a'.repeat(20),
    };

    expect(await addClass(app, accessToken, aClass(fields))).toMatchObject(fields);
  });
});

describe('A class that overlaps another', () => {
  it('is accepted, and the answer and the timetable name the classes it overlaps', async () => {
    const { accessToken } = await signIn(app);
    const database = await addClass(app, accessToken, aClass({ courseName: '데이터베이스' }));
    // Shares Thursday only, and crosses 10:00 to 10:45.
    const compilers = await addClass(
      app,
      accessToken,
      aClass({ courseName: '컴파일러', weekdays: ['monday', 'thursday'], startTime: '10:00', endTime: '11:15' }),
    );
    // Starts as 컴파일러 ends.
    const graphics = await addClass(
      app,
      accessToken,
      aClass({ courseName: '그래픽스', weekdays: ['thursday'], startTime: '11:15', endTime: '12:30' }),
    );

    expect(database.overlaps).toEqual([]);
    expect(compilers.overlaps).toEqual([{ id: database.id, courseName: '데이터베이스' }]);
    expect(graphics.overlaps).toEqual([]);
    expect((await timetableOf(app, accessToken)).classes).toEqual([
      { ...compilers, overlaps: [{ id: database.id, courseName: '데이터베이스' }] },
      { ...database, overlaps: [{ id: compilers.id, courseName: '컴파일러' }] },
      graphics,
    ]);
  });

  it('on a weekday it no longer shares, after an edit, overlaps nothing', async () => {
    const { accessToken } = await signIn(app);
    const database = await addClass(app, accessToken, aClass());
    const compilers = await addClass(app, accessToken, aClass({ courseName: '컴파일러', weekdays: ['thursday'] }));

    const response = await putClass(
      app,
      accessToken,
      compilers.id,
      aClass({ courseName: '컴파일러', weekdays: ['friday'] }),
    );

    expect(response.body).toMatchObject({ overlaps: [] });
    expect((await timetableOf(app, accessToken)).classes).toEqual([
      { ...database, overlaps: [] },
      { ...compilers, weekdays: ['friday'], overlaps: [] },
    ]);
  });
});

describe('Adding a class', () => {
  it('without an Idempotency-Key is refused, and nothing is stored', async () => {
    const { accessToken } = await signIn(app);

    const response = await postClass(app, accessToken, aClass(), null);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect((await timetableOf(app, accessToken)).classes).toEqual([]);
  });

  it('twice with the same key stores one class and answers the same twice', async () => {
    const { accessToken } = await signIn(app);
    const key = randomUUID();

    const first = await postClass(app, accessToken, aClass(), key);
    const repeat = await postClass(app, accessToken, aClass(), key);

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect((await timetableOf(app, accessToken)).classes).toEqual([first.body]);
  });
});
