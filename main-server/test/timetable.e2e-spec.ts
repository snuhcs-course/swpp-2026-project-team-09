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
import { signIn } from './sign-in.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import {
  aClass,
  addClass,
  aTime,
  classesOf,
  deleteClass,
  putClass,
  replaceClass,
  resetTimetable,
  twoPlaceIds,
  withoutIds,
} from './timetable.js';

let app: INestApplication<Server>;
let placeIds: [string, string];

beforeAll(async () => {
  app = await startApp(inject('settings'));
  placeIds = await twoPlaceIds(app, (await signIn(app)).accessToken);
});

afterAll(async () => {
  await app.close();
});

describe('A User without classes', () => {
  it('reads an empty timetable', async () => {
    const { accessToken } = await signIn(app);

    expect(await classesOf(app, accessToken)).toEqual([]);
  });
});

describe('A class of several times', () => {
  it('is added and answered with an identifier for itself and for each time', async () => {
    const { accessToken } = await signIn(app);
    const sent = aClass(placeIds[0], {
      times: [
        aTime(placeIds[0]),
        aTime(placeIds[1], { weekday: 'thursday', startTime: '13:00', endTime: '14:15', room: '302호' }),
      ],
    });

    const added = await addClass(app, accessToken, sent);

    expect(withoutIds(added)).toEqual(sent);
    expect(new Set([added.id, ...added.times.map(({ id }) => id)]).size).toBe(3);
    expect(added.overlaps).toEqual([]);
    expect(await classesOf(app, accessToken)).toEqual([added]);
  });

  it('is replaced whole, and its times get new identifiers', async () => {
    const { accessToken } = await signIn(app);
    const added = await addClass(app, accessToken, aClass(placeIds[0]));
    const sent = {
      courseName: '운영체제',
      times: [aTime(placeIds[1], { weekday: 'monday', startTime: '14:00', endTime: '15:15', room: null })],
    };

    const replaced = await replaceClass(app, accessToken, added.id, sent);

    expect(replaced.id).toBe(added.id);
    expect(withoutIds(replaced)).toEqual(sent);
    expect(added.times.map(({ id }) => id)).not.toContain(replaced.times[0]?.id);
    expect(await classesOf(app, accessToken)).toEqual([replaced]);
  });

  it('is deleted, and is not found after', async () => {
    const { accessToken } = await signIn(app);
    const { id } = await addClass(app, accessToken, aClass(placeIds[0]));

    expect((await deleteClass(app, accessToken, id)).status).toBe(204);
    expect(await classesOf(app, accessToken)).toEqual([]);
    expect((await deleteClass(app, accessToken, id)).body).toMatchObject(refused(404, 'CLASS_NOT_FOUND'));
    expect((await putClass(app, accessToken, id, aClass(placeIds[0]))).body).toMatchObject(
      refused(404, 'CLASS_NOT_FOUND'),
    );
  });
});

describe('A time without a Place', () => {
  it('is stored with no Place, whether the Place is null or left out', async () => {
    const { accessToken } = await signIn(app);
    const leftOut = { weekday: 'friday', startTime: '09:30', endTime: '10:45' };

    const added = await addClass(app, accessToken, aClass(null, { times: [aTime(null), leftOut] }));

    expect(added.times).toMatchObject([
      { weekday: 'tuesday', placeId: null },
      { weekday: 'friday', placeId: null },
    ]);
  });
});

describe('The order of the timetable', () => {
  it('has the classes by their first time in the week and the times by weekday, then start', async () => {
    const { accessToken } = await signIn(app);
    const late = await addClass(app, accessToken, {
      courseName: '컴파일러',
      times: [
        aTime(null, { weekday: 'sunday' }),
        aTime(null, { weekday: 'tuesday', startTime: '14:00', endTime: '15:00' }),
      ],
    });
    const early = await addClass(app, accessToken, {
      courseName: '운영체제',
      times: [
        aTime(null, { weekday: 'wednesday' }),
        aTime(null, { weekday: 'tuesday', startTime: '08:00', endTime: '09:00' }),
      ],
    });

    expect(late.times.map(({ weekday }) => weekday)).toEqual(['tuesday', 'sunday']);
    expect(await classesOf(app, accessToken)).toEqual([early, late]);
    expect(early.times.map(({ weekday, startTime }) => `${weekday} ${startTime}`)).toEqual([
      'tuesday 08:00',
      'wednesday 09:30',
    ]);
  });
});

describe('A reset', () => {
  it("deletes every class of the User and leaves another User's", async () => {
    const owner = await signIn(app);
    const other = await signIn(app);
    await addClass(app, owner.accessToken, aClass(placeIds[0]));
    await addClass(app, owner.accessToken, aClass(placeIds[1], { courseName: '컴파일러' }));
    const kept = await addClass(app, other.accessToken, aClass(placeIds[0]));

    expect((await resetTimetable(app, owner.accessToken)).status).toBe(204);
    expect(await classesOf(app, owner.accessToken)).toEqual([]);
    expect(await classesOf(app, other.accessToken)).toEqual([kept]);
  });

  it('answers the same without classes', async () => {
    const { accessToken } = await signIn(app);

    expect((await resetTimetable(app, accessToken)).status).toBe(204);
    expect((await resetTimetable(app, accessToken)).status).toBe(204);
  });
});

describe("Another User's class", () => {
  it('is not found on replacing and deleting, and stays as it was', async () => {
    const owner = await signIn(app);
    const other = await signIn(app);
    const added = await addClass(app, owner.accessToken, aClass(placeIds[0]));

    const replacing = await putClass(app, other.accessToken, added.id, aClass(placeIds[1], { courseName: '운영체제' }));
    const deleting = await deleteClass(app, other.accessToken, added.id);

    expect(replacing.body).toMatchObject(refused(404, 'CLASS_NOT_FOUND'));
    expect(deleting.body).toMatchObject(refused(404, 'CLASS_NOT_FOUND'));
    expect(await classesOf(app, other.accessToken)).toEqual([]);
    expect(await classesOf(app, owner.accessToken)).toEqual([added]);
  });

  it('is not found on replacing with a Place the list does not hold', async () => {
    const owner = await signIn(app);
    const other = await signIn(app);
    const added = await addClass(app, owner.accessToken, aClass(placeIds[0]));

    const replacing = await putClass(app, other.accessToken, added.id, aClass(randomUUID()));

    expect(replacing.body).toMatchObject(refused(404, 'CLASS_NOT_FOUND'));
    expect(await classesOf(app, owner.accessToken)).toEqual([added]);
  });

  // The body's shape is checked before the handler runs, for any class: the answer tells nothing of the class.
  it('is answered on replacing with an invalid body as an unknown class is', async () => {
    const owner = await signIn(app);
    const other = await signIn(app);
    const added = await addClass(app, owner.accessToken, aClass(placeIds[0]));
    const invalid = aClass(placeIds[0], { times: [] });

    const replacing = await putClass(app, other.accessToken, added.id, invalid);
    const unknown = await putClass(app, other.accessToken, randomUUID(), invalid);

    expect(replacing.status).toBe(400);
    expect(replacing.body).toEqual(unknown.body);
    expect(await classesOf(app, owner.accessToken)).toEqual([added]);
  });
});

describe('A class id', () => {
  it('that is not a UUID is refused with 400', async () => {
    const { accessToken } = await signIn(app);

    expect((await putClass(app, accessToken, 'not-a-uuid', aClass(placeIds[0]))).status).toBe(400);
    expect((await deleteClass(app, accessToken, 'not-a-uuid')).status).toBe(400);
  });
});
