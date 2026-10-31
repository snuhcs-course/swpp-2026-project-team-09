/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { postAssistantMessages } from './assistant.js';
import { FreeTimeStage, ROOM } from './free-time.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import { menusMessage, restaurant } from './menus.js';
import { addClass } from './timetable.js';
import { sendAsWorker } from './worker.js';

// What the world of the judgement suite does not reach, at the Assistant's endpoint with the scripted model: `needs`
// and the answers to it, a Restaurant card sent back in history, the card's Proposal and what never reaches the model.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const LUNCH = '제육볶음 : 6,000원';
const NOTE = '※ 운영시간 : 11:00~14:30';

function lunchLines(): object[] {
  return [
    { meal: 'lunch', text: LUNCH, kind: 'dish', name: '제육볶음', price: 6000 },
    { meal: 'lunch', text: NOTE, kind: 'note', name: null, price: null },
    { meal: 'dinner', text: '돈까스 : 5,500원', kind: 'dish', name: '돈까스', price: 5500 },
  ];
}

// 학생회관식당, at the Place the walking table calls `barely`, serves lunch that day.
async function menusOn(date: string): Promise<void> {
  const restaurants = [restaurant({ lines: lunchLines() })];
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
}

// A Friend of the User's with a Class on the Monday of the test, whom the steps find through resolveFriend.
async function friendWithClass(name: string, startTime: string, endTime: string, placeId: string): Promise<TestUser> {
  const friend = await signInUser(stage.app, { name, department: '경제학부' });
  await befriend(stage.app, stage.reader, friend);
  const times = [{ weekday: 'monday', startTime, endTime, placeId, room: ROOM }];
  await addClass(stage.app, friend.accessToken, { courseName: '국제경제학', times });
  return friend;
}

const resolve = (name: string): { tool: string; input: object } => ({ tool: 'resolveFriend', input: { name } });

const answerSchema = z.looseObject({
  result: z.string(),
  restaurants: z.array(z.looseObject({ key: z.string(), start: z.string() })).optional(),
});

function lastAnswer(): z.infer<typeof answerSchema> {
  return answerSchema.parse(stage.model.toolResults().at(-1));
}

const cardsSchema = z.object({
  cards: z.array(z.object({ kind: z.literal('restaurant'), restaurant: z.looseObject({ proposal: z.unknown() }) })),
});

describe('findMealRestaurants when the item before the User has no Place', () => {
  it('asks where the User leaves from, and judges from the Place passed after asking', async () => {
    const date = '2098-04-14';
    await stage.asking(date);
    await menusOn(date);
    await stage.classOn('monday', '10:00', '11:00', null);
    const { id } = await friendWithClass('이나래', '09:00', '10:00', stage.here.id);
    const input = { date, meal: 'lunch', friendIds: [id] };

    await stage.send(resolve('나래'), { tool: 'findMealRestaurants', input }, { text: '…' });

    expect(lastAnswer()).toMatchObject({ result: 'needs', needs: { side: 'before' } });

    await stage.send(
      resolve('나래'),
      { tool: 'resolvePlace', input: { words: '제1공학관' } },
      { tool: 'findMealRestaurants', input: { ...input, departurePlace: stage.here.id } },
      { text: '…' },
    );

    // 590 s on foot from `here` to 학생회관, as the shuttle is not 3 minutes faster, is 11:09:50, rounded up to 5 minutes.
    expect(lastAnswer()).toMatchObject({
      result: 'found',
      restaurants: [
        {
          key: '학생회관식당',
          start: `${date}T11:10:00+09:00`,
          people: [
            { name: '나', mode: 'walk', minutes: 10, longest: true },
            { mode: 'walk', minutes: 10, longest: true },
          ],
        },
      ],
    });
  });
});

describe('findMealRestaurants when the User comes from off campus', () => {
  it('leaves from the Place given at the time given', async () => {
    const date = '2098-06-16';
    await stage.asking(date);
    await menusOn(date);
    await stage.classOn('monday', '10:00', '11:00', null);
    const { id } = await friendWithClass('이보라', '09:00', '10:00', stage.here.id);
    const input = { date, meal: 'lunch', friendIds: [id], departurePlace: stage.here.id, departureTime: '12:00' };

    await stage.send(
      resolve('보라'),
      { tool: 'resolvePlace', input: { words: '제1공학관' } },
      { tool: 'findMealRestaurants', input },
      { text: '…' },
    );

    // 590 s on foot from 12:00 is 12:09:50, rounded up to 5 minutes.
    expect(lastAnswer()).toMatchObject({
      result: 'found',
      restaurants: [{ key: '학생회관식당', start: `${date}T12:10:00+09:00` }],
    });
  });
});

describe('findMealRestaurants when the item after the User has no Place', () => {
  it('asks by when the User must leave, and keeps to the leave-by time passed after asking', async () => {
    const day = '2098-04-21';
    await stage.asking(day);
    await menusOn(day);
    await stage.classOn('monday', '13:00', '14:40', null);
    const { id } = await friendWithClass('박아라', '09:00', '10:00', stage.here.id);
    const input = { date: day, meal: 'lunch', friendIds: [id] };

    await stage.send(resolve('아라'), { tool: 'findMealRestaurants', input }, { text: '…' });

    expect(lastAnswer()).toMatchObject({ result: 'needs', needs: { side: 'after' } });

    await stage.send(
      resolve('아라'),
      { tool: 'findMealRestaurants', input: { ...input, leaveBy: '11:30' } },
      { text: '…' },
    );

    expect(lastAnswer()).toMatchObject({ result: 'found', restaurants: [{ eatingMinutes: 20 }] });
  });
});

describe('findMealRestaurants with several shared intervals', () => {
  it('lets the first decide, whatever a later one touches', async () => {
    const date = '2098-06-16';
    await stage.asking(date);
    await menusOn(date);
    await stage.classOn('monday', '11:00', '11:10', stage.here.id);
    await stage.classOn('monday', '12:30', '12:40', stage.here.id);
    await stage.classOn('monday', '13:00', '13:10', null);
    const { id } = await friendWithClass('임하루', '09:00', '10:00', stage.barely.id);

    await stage.send(
      resolve('하루'),
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [id] } },
      { text: '…' },
    );

    // 11:10 + 590 s on foot, in the first interval, which leaves until 12:29 less the way back.
    expect(lastAnswer()).toMatchObject({
      result: 'found',
      restaurants: [{ key: '학생회관식당', start: `${date}T11:20:00+09:00` }],
    });
  });
});

describe("A Restaurant card's Proposal", () => {
  it('is the meal Quest, field by field, with no model call for it', async () => {
    const date = '2098-04-28';
    await stage.asking(date);
    await menusOn(date);
    await stage.classOn('monday', '11:00', '12:36', stage.here.id);
    const friend = await friendWithClass('최다온', '09:00', '10:00', stage.barely.id);
    const steps = [
      resolve('다온'),
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [friend.id] } },
      { tool: 'showRestaurants', input: { keys: ['학생회관식당'] } },
      { text: '…' },
    ];

    const response = await stage.send(...steps);

    expect(response.status).toBe(200);
    const { cards } = cardsSchema.parse(response.body);
    expect(cards).toEqual([
      {
        kind: 'restaurant',
        restaurant: {
          key: '학생회관식당',
          name: '학생회관식당',
          placeNumber: '63',
          date,
          meal: 'lunch',
          // 12:36 + 590 s on foot is 12:45:50, which starts at 12:50, and leaves until 14:30.
          eatingMinutes: 100,
          lines: [{ text: LUNCH, kind: 'dish', name: '제육볶음', price: 6000 }],
          people: [
            { name: '나', mode: 'walk', minutes: 10, longest: true },
            { name: '최다온', mode: 'walk', minutes: 0, longest: false },
          ],
          proposal: {
            title: '학생회관식당에서 점심',
            description: '',
            joinPolicy: 'closed',
            board: null,
            capacity: 2,
            startsAt: `${date}T12:50:00+09:00`,
            place: { id: stage.barely.id, name: '학생회관식당 (63동)' },
            globalEvent: null,
            invitees: [{ id: friend.id, name: '최다온' }],
          },
        },
      },
    ]);
  });
});

describe('A Restaurant card sent back in history', () => {
  it('is accepted by its key, and the model is told of it', async () => {
    const date = '2098-05-12';
    await stage.asking(date);
    stage.model.script({ text: '…' });

    const response = await postAssistantMessages(stage.app, stage.reader.accessToken, [
      { role: 'user', text: '오늘 점심 민수랑 밥' },
      {
        role: 'assistant',
        text: '이 식당들이 돼요.',
        cards: [{ kind: 'restaurant', id: '학생회관식당' }],
      },
      { role: 'user', text: '면 빼고' },
    ]);

    expect(response.status).toBe(200);
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain('restaurant 학생회관식당');
  });

  it("leaves a Quest card's id a UUID", async () => {
    const date = '2098-05-26';
    await stage.asking(date);
    stage.model.script({ text: '…' });

    const response = await postAssistantMessages(stage.app, stage.reader.accessToken, [
      { role: 'user', text: '…' },
      { role: 'assistant', text: '…', cards: [{ kind: 'quest', id: '학생회관식당' }] },
      { role: 'user', text: '…' },
    ]);

    expect(response.status).toBe(400);
  });
});

describe('What the meal tools send to the model', () => {
  it("holds no room, no Place of anyone and no Friend's Class, and no Friend who is not free", async () => {
    const date = '2098-06-02';
    await stage.asking(date);
    await menusOn(date);
    await stage.classOn('monday', '10:00', '11:00', stage.here.id);
    const free = await friendWithClass('정가온', '09:00', '10:00', stage.near.id);
    const busy = await friendWithClass('강바다', '11:00', '14:30', stage.near.id);

    await stage.send(
      { tool: 'findFreeFriends', input: { date, meal: 'lunch' } },
      resolve('가온'),
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [free.id] } },
      { text: '…' },
    );

    const sent = JSON.stringify(stage.model.toolResults());
    expect(sent).toContain('정가온');
    expect(sent).not.toContain('강바다');
    expect(sent).not.toContain(busy.id);
    for (const secret of [ROOM, '국제경제학', stage.here.id, stage.near.id, stage.here.name, stage.near.name]) {
      expect(sent).not.toContain(secret);
    }
  });

  it('accepts the Friends findFreeFriends returned, for this message only', async () => {
    const date = '2098-06-09';
    await stage.asking(date);
    await menusOn(date);
    const friend = await friendWithClass('오시온', '09:00', '10:00', stage.here.id);

    await stage.send(
      { tool: 'findFreeFriends', input: { date, meal: 'lunch' } },
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [friend.id] } },
      { text: '…' },
    );
    expect(lastAnswer().result).toBe('found');

    await stage.send(
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [friend.id] } },
      { text: '…' },
    );
    expect(stage.model.received().at(-1)?.prompt.at(-1)?.role).toBe('tool');
    expect(JSON.stringify(stage.model.received().at(-1)?.prompt.at(-1))).toContain('No tool returned these ids');
  });
});
