/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedHe } from '../src/he/he.seed.js';
import { loadSeed } from '../src/load-seed.js';
import { createDatabase } from './containers.js';
import { ACCOUNTS, ADMISSION_YEAR, HeStage } from './he-seed.js';

// The HE seed's accounts, friendships and Timetables as the evaluators' apps read them, a second run, and a run
// without what the seed needs. The recruiting Quests and Free Time have files of their own.

const stage = new HeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

interface Days {
  wednesday: string[];
  thursday: string[];
  friday: string[];
}

// The spec's Timetables (The Timetables), each meeting as `start–end course (Place)`, a start alone worked out to 75
// minutes.
const TIMETABLES: Record<string, Days> = {
  김하늘: {
    wednesday: ['11:00–12:15 알고리즘 (302)', '16:00–16:50 공학수학2 (301)'],
    thursday: ['09:30–10:45 자료구조 (301)', '14:00–15:15 운영체제 (302)'],
    friday: ['16:00–16:50 공학수학2 (301)'],
  },
  최유나: {
    wednesday: ['11:00–12:15 심리학개론 (16)'],
    thursday: ['12:30–13:45 사회심리학 (16)', '15:30–16:45 심리통계 (83)'],
    friday: ['10:00–11:50 심리학실험 (16)'],
  },
  한지우: {
    wednesday: ['14:00–15:15 확률모형 (43-1)', '17:00–18:15 생산관리 (43-1)'],
    thursday: ['11:00–12:15 경영과학 (301)', '15:30–16:45 공학경제 (43-1)'],
    friday: ['13:00–13:50 산업공학세미나 (43)'],
  },
  정민재: {
    wednesday: ['12:30–13:45 미시경제이론 (16)'],
    thursday: ['09:30–10:45 거시경제이론 (16)', '14:00–15:15 경제수학 (83)'],
    friday: ['11:00–12:15 경제사 (16)'],
  },
  이도현: {
    wednesday: ['11:00–12:15 회계원리 (58)', '15:30–16:45 마케팅관리 (58)'],
    thursday: ['12:30–13:45 조직행동론 (59)'],
    friday: [],
  },
  박서진: {
    wednesday: ['09:30–10:45 열역학 (301)', '17:00–19:50 기계공학실험 (301)'],
    thursday: ['11:00–12:15 유체역학 (301)', '12:30–13:45 동역학 (302)'],
    friday: ['09:00–09:50 공학수학1 (43-1)'],
  },
  오세린: {
    wednesday: ['09:30–10:45 생물학 (24)', '11:00–12:15 화학 (26)'],
    thursday: ['14:00–16:50 생물학실험 (24)'],
    friday: ['10:00–10:50 대학글쓰기 (1)'],
  },
};

const lobbySchema = z.object({
  profile: z.object({
    name: z.string(),
    department: z.string(),
    admissionYear: z.number().nullable(),
    friendId: z.string(),
  }),
  masterSwitch: z.boolean(),
});

const friendsSchema = z.array(z.object({ name: z.string(), department: z.string(), sharing: z.boolean() }));

// What the app reads when it starts.
async function lobbyOf(name: string): Promise<z.infer<typeof lobbySchema>> {
  const response = await stage.post('/lobby', name);
  expect(response.status).toBe(200);
  return lobbySchema.parse(response.body);
}

describe('The HE accounts', () => {
  it.each(ACCOUNTS)('starts $name at Onboarding with the name and department suggested', ({ name, department }) => {
    expect(stage.signedIn.get(name)?.onboarding).toStrictEqual({ completed: false, suggestion: { name, department } });
  });

  it.each(ACCOUNTS)('gives $name the Friend ID $friendId and the Master Switch off', async ({ name, friendId }) => {
    expect(await lobbyOf(name)).toMatchObject({ profile: { friendId }, masterSwitch: false });
  });
});

describe('The friendships', () => {
  it.each(ACCOUNTS)('lists $friends as the Friends of $name, sharing at both ends', async ({ name, friends }) => {
    const listed = friendsSchema.parse(await stage.bodyOf('/friends', name));

    expect(listed.map((friend) => friend.name)).toStrictEqual(friends);
    for (const friend of listed) {
      expect(friend).toMatchObject({ department: ACCOUNTS.find((each) => each.name === friend.name)?.department });
    }
    expect(listed.every(({ sharing }) => sharing)).toBe(true);
  });

  it.each(ACCOUNTS)('gives $name no Friend Request, Quest invitation or Party', async ({ name }) => {
    expect(await stage.bodyOf('/friend-requests', name)).toStrictEqual({ received: [], sent: [] });
    expect(await stage.bodyOf('/quest-invitations', name)).toStrictEqual([]);
    expect((await stage.get('/parties/mine', name)).status).toBe(404);
  });
});

const classesSchema = z.array(
  z.object({
    courseName: z.string(),
    times: z.array(
      z.object({
        weekday: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        placeId: z.string().nullable(),
        room: z.string().nullable(),
      }),
    ),
  }),
);

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// The account's week as the Timetable lists it, each day's meetings in their order, with the rooms apart.
async function weekOf(name: string): Promise<{ days: Record<string, string[]>; rooms: (string | null)[] }> {
  const numbers = await stage.placeNumbers();
  const classes = classesSchema.parse(await stage.bodyOf('/timetable/classes', name));
  const times = classes.flatMap(({ courseName, times: meetings }) => meetings.map((time) => ({ courseName, time })));
  const days = Object.fromEntries(
    WEEK.map((weekday) => [
      weekday,
      times
        .filter(({ time }) => time.weekday === weekday)
        .toSorted((a, b) => a.time.startTime.localeCompare(b.time.startTime))
        .map(
          ({ courseName, time }) =>
            `${time.startTime}–${time.endTime} ${courseName} (${numbers.get(time.placeId ?? '') ?? 'none'})`,
        ),
    ]),
  );
  return { days, rooms: times.map(({ time }) => time.room) };
}

describe('The Timetables', () => {
  it.each(ACCOUNTS)("gives $name the spec's week, Monday as Wednesday and Tuesday as Thursday", async ({ name }) => {
    const { wednesday, thursday, friday } = TIMETABLES[name] ?? { wednesday: [], thursday: [], friday: [] };

    const { days, rooms } = await weekOf(name);

    expect(days).toStrictEqual({
      monday: wednesday,
      tuesday: thursday,
      wednesday,
      thursday,
      friday,
      saturday: [],
      sunday: [],
    });
    expect(rooms.every((room) => room === null)).toBe(true);
  });
});

// What each account's app reads of its own: the profile, the Friends, the Timetable and the Quests it holds. A route
// past Onboarding answers only an onboarded account.
function everythingRead(): Promise<unknown[][]> {
  return Promise.all(
    ACCOUNTS.map(async ({ name }) => [
      await lobbyOf(name),
      ...(await Promise.all(['/friends', '/timetable/classes', '/quests'].map((path) => stage.bodyOf(path, name)))),
    ]),
  );
}

describe('A second run', () => {
  it('changes nothing, and every account keeps its Onboarding answers', async () => {
    const counts = await stage.rowCounts();
    const read = await everythingRead();

    await seedHe(stage.prisma);

    expect(await stage.rowCounts()).toStrictEqual(counts);
    expect(await everythingRead()).toStrictEqual(read);
    const profiles = await Promise.all(ACCOUNTS.map(async ({ name }) => (await lobbyOf(name)).profile));
    expect(profiles).toMatchObject(
      ACCOUNTS.map(({ name, department }) => ({ name, department, admissionYear: ADMISSION_YEAR })),
    );
  });
});

describe('Without what it needs', () => {
  let bare: PrismaClient;
  let dropBare: () => Promise<void>;

  beforeAll(async () => {
    ({ prisma: bare, drop: dropBare } = await createDatabase(inject('settings').DATABASE_URL));
  });

  afterAll(async () => {
    await dropBare();
  });

  it('stops, naming the campus Places and the demo band show, and writes nothing', async () => {
    await expect(seedHe(bare)).rejects.toThrow(
      /Places 1, 16, 24, 26, 43, 43-1, 58, 59, 62, 63, 71, 83, 109, 301, 302\b.*band-show/su,
    );
    await loadSeed(bare);
    await expect(seedHe(bare)).rejects.toThrow(/^(?!.*Places).*band-show/su);

    expect(await bare.user.count()).toBe(0);
  });
});
