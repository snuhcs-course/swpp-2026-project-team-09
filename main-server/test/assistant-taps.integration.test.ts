/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type CardFact, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { REDIS } from '../src/common/redis.module.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser } from './friends.js';
import { expectStatus, keptButHidden, keptPositionIn, shareAt, uploadPosition } from './location-sharing.js';
import { MealPlanStage, type Named, type Place } from './meal-plan.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { withAccessToken } from './sign-in.js';

// A press on a building or a Friend's face (wireframe row 6), at POST /assistant/taps over the started server with the
// scripted model, the seed's walking table, and Places: the cards of 63동 (board a1), 302동 with a Friend in it (a14),
// and 73동 with its events (a2), a Friend at the exact level, at the building, and at the Timetable only (a13, a4, a10),
// the refusals, and that no model is asked and nothing is counted. Each test works on a day of 2078 of its own.

const stage = new MealPlanStage();
let prisma: PrismaClient;
const stored: string[] = [];

beforeAll(async () => {
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.globalEvent.deleteMany({ where: { id: { in: stored } } });
  await prisma.$disconnect();
  await stage.stop();
});

const lookupIn = (body: unknown): Lookup => z.custom<Lookup>().parse(body);

const at = ({ latitude, longitude }: Place): { latitude: number; longitude: number } => ({ latitude, longitude });

function tap(body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/taps'), stage.asker.accessToken).send(
    body,
  );
}

const plain = (icon: CardFact['icon'], text: string, userId: string | null = null): CardFact => ({
  icon,
  text,
  strong: false,
  userId,
});

const strong = (icon: CardFact['icon'], text: string): CardFact => ({ icon, text, strong: true, userId: null });

// The asker at 12:10 after a Class in 301동 until 11:50, with the next at 13:00 in 24동, standing in 301동.
async function tuesdayAt301(date: string): Promise<{ latitude: number; longitude: number }> {
  await stage.asking(date, '12:10');
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  return at(await stage.numbered('301'));
}

// 김민수, the asker's Friend, in his Class in 302동 until 12:15.
async function minsuAt(date: string): Promise<{ minsu: Named; location: { latitude: number; longitude: number } }> {
  const location = await tuesdayAt301(date);
  const minsu = await stage.friend('김민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  return { minsu, location };
}

describe('63동 pressed at lunch (board a1)', () => {
  it('is the walk, the stay, the menu, and the suggestion, with 여기서 먹기 and the way', async () => {
    const date = '2078-01-04';
    const location = await tuesdayAt301(date);
    await stage.menusOn(date, ['학생회관식당']);
    const studentCenter = await stage.numbered('63');
    stage.model.script();

    const response = await tap({ tapped: { kind: 'place', placeId: studentCenter.id }, location });

    expect(response.status).toBe(200);
    const lookup = lookupIn(response.body);
    expect(lookup.card).toEqual({
      title: '63동',
      subtitle: '학생회관',
      facts: [
        strong('route', '걸어서 15분 · 12:25 도착'),
        plain('clock', '13:00 수업 전까지 34분 머물 수 있어요'),
        plain('meal', '학생회관식당 · 오늘 제육볶음'),
      ],
      note: '점심시간이에요. 여기서 드실래요?',
    });
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지']);
    const point = { placeId: studentCenter.id, label: '63동', ...at(studentCenter) };
    expect(lookup.actions).toEqual([
      {
        kind: 'plan',
        label: '여기서 먹기',
        input: {
          kind: 'meal',
          date,
          meal: 'lunch',
          people: [{ userId: stage.asker.id, constraints: [] }],
          window: { from: null, until: null },
          placeId: studentCenter.id,
        },
      },
      { kind: 'guide', to: point },
    ]);
    expect(lookup.scene.places).toEqual([{ place: point, role: 'pick', tag: null }]);
    expect(stage.model.received()).toEqual([]);
  });
});

describe('302동 pressed (board a14)', () => {
  it('names a Friend the asker sees at the building in it, in a line', async () => {
    const { minsu, location } = await minsuAt('2078-01-11');
    await shareAt(stage.app, stage.asker, minsu, 'building');
    const place302 = await stage.numbered('302');
    await expectStatus(uploadPosition(stage.app, minsu, at(place302)), 200);

    const response = await tap({ tapped: { kind: 'place', placeId: place302.id }, location });

    const lookup = lookupIn(response.body);
    expect(lookup.card?.facts).toEqual([
      strong('route', '걸어서 3분 · 12:13 도착'),
      plain('clock', '13:00 수업 전까지 30분 머물 수 있어요'),
      plain('user', '김민수가 여기 있어요 · 수업 중 12:15까지', minsu.id),
    ]);
    expect(lookup.scene.people).toMatchObject([{ userId: minsu.id, source: 'building' }]);
  });
});

describe('73동 pressed on a Friday (board a2)', () => {
  it('is its two events, with 행사 보기 and 같이 갈 파티', async () => {
    const date = '2078-01-07';
    await stage.asking(date, '13:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
    await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
    const culture = await stage.numbered('73');
    const eventAt = async (title: string, start: string, end: string): Promise<string> => {
      const startsAt = new Date(`${date}T${start}:00+09:00`);
      const endsAt = new Date(`${date}T${end}:00+09:00`);
      const event = await storeEvent(prisma, { title, startsAt, endsAt, place: '문화관', ...at(culture) });
      stored.push(event.id);
      return event.id;
    };
    const jobFair = await eventAt('채용박람회', '10:00', '17:00');
    const session = await eventAt('기업 설명회', '16:00', '17:00');

    const response = await tap({ tapped: { kind: 'place', placeId: culture.id }, location: null });

    const lookup = lookupIn(response.body);
    expect(lookup.card?.facts).toEqual([
      strong('route', '걸어서 4분 · 13:54 도착'),
      plain('clock', '15:30 수업 전까지 78분 머물 수 있어요'),
      plain('flag', '채용박람회 · 17:00까지 열려요'),
      plain('flag', '기업 설명회 · 16:00–17:00'),
    ]);
    expect(lookup.actions.slice(0, 2)).toEqual([
      { kind: 'plan', label: '행사 보기', input: { kind: 'events', date, eventIds: [jobFair, session] } },
      { kind: 'plan', label: '같이 갈 파티', input: { kind: 'quests', globalEventId: jobFair, questIds: null } },
    ]);
  });
});

describe('8동 pressed while a Friend whose position is kept there shows the asker his Timetable only', () => {
  // 8동's own point, which the card draws as the pick, has the kept position's first five decimals; the kept position
  // has more.
  it('names him nowhere, draws nobody, and holds nothing of his kept position', async () => {
    const location = await tuesdayAt301('2078-02-22');
    const minsu = await stage.friend('김민수');
    await keptButHidden(stage.app, stage.asker, minsu);
    const place8 = await stage.numbered('8');

    const response = await tap({ tapped: { kind: 'place', placeId: place8.id }, location });

    expect(response.status).toBe(200);
    const lookup = lookupIn(response.body);
    expect(lookup.card?.facts.filter(({ icon }) => icon === 'user')).toEqual([]);
    expect(lookup.scene.people).toEqual([]);
    const text = JSON.stringify(response.body);
    expect(['김민수', '37.4601612345', '126.9539812345'].filter((words) => text.includes(words))).toEqual([]);
  });
});

describe("A pressed Friend's face, at each level of the Friend view", () => {
  it.each([
    ['exact', '정확한 위치까지 보여요', '2078-01-18'],
    ['building', '지금 있는 건물까지 보여요', '2078-01-25'],
  ] as const)(
    'is his full name, his Class, 302동, and the walk at the %s level (boards a13, a4)',
    async (level, words, date) => {
      const { minsu, location } = await minsuAt(date);
      await shareAt(stage.app, stage.asker, minsu, level);
      await expectStatus(uploadPosition(stage.app, minsu, at(await stage.numbered('302'))), 200);

      const response = await tap({ tapped: { kind: 'friend', userId: minsu.id }, location });

      expect(response.status).toBe(200);
      const lookup = lookupIn(response.body);
      expect(lookup.kind).toBe('friend');
      expect(lookup.card).toEqual({
        title: '김민수',
        subtitle: words,
        facts: [strong('clock', '수업 중 · 12:15까지'), plain('pin', '302동'), plain('route', '나에게서 걸어서 3분')],
        note: null,
      });
      expect(lookup.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
    },
  );

  it('is his Class by the Timetable at the Timetable only, and nothing of his kept position (board a10)', async () => {
    const { minsu, location } = await minsuAt('2078-02-01');
    await keptButHidden(stage.app, stage.asker, minsu);

    const response = await tap({ tapped: { kind: 'friend', userId: minsu.id }, location });

    const lookup = lookupIn(response.body);
    expect(lookup.card).toEqual({
      title: '김민수',
      subtitle: '시간표만 보여요',
      facts: [strong('clock', '시간표로는 12:15까지 302동 수업이에요'), plain('lock', '지금 위치는 보여 주지 않아요')],
      note: null,
    });
    expect(keptPositionIn(response.body)).toEqual([]);
  });
});

describe('Refused', () => {
  beforeAll(() => stage.asking('2078-02-08', '12:10'));

  it.each([
    ['an id that is no Place', (): object => ({ tapped: { kind: 'place', placeId: randomUUID() }, location: null })],
    ['a Place id that is no UUID', (): object => ({ tapped: { kind: 'place', placeId: '63' }, location: null })],
    ['a body without what was pressed', (): object => ({ location: null })],
  ])('with 400 for %s', async (_, body) => {
    const response = await tap(body());

    expect(response.status).toBe(400);
  });

  it('with 404 for a User who is not a Friend of the asker', async () => {
    const stranger = await signInUser(stage.app);

    const response = await tap({ tapped: { kind: 'friend', userId: stranger.id }, location: null });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'FRIEND_NOT_FOUND' });
  });
});

describe("The User's daily messages", () => {
  it('are not counted, and a User past the limit still gets the card', async () => {
    const date = '2078-02-15';
    const location = await tuesdayAt301(date);
    const redis = stage.app.get<Redis>(REDIS);
    const key = `assistant:messages:${stage.asker.id}:${date}`;
    await redis.set(key, '1000');
    const place302 = await stage.numbered('302');
    stage.model.script();

    const response = await tap({ tapped: { kind: 'place', placeId: place302.id }, location });

    expect(response.status).toBe(200);
    expect(await redis.get(key)).toBe('1000');
    expect(stage.model.received()).toEqual([]);
    await redis.del(key);
  });
});
