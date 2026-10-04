import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { addSubQuest, connectToDatabase, dropQuest, getQuests, questFor, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { aClass, addClass, deleteClass, patchTimetable, putClass, twoPlaceIds } from './timetable.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let place: Place;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  const [placeId] = await twoPlaceIds(app, (await signInUser(app)).accessToken);
  place = await prisma.place.findUniqueOrThrow({ where: { id: placeId } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function setClock(at: string): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(at));
}

// 09:00 in Asia/Seoul on Tuesday 2026-10-06.
const TUESDAY_MORNING = '2026-10-06T00:00:00.000Z';

// A class on Tuesdays and Thursdays from 09:30 to 10:45 in room 101호, with the fields given in place of these.
function addTuesdayClass(user: TestUser, fields: object = {}): ReturnType<typeof addClass> {
  return addClass(app, user.accessToken, aClass(place.id, fields));
}

async function classQuestTitles(user: TestUser): Promise<string[]> {
  const response = await getQuests(app, user);
  expect(response.status).toBe(200);
  return z
    .array(z.object({ title: z.string(), classQuest: z.boolean() }))
    .parse(response.body)
    .filter(({ classQuest }) => classQuest)
    .map(({ title }) => title);
}

describe('The Quest list on a day with a class', () => {
  it('shows a Class Quest for the class after the stored Quests', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const { questId } = await questFor(app, user, (await storeEvent(prisma, { endsAt: null })).id);
    const added = await addTuesdayClass(user);
    setClock(TUESDAY_MORNING);

    const response = await getQuests(app, user);

    expect(response.status).toBe(200);
    const [stored, classQuest] = z.array(z.unknown()).length(2).parse(response.body);
    expect(stored).toMatchObject({ id: questId, classQuest: false });
    expect(classQuest).toEqual({
      id: added.id,
      title: '데이터베이스',
      globalEvent: null,
      holders: [{ id: user.id, name: '김철수', department: '경영학과' }],
      subQuests: [
        {
          id: added.id,
          attending: false,
          title: '데이터베이스',
          startsAt: '2026-10-06T00:30:00.000Z',
          endsAt: '2026-10-06T01:45:00.000Z',
          place: {
            placeId: place.id,
            label: `${place.name} 101호`,
            latitude: place.latitude,
            longitude: place.longitude,
          },
          completion: 'by_time',
          cancelled: false,
          done: false,
          ended: false,
        },
      ],
      classQuest: true,
    });
  });

  it('shows the classes in the order of their start', async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user, { courseName: '운영체제', startTime: '13:00', endTime: '14:15' });
    await addTuesdayClass(user, { courseName: '컴파일러', weekdays: ['monday', 'tuesday'] });
    setClock(TUESDAY_MORNING);

    expect(await classQuestTitles(user)).toEqual(['컴파일러', '운영체제']);
  });
});

describe("A Class Quest's Sub Quest", () => {
  it("labels the place with the Place's name alone when the class has no room", async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user, { room: null });
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toMatchObject([
      { subQuests: [{ place: { placeId: place.id, label: place.name } }] },
    ]);
  });

  it("takes today's weekday and the class's times in Asia/Seoul", async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user);
    // Still Monday in UTC.
    setClock('2026-10-05T23:30:00.000Z');

    expect((await getQuests(app, user)).body).toMatchObject([
      { subQuests: [{ startsAt: '2026-10-06T00:30:00.000Z', endsAt: '2026-10-06T01:45:00.000Z' }] },
    ]);
  });
});

describe('A class on another weekday', () => {
  it('has no Class Quest', async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user, { weekdays: ['monday', 'wednesday'] });
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toEqual([]);
  });
});

describe('A class of several weekdays', () => {
  it.each([
    ['Monday', '2026-10-05T00:00:00.000Z', '2026-10-05T00:30:00.000Z'],
    ['Wednesday', '2026-10-07T00:00:00.000Z', '2026-10-07T00:30:00.000Z'],
    ['Friday', '2026-10-09T00:00:00.000Z', '2026-10-09T00:30:00.000Z'],
  ])('has a Class Quest on %s, one of its days', async (_, now, startsAt) => {
    const user = await signInUser(app);
    await addTuesdayClass(user, { weekdays: ['monday', 'wednesday', 'friday'] });
    setClock(now);

    expect((await getQuests(app, user)).body).toMatchObject([{ subQuests: [{ startsAt }] }]);
  });

  it('has none on a day that is not one of its days', async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user, { weekdays: ['monday', 'wednesday', 'friday'] });
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toEqual([]);
  });
});

describe("The semester's days", () => {
  it.each([
    ['before the first day', { semesterFirstDay: '2026-10-07' }, 0],
    ['after the last day', { semesterLastDay: '2026-10-05' }, 0],
    ['on the first day', { semesterFirstDay: '2026-10-06' }, 1],
    ['on the last day', { semesterLastDay: '2026-10-06' }, 1],
    ['between the two', { semesterFirstDay: '2026-09-01', semesterLastDay: '2026-12-18' }, 1],
  ])('leave %s with the Class Quests it has', async (_, days, count) => {
    const user = await signInUser(app);
    await addTuesdayClass(user);
    expect((await patchTimetable(app, user.accessToken, days)).status).toBe(200);
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toHaveLength(count);
  });
});

describe('A class that is over', () => {
  it('ends its Class Quest by time and leaves it out of the list', async () => {
    const user = await signInUser(app);
    await addTuesdayClass(user);

    setClock('2026-10-06T01:44:59.999Z');
    const before = await getQuests(app, user);
    setClock('2026-10-06T01:45:00.000Z');
    const after = await getQuests(app, user);

    expect(before.body).toMatchObject([{ subQuests: [{ completion: 'by_time', ended: false }] }]);
    expect(after.body).toEqual([]);
  });
});

describe('A change to the timetable', () => {
  it('shows in the next read of the list', async () => {
    const user = await signInUser(app);
    const added = await addTuesdayClass(user);
    setClock(TUESDAY_MORNING);
    const before = await classQuestTitles(user);

    await putClass(app, user.accessToken, added.id, aClass(place.id, { courseName: '알고리즘' }));
    const edited = await classQuestTitles(user);
    await deleteClass(app, user.accessToken, added.id);
    const deleted = await classQuestTitles(user);

    expect([before, edited, deleted]).toEqual([['데이터베이스'], ['알고리즘'], []]);
  });
});

describe('A Class Quest', () => {
  it('cannot be dropped', async () => {
    const user = await signInUser(app);
    const added = await addTuesdayClass(user);
    setClock(TUESDAY_MORNING);

    const response = await dropQuest(app, user, added.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'CLASS_QUEST'));
    expect(await classQuestTitles(user)).toEqual(['데이터베이스']);
  });

  it('cannot be given a Sub Quest', async () => {
    const user = await signInUser(app);
    const added = await addTuesdayClass(user);
    setClock(TUESDAY_MORNING);

    const response = await addSubQuest(app, user, added.id, { title: '카페' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'CLASS_QUEST'));
    expect((await getQuests(app, user)).body).toMatchObject([{ subQuests: [{ title: '데이터베이스' }] }]);
  });

  it('is an unknown Quest to another User', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const added = await addTuesdayClass(user);

    const response = await dropQuest(app, other, added.id);

    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('stores nothing', async () => {
    const user = await signInUser(app);
    const added = await addTuesdayClass(user);
    setClock(TUESDAY_MORNING);

    await getQuests(app, user);

    expect(await prisma.quest.count({ where: { id: added.id } })).toBe(0);
    expect(await prisma.questHolder.count({ where: { userId: user.id } })).toBe(0);
  });
});
