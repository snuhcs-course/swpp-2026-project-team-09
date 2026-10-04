import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass, deleteClass, patchTimetable, putClass, timetableOf, twoPlaceIds } from './timetable.js';

let app: INestApplication<Server>;
let placeIds: [string, string];

beforeAll(async () => {
  app = await startApp(inject('settings'));
  placeIds = await twoPlaceIds(app, (await signIn(app)).accessToken);
});

afterAll(async () => {
  await app.close();
});

function databaseClass(): object {
  return {
    courseName: '데이터베이스',
    weekdays: ['tuesday', 'thursday'],
    startTime: '09:30',
    endTime: '10:45',
    placeId: placeIds[0],
    room: '101호',
  };
}

describe('A User without a timetable', () => {
  it('reads an empty one', async () => {
    const { accessToken } = await signIn(app);

    expect(await timetableOf(app, accessToken)).toEqual({ semesterFirstDay: null, semesterLastDay: null, classes: [] });
  });
});

describe("The semester's days", () => {
  it('are set and read back', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchTimetable(app, accessToken, {
      semesterFirstDay: '2026-09-01',
      semesterLastDay: '2026-12-18',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ semesterFirstDay: '2026-09-01', semesterLastDay: '2026-12-18', classes: [] });
    expect(await timetableOf(app, accessToken)).toMatchObject({
      semesterFirstDay: '2026-09-01',
      semesterLastDay: '2026-12-18',
    });
  });

  it('change only the day sent, and null clears one', async () => {
    const { accessToken } = await signIn(app);
    await patchTimetable(app, accessToken, { semesterFirstDay: '2026-09-01', semesterLastDay: '2026-12-18' });

    await patchTimetable(app, accessToken, { semesterLastDay: '2026-12-19' });
    expect(await timetableOf(app, accessToken)).toMatchObject({
      semesterFirstDay: '2026-09-01',
      semesterLastDay: '2026-12-19',
    });

    await patchTimetable(app, accessToken, { semesterFirstDay: null });
    expect(await timetableOf(app, accessToken)).toMatchObject({
      semesterFirstDay: null,
      semesterLastDay: '2026-12-19',
    });
  });

  it('may be one day', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchTimetable(app, accessToken, {
      semesterFirstDay: '2026-09-01',
      semesterLastDay: '2026-09-01',
    });

    expect(response.status).toBe(200);
  });
});

describe("Refusing the semester's days", () => {
  it('refuses a last day before the first, also against the stored first day, and changes nothing', async () => {
    const { accessToken } = await signIn(app);
    await patchTimetable(app, accessToken, { semesterFirstDay: '2026-09-01' });

    const together = await patchTimetable(app, accessToken, {
      semesterFirstDay: '2026-09-02',
      semesterLastDay: '2026-09-01',
    });
    const alone = await patchTimetable(app, accessToken, { semesterLastDay: '2026-08-31' });

    expect(together.status).toBe(400);
    expect(together.body).toMatchObject({ message: ['semesterLastDay: must not be before semesterFirstDay'] });
    expect(alone.status).toBe(400);
    expect(await timetableOf(app, accessToken)).toMatchObject({
      semesterFirstDay: '2026-09-01',
      semesterLastDay: null,
    });
  });

  it.each([
    ['a day that is not a calendar day', { semesterFirstDay: '2026-02-30' }],
    ['a day with a time', { semesterLastDay: '2026-12-18T00:00:00Z' }],
  ])('refuses %s with 400 and names the field', async (_case, body) => {
    const { accessToken } = await signIn(app);

    const response = await patchTimetable(app, accessToken, body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringMatching(`^${Object.keys(body).join()}: `)] });
  });
});

describe('A class', () => {
  it('is added and answered with its fields', async () => {
    const { accessToken } = await signIn(app);

    const added = await addClass(app, accessToken, databaseClass());

    expect(added).toEqual({ id: added.id, ...databaseClass(), overlaps: [] });
    expect((await timetableOf(app, accessToken)).classes).toEqual([added]);
  });

  it('keeps its weekdays in the order of the week and may have no room', async () => {
    const { accessToken } = await signIn(app);

    const added = await addClass(app, accessToken, {
      ...databaseClass(),
      weekdays: ['sunday', 'monday', 'friday'],
      room: undefined,
    });

    expect(added).toMatchObject({ weekdays: ['monday', 'friday', 'sunday'], room: null });
  });

  it('is edited whole', async () => {
    const { accessToken } = await signIn(app);
    const { id } = await addClass(app, accessToken, databaseClass());
    const edited = {
      courseName: '운영체제',
      weekdays: ['monday'],
      startTime: '14:00',
      endTime: '15:15',
      placeId: placeIds[1],
      room: null,
    };

    const response = await putClass(app, accessToken, id, edited);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, ...edited, overlaps: [] });
    expect((await timetableOf(app, accessToken)).classes).toEqual([{ id, ...edited, overlaps: [] }]);
  });

  it('is deleted', async () => {
    const { accessToken } = await signIn(app);
    const { id } = await addClass(app, accessToken, databaseClass());

    expect((await deleteClass(app, accessToken, id)).status).toBe(204);
    expect((await timetableOf(app, accessToken)).classes).toEqual([]);
    expect((await deleteClass(app, accessToken, id)).status).toBe(404);
  });
});

describe("Another User's class", () => {
  it('is answered as not found, and stays as it was', async () => {
    const owner = await signIn(app);
    const other = await signIn(app);
    const added = await addClass(app, owner.accessToken, databaseClass());

    const edit = await putClass(app, other.accessToken, added.id, { ...databaseClass(), courseName: '운영체제' });
    const removal = await deleteClass(app, other.accessToken, added.id);

    expect(edit.status).toBe(404);
    expect(removal.status).toBe(404);
    expect((await timetableOf(app, other.accessToken)).classes).toEqual([]);
    expect((await timetableOf(app, owner.accessToken)).classes).toEqual([added]);
  });
});

describe('A class id', () => {
  it('that is not a UUID is refused with 400', async () => {
    const { accessToken } = await signIn(app);

    expect((await putClass(app, accessToken, 'not-a-uuid', databaseClass())).status).toBe(400);
    expect((await deleteClass(app, accessToken, 'not-a-uuid')).status).toBe(400);
  });
});
