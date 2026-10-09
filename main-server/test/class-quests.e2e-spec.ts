// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by TaeHyun79 and fyoon46 in #43 #74
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase, getQuest, getQuests, questFor, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { aClass, addClass, aTime, deleteClass, replaceClass, twoPlaceIds } from './timetable.js';

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

const listedSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    classQuest: z.boolean(),
    subQuests: z.array(z.object({ id: z.string(), startsAt: z.string() })),
  }),
);

async function classQuestsOf(user: TestUser): Promise<z.infer<typeof listedSchema>> {
  const response = await getQuests(app, user);
  expect(response.status).toBe(200);
  return listedSchema.parse(response.body).filter(({ classQuest }) => classQuest);
}

describe('The Quest list on a day with a class', () => {
  it('shows a Class Quest for the class after the stored Quests', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const { questId } = await questFor(app, user, (await storeEvent(prisma, { endsAt: null })).id);
    const added = await addClass(app, user.accessToken, aClass(place.id));
    setClock(TUESDAY_MORNING);

    const response = await getQuests(app, user);

    expect(response.status).toBe(200);
    const [stored, classQuest] = z.array(z.unknown()).length(2).parse(response.body);
    expect(stored).toMatchObject({ id: questId, classQuest: false });
    const holder = { id: user.id, name: '김철수', department: '경영학과' };
    expect(classQuest).toEqual({
      id: added.id,
      title: '데이터베이스',
      globalEvent: null,
      leader: null,
      capacity: 1,
      joinPolicy: 'closed',
      board: null,
      description: '',
      createdAt: null,
      holders: [holder],
      subQuests: [
        {
          id: added.times[0]?.id,
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
      waitingJoinRequests: 0,
    });
  });
});

describe('The Class Quests of a day', () => {
  it('are in the order of their first start today', async () => {
    const user = await signInUser(app);
    await addClass(
      app,
      user.accessToken,
      aClass(place.id, { courseName: '운영체제', times: [aTime(null, { startTime: '13:00', endTime: '14:15' })] }),
    );
    await addClass(app, user.accessToken, aClass(place.id, { courseName: '컴파일러', times: [aTime(null)] }));
    setClock(TUESDAY_MORNING);

    expect((await classQuestsOf(user)).map(({ title }) => title)).toEqual(['컴파일러', '운영체제']);
  });

  it('gives a class with two times today one Class Quest with a Sub Quest for each, by start', async () => {
    const user = await signInUser(app);
    const added = await addClass(
      app,
      user.accessToken,
      aClass(place.id, {
        times: [aTime(null, { startTime: '15:00', endTime: '16:00' }), aTime(null, { weekday: 'monday' }), aTime(null)],
      }),
    );
    setClock(TUESDAY_MORNING);

    const tuesday = added.times.filter(({ weekday }) => weekday === 'tuesday');
    expect(await classQuestsOf(user)).toMatchObject([
      {
        id: added.id,
        subQuests: [
          { id: tuesday.find(({ startTime }) => startTime === '09:30')?.id, startsAt: '2026-10-06T00:30:00.000Z' },
          { id: tuesday.find(({ startTime }) => startTime === '15:00')?.id, startsAt: '2026-10-06T06:00:00.000Z' },
        ],
      },
    ]);
  });

  it("takes today's weekday and the class's times in Asia/Seoul", async () => {
    const user = await signInUser(app);
    await addClass(app, user.accessToken, aClass(place.id));
    // Still Monday in UTC.
    setClock('2026-10-05T23:30:00.000Z');

    expect(await classQuestsOf(user)).toMatchObject([{ subQuests: [{ startsAt: '2026-10-06T00:30:00.000Z' }] }]);
  });
});

describe('A class on other weekdays', () => {
  it('has no Class Quest today', async () => {
    const user = await signInUser(app);
    await addClass(app, user.accessToken, aClass(place.id, { times: [aTime(null, { weekday: 'wednesday' })] }));
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toEqual([]);
  });

  it('has its Class Quest on another of its weekdays, with that day', async () => {
    const user = await signInUser(app);
    await addClass(app, user.accessToken, aClass(place.id));
    // 09:00 in Asia/Seoul on Thursday 2026-10-08.
    setClock('2026-10-08T00:00:00.000Z');

    expect(await classQuestsOf(user)).toMatchObject([
      { title: '데이터베이스', subQuests: [{ startsAt: '2026-10-08T00:30:00.000Z' }] },
    ]);
  });
});

describe("A Class Quest's Sub Quest", () => {
  it.each([
    ['a Place and a room', '101호', ' 101호'],
    ['a Place only', null, ''],
  ])("with %s is at the Place, the room after the Place's name", async (_, room, labelEnd) => {
    const user = await signInUser(app);
    await addClass(app, user.accessToken, aClass(null, { times: [aTime(place.id, { room })] }));
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toMatchObject([
      {
        subQuests: [
          {
            place: {
              placeId: place.id,
              label: `${place.name}${labelEnd}`,
              latitude: place.latitude,
              longitude: place.longitude,
            },
          },
        ],
      },
    ]);
  });

  it('has no place for a time without a Place, whatever the room', async () => {
    const user = await signInUser(app);
    await addClass(app, user.accessToken, aClass(null, { times: [aTime(null, { room: '101호' })] }));
    setClock(TUESDAY_MORNING);

    expect((await getQuests(app, user)).body).toMatchObject([{ subQuests: [{ place: null }] }]);
  });
});

describe('A class that is over today', () => {
  it('ends its Sub Quests by time and leaves the Class Quest out of the list once all have ended', async () => {
    const user = await signInUser(app);
    const times = [aTime(null), aTime(null, { startTime: '11:00', endTime: '12:00' })];
    await addClass(app, user.accessToken, aClass(null, { times }));

    setClock('2026-10-06T01:45:00.000Z');
    const between: unknown = (await getQuests(app, user)).body;
    setClock('2026-10-06T03:00:00.000Z');
    const after: unknown = (await getQuests(app, user)).body;

    expect(between).toMatchObject([{ subQuests: [{ ended: true }, { completion: 'by_time', ended: false }] }]);
    expect(after).toEqual([]);
  });
});

describe('Reading a Class Quest by itself', () => {
  it('answers it as the list does on a day of its class, ended or not', async () => {
    const user = await signInUser(app);
    const added = await addClass(app, user.accessToken, aClass(place.id));
    setClock(TUESDAY_MORNING);
    const [listed] = z.array(z.unknown()).parse((await getQuests(app, user)).body);

    const today = await getQuest(app, user, added.id);
    setClock('2026-10-06T12:00:00.000Z');
    const ended = await getQuest(app, user, added.id);

    expect(today.status).toBe(200);
    expect(today.body).toEqual(listed);
    expect(ended.body).toMatchObject({ id: added.id, classQuest: true, subQuests: [{ ended: true }] });
  });

  it('answers it as an unknown Quest on a day without its class', async () => {
    const user = await signInUser(app);
    const added = await addClass(app, user.accessToken, aClass(place.id));
    setClock('2026-10-07T00:00:00.000Z');

    const response = await getQuest(app, user, added.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});

describe('A change to the timetable', () => {
  it('shows in the next read of the list', async () => {
    const user = await signInUser(app);
    const added = await addClass(app, user.accessToken, aClass(place.id));
    setClock(TUESDAY_MORNING);
    const titles = async (): Promise<string[]> => (await classQuestsOf(user)).map(({ title }) => title);
    const before = await titles();

    await replaceClass(app, user.accessToken, added.id, aClass(place.id, { courseName: '알고리즘' }));
    const replaced = await titles();
    await deleteClass(app, user.accessToken, added.id);
    const deleted = await titles();

    expect([before, replaced, deleted]).toEqual([['데이터베이스'], ['알고리즘'], []]);
  });
});

describe('Reading Class Quests', () => {
  it('stores nothing', async () => {
    const user = await signInUser(app);
    const added = await addClass(app, user.accessToken, aClass(place.id));
    setClock(TUESDAY_MORNING);

    await getQuests(app, user);
    await getQuest(app, user, added.id);

    expect(await prisma.quest.count({ where: { id: added.id } })).toBe(0);
    expect(await prisma.questHolder.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.subQuest.count({ where: { id: { in: added.times.map(({ id }) => id) } } })).toBe(0);
  });
});
