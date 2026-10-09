/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn } from './sign-in.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { aClass, addClass, aTime, classesOf, postClass, putClass, twoPlaceIds, withoutIds } from './timetable.js';

// The validation pipe starts each message with the path of the field, such as `courseName: ` or `times.0.weekday: `.
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

// The sample class with one time, changed. The table below is built before a Place is known, and needs none.
function withTime(fields: object): object {
  return aClass(null, { times: [aTime(null, fields)] });
}

// A time at each end of the day, with the longest room on the first.
function early(weekday: string): object {
  return aTime(placeId, { weekday, startTime: '00:00', endTime: '01:00', room: 'a'.repeat(20) });
}

function late(weekday: string): object {
  return aTime(null, { weekday, startTime: '23:00', endTime: '23:59' });
}

describe('A class with an invalid field', () => {
  it.each([
    ['courseName', 'an empty course name', aClass(null, { courseName: '' })],
    ['courseName', 'a blank course name', aClass(null, { courseName: '   ' })],
    ['courseName', 'a course name longer than 30 characters', aClass(null, { courseName: 'a'.repeat(31) })],
    ['times', 'no times', aClass(null, { times: [] })],
    [
      'times',
      '11 times',
      aClass(null, {
        times: Array.from({ length: 11 }, (_, hour) =>
          aTime(null, { startTime: `${10 + hour}:00`, endTime: `${10 + hour}:30` }),
        ),
      }),
    ],
    ['times.0.weekday', 'a weekday that is not one', withTime({ weekday: 'someday' })],
    ['times.0.startTime', 'a start that is not a time of day', withTime({ startTime: '24:00' })],
    ['times.0.startTime', 'a start without minutes', withTime({ startTime: '9' })],
    ['times.0.endTime', 'an end that is not a time of day', withTime({ endTime: '10:60' })],
    ['times.0.endTime', 'an end at the start', withTime({ endTime: '09:30' })],
    ['times.0.endTime', 'an end before the start', withTime({ endTime: '09:00' })],
    ['times.0.placeId', 'a Place that is not an id', withTime({ placeId: '301동' })],
    ['times.0.room', 'a room longer than 20 characters', withTime({ room: 'a'.repeat(21) })],
  ])('is refused with 400 naming %s when it has %s, and is not stored', async (field, _case, body) => {
    const { accessToken } = await signIn(app);

    const response = await postClass(app, accessToken, body);

    expect(response.status).toBe(400);
    expect(refusalSchema.parse(response.body).message[0]).toMatch(
      new RegExp(`^${field.replaceAll('.', '\\.')}[.:]`, 'u'),
    );
    expect(await classesOf(app, accessToken)).toEqual([]);
  });
});

describe('A class with a Place the list does not hold', () => {
  it('is refused with PLACE_NOT_FOUND for a Place the list does not hold, on any of its times', async () => {
    const { accessToken } = await signIn(app);

    const response = await postClass(
      app,
      accessToken,
      aClass(placeId, { times: [aTime(placeId), aTime(randomUUID(), { weekday: 'friday' })] }),
    );

    expect(response.body).toMatchObject(refused(404, 'PLACE_NOT_FOUND'));
    expect(await classesOf(app, accessToken)).toEqual([]);
  });

  it('is refused when replacing, as a body without times is, and the class stays as it was', async () => {
    const { accessToken } = await signIn(app);
    const added = await addClass(app, accessToken, aClass(placeId));

    const unknownPlace = await putClass(app, accessToken, added.id, withTime({ placeId: randomUUID() }));
    const noTimes = await putClass(app, accessToken, added.id, aClass(placeId, { times: [] }));

    expect(unknownPlace.body).toMatchObject(refused(404, 'PLACE_NOT_FOUND'));
    expect(noTimes.status).toBe(400);
    expect(await classesOf(app, accessToken)).toEqual([added]);
  });
});

describe('A class at a limit', () => {
  it('is accepted', async () => {
    const { accessToken } = await signIn(app);
    // Ten times, in the order they are answered.
    const sent = {
      courseName: 'a'.repeat(30),
      times: [
        early('monday'),
        late('monday'),
        early('tuesday'),
        late('tuesday'),
        early('wednesday'),
        late('wednesday'),
        early('thursday'),
        early('friday'),
        early('saturday'),
        early('sunday'),
      ],
    };

    const added = await addClass(app, accessToken, sent);

    expect(withoutIds(added)).toEqual(sent);
  });
});

describe('A room', () => {
  it.each([
    ['empty', ''],
    ['only spaces', '   '],
  ])('that is %s is stored as no room', async (_case, room) => {
    const { accessToken } = await signIn(app);

    const added = await addClass(app, accessToken, withTime({ room }));

    expect(added.times).toMatchObject([{ room: null }]);
    expect(await classesOf(app, accessToken)).toEqual([added]);
  });
});
