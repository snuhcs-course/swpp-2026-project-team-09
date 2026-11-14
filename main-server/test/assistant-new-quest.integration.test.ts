/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { RECRUITING_RULES } from '../src/assistant/recruiting/recruiting-tools.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { readExample, travel } from './events-example.js';
import { COURSE, MealPlanStage, type Named, ROOM } from './meal-plan.js';
import { answerIn, EVENTS_APP, recalculate, replySchema, texts, toolNames } from './plan-answers.js';
import { connectToDatabase } from './quests.js';
import { activityParty, badmintonParties, jobFairOn, partyFor, stranger, timeOn } from './recruiting-parties.js';
import { type Step } from './scripted-model.js';

// A new recruiting Quest planned on the map, at the Assistant's endpoint with the scripted model, the seed's walking
// table with the design's shuttle, and Places: the design's row 4 (a Friday at 13:50, the job fair, 지은 offered and
// then added), row 5 (a Thursday at 16:45, badminton where the parties meet, 서준 put in first and then removed), the
// rule board (a time and a Place said), what the model is given, and what is asked when the Place or the time is
// missing. Each test works on a Thursday or a Friday of April 2089 that no other file uses.

// The parties are made by their Users through the routes, which takes several seconds on a busy machine.
vi.setConfig({ testTimeout: 60_000 });

const stage = new MealPlanStage(travel);
let prisma: PrismaClient;
const events: string[] = [];

beforeAll(async () => {
  await readExample();
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.quest.deleteMany({ where: { globalEventId: { in: events } } });
  await prisma.globalEvent.deleteMany({ where: { id: { in: events } } });
  await prisma.$disconnect();
  await stage.stop();
});

const planNewQuest = (input: object): Step => ({ tool: 'planNewQuest', input });

const searchBadminton = (date: string): Step => ({
  tool: 'searchRecruitingQuests',
  input: { from: date, to: date, words: ['배드민턴'] },
});

const answerOf = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

// Row 4: the asker with Classes in 24동 until 13:50 and in 301동 from 15:30; 민수, in the job fair's 14:20 party, and
// 지은, with a Class in 38동 until 13:50.
async function rowFour(date: string): Promise<{ jobFair: string; jieun: Named }> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const minsu = await stage.friend('민수');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '13:00', '13:50', '38', 'friday');
  const jobFair = await jobFairOn(stage, prisma, date);
  events.push(jobFair.id);
  const leader = await stranger(stage, '하나');
  await partyFor(stage, jobFair, { leader, title: '같이 가요', meets: [date, '14:20', '73'], joiners: [minsu] });
  return { jobFair: jobFair.id, jieun };
}

// Row 5: the asker with a Class in 301동 until 16:45, 서준 with one in 24동 until 16:45, and the badminton parties at
// the gymnasium.
async function rowFive(date: string): Promise<{ seojun: Named; parties: string[] }> {
  await stage.asking(date, '16:45');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'thursday');
  const seojun = await stage.friend('서준');
  await stage.classAt(seojun, '15:30', '16:45', '24', 'thursday');
  const { at17, at18 } = await badmintonParties(stage, date);
  return { seojun, parties: [at17, at18] };
}

describe('Row 4: a new party for the job fair', () => {
  it('meets at 14:00 alone, offers 지은 and not 민수, and with 지은 added meets at 14:10', async () => {
    const date = '2089-04-08';
    const time = timeOn(date);
    const { jobFair, jieun } = await rowFour(date);
    const response = await stage.send(
      [planNewQuest({ date, globalEventId: jobFair, board: 'career' }), { text: '14:00 문화관에서 만나요.' }],
      EVENTS_APP,
      '새로 모집',
    );

    const alone = answerIn(response.body);
    expect(alone.input).toEqual({
      kind: 'new-quest',
      date,
      globalEventId: jobFair,
      title: null,
      placeId: null,
      time: null,
      people: [{ userId: stage.asker.id, constraints: [] }],
      board: 'career',
    });
    expect(alone.plans[0]).toMatchObject({
      title: '채용박람회',
      startAt: time('14:00'),
      endAt: time('15:12'),
      subQuests: [{ at: time('14:00'), title: '15:12까지 채용박람회 · 301동으로 나서기' }],
      candidates: [{ userId: jieun.id, name: '지은', line: '지은 · 13:50 38동 수업 끝' }],
    });
    expect(texts(alone)).toEqual([['14:00 문화관 · 4명 공개 모집', '13:54에 도착해서 14:00에 모여요']]);

    const people = [
      { userId: stage.asker.id, constraints: [] },
      { userId: jieun.id, constraints: [] },
    ];
    const withJieun = await recalculate(stage, { ...alone.input, people });
    expect(answerOf(withJieun.body).plans[0]).toMatchObject({
      startAt: time('14:10'),
      togetherMinutes: 62,
      parts: [{ leaveAt: time('14:06') }, { userId: jieun.id, leaveAt: time('13:59'), walkMinutes: 11 }],
      subQuests: [
        { at: time('14:10'), title: '유상, 지은: 문화관 앞에서 만나기' },
        { at: time('14:10'), title: '15:12까지 채용박람회 · 301동으로 나서기' },
      ],
      candidates: [],
    });
  });
});

describe('Row 5: a new badminton party', () => {
  it('meets at 17:10 where the parties meet, with 서준 put in first, and without him offers him', async () => {
    const date = '2089-04-07';
    const time = timeOn(date);
    const { seojun, parties } = await rowFive(date);
    const gym = await stage.numbered('71');

    const response = await stage.send(
      [searchBadminton(date), planNewQuest({ date, title: '배드민턴', questIds: parties }), { text: '…' }],
      EVENTS_APP,
      '새로 모집',
    );

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({
      kind: 'new-quest',
      globalEventId: null,
      title: '배드민턴',
      placeId: gym.id,
      time: null,
      people: [{ userId: stage.asker.id }, { userId: seojun.id }],
    });
    expect(answer.plans[0]).toMatchObject({
      startAt: time('17:10'),
      parts: [
        { leaveAt: time('16:53'), walkMinutes: 17, mode: 'shuttle' },
        { userId: seojun.id, leaveAt: time('16:56'), walkMinutes: 14 },
      ],
      subQuests: [
        { at: time('17:10'), placeId: gym.id, title: '유상, 서준: 체육관 앞에서 만나기' },
        { at: time('17:10'), placeId: gym.id, title: '배드민턴' },
      ],
      candidates: [],
    });
    expect(texts(answer)).toEqual([['17:10 체육관 · 4명 공개 모집', '17:02에 도착해서 17:10에 모여요']]);

    const alone = await recalculate(stage, { ...answer.input, people: [{ userId: stage.asker.id, constraints: [] }] });

    expect(answerOf(alone.body).plans[0]).toMatchObject({
      startAt: time('17:10'),
      candidates: [{ userId: seojun.id, line: '서준 · 16:45 24동 수업 끝' }],
    });
  });
});

describe('Recruiting parties that meet at different Places', () => {
  it('ask for the Place, and nothing is planned', async () => {
    const date = '2089-04-21';
    const { parties } = await rowFive(date);
    const elsewhere = await activityParty(stage, {
      leader: await stranger(stage, '아홉'),
      title: '배드민턴 칠 사람',
      meets: [date, '18:30', '301'],
    });

    const response = await stage.send(
      [
        searchBadminton(date),
        planNewQuest({ date, title: '배드민턴', questIds: [...parties, elsewhere] }),
        { text: '…' },
      ],
      EVENTS_APP,
      '새로 모집',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'needs-place' });
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});

describe('What the model is given', () => {
  it('is the plan in words and minutes, with no coordinates, course names, or rooms', async () => {
    const date = '2089-04-21';
    const { parties } = await rowFive(date);

    const response = await stage.send(
      [searchBadminton(date), planNewQuest({ date, title: '배드민턴', questIds: parties }), { text: '…' }],
      EVENTS_APP,
      '새로 모집',
    );

    const given = stage.model.toolResults()[1];
    expect(given).toEqual({
      result: 'planned',
      plan: {
        title: '배드민턴',
        place: '체육관',
        start: '17:10',
        stayMinutes: 30,
        people: [
          { name: null, me: true, setOut: '16:53', minutes: 17, by: 'shuttle' },
          { name: '서준', me: false, setOut: '16:56', minutes: 14, by: 'walk' },
        ],
        capacity: 4,
        couldCome: [],
      },
    });
    expect(JSON.stringify(given)).not.toContain('latitude');
    for (const text of [JSON.stringify(given), JSON.stringify(response.body)]) {
      expect(text).not.toContain(COURSE);
      expect(text).not.toContain(ROOM);
    }
  });
});

describe('The rule board: "저녁 7시 301동 근처 탁구"', () => {
  it('is planned at 19:00 at 301동, as said', async () => {
    const date = '2089-04-22';
    await stage.asking(date, '16:45');
    const place = await stage.numbered('301');

    const response = await stage.send(
      [
        { tool: 'resolvePlace', input: { words: '301동' } },
        planNewQuest({ date, title: '탁구', placeId: place.id, time: '19:00' }),
        { text: '…' },
      ],
      EVENTS_APP,
      '저녁 7시 301동 근처 탁구',
    );

    const answer = answerIn(response.body);
    expect(answer.plans[0]).toMatchObject({
      title: '탁구',
      place: { placeId: place.id },
      startAt: timeOn(date)('19:00'),
    });
    expect(answer.input).toMatchObject({ placeId: place.id, time: '19:00' });
  });

  it('on another day without a time asks when', async () => {
    await stage.asking('2089-04-21', '16:45');
    const place = await stage.numbered('301');

    await stage.send(
      [
        { tool: 'resolvePlace', input: { words: '301동' } },
        planNewQuest({ date: '2089-04-22', title: '탁구', placeId: place.id }),
        { text: '…' },
      ],
      EVENTS_APP,
      '내일 301동 근처 탁구',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'needs-time' });
  });
});

describe('The input', () => {
  it.each([
    ['a person who is no Friend of the asker', 'stranger'],
    ['neither a Global Event nor a Place', 'nowhere'],
  ])('is refused with 400 when it names %s', async (_, which) => {
    await stage.asking('2089-04-21', '16:45');
    const other = await stranger(stage, '남');
    const gym = await stage.numbered('71');

    const people = [stage.asker.id, ...(which === 'stranger' ? [other.id] : [])];
    const response = await recalculate(stage, {
      kind: 'new-quest',
      date: '2089-04-21',
      globalEventId: null,
      title: '배드민턴',
      placeId: which === 'nowhere' ? null : gym.id,
      time: null,
      people: people.map((userId) => ({ userId, constraints: [] })),
    });

    expect(response.status).toBe(400);
  });
});

describe('An app that does not draw events', () => {
  it('is offered no planNewQuest, and one that does is offered it with the rules', async () => {
    await stage.asking('2089-04-21', '16:45');

    await stage.send([{ text: '네' }], { clientCapabilities: ['library', 'answer'] }, '새로 모집');

    expect(toolNames(stage)).not.toContain('planNewQuest');
    expect(stage.model.system()).not.toContain(RECRUITING_RULES);

    await stage.send([{ text: '네' }], EVENTS_APP, '새로 모집');

    expect(toolNames(stage)).toContain('planNewQuest');
    expect(stage.model.system()).toContain(RECRUITING_RULES);
  });
});
