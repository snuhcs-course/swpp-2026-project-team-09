/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { PLAN_RULES } from '../src/assistant/gathering/plan-tools.js';
import { expectStatus, setFriendSharing, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { COURSE, MealPlanStage, type Named, planMeal, resolve, ROOM } from './meal-plan.js';

// A meal planned on the map, at the Assistant's endpoint with the scripted model, the seed's walking table, and Places:
// the design's worked example (a Tuesday at 11:50), what the model is given, whose position is used, and an app that
// does not draw answers.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

// Each plan as "key start–end (minutes)", in Korea time with the offset.
const summary = ({ plans }: AnswerReply): string[] =>
  plans.map(({ id, startAt, endAt, togetherMinutes }) => `${id} ${startAt}–${endAt} (${togetherMinutes})`);

// The asker of the worked example: Classes in 301동 until 11:50 and in 24동 from 13:00.
async function workedExample(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

async function minsu(): Promise<Named> {
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  return friend;
}

async function jieun(): Promise<Named> {
  const friend = await stage.friend('지은');
  await stage.classAt(friend, '11:00', '12:15', '8');
  await stage.classAt(friend, '13:00', '14:15', '8');
  return friend;
}

describe('Lunch with 민수 (the worked example)', () => {
  it('plans every Restaurant, the longest time together first, meeting at 301동 on the way', async () => {
    const date = '2087-01-07';
    const time = timeOn(date);
    await workedExample(date);
    const friend = await minsu();

    const response = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '학생회관식당 어때요?' }]);

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(summary(answer)).toEqual([
      `302동식당 ${time('12:15')}–${time('12:43')} (28)`,
      `301동식당 ${time('12:18')}–${time('12:45')} (27)`,
      `학생회관식당 ${time('12:33')}–${time('12:59')} (26)`,
      `3식당 ${time('12:31')}–${time('12:54')} (23)`,
      `자하연식당 2층 ${time('12:35')}–${time('12:55')} (20)`,
    ]);
    expect(answer.plans[2]?.meeting).toMatchObject({
      place: { label: '301동' },
      at: time('12:18'),
      userIds: [stage.asker.id, friend.id],
    });
    expect(answer.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지', '민수']);
  });
});

describe('Lunch with 민수 and 지은 (the worked example)', () => {
  it('plans the Student Center first, meeting 민수 at 12:18, and drops 301동 for 지은', async () => {
    const date = '2087-01-14';
    const time = timeOn(date);
    await workedExample(date);
    const [first, second] = [await minsu(), await jieun()];

    const response = await stage.send([
      resolve('민수'),
      resolve('지은'),
      planMeal(date, [first.id, second.id]),
      { text: '학생회관식당 어때요?' },
    ]);

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    const [studentCenter, place301] = [await stage.numbered('63'), await stage.numbered('301')];
    expect(answer.plans[0]).toMatchObject({
      id: '학생회관식당',
      startAt: time('12:33'),
      endAt: time('12:55'),
      togetherMinutes: 22,
      meeting: { at: time('12:18') },
      subQuests: [
        { at: time('12:18'), placeId: place301.id, title: '유상, 민수: 301동 앞에서 만나기' },
        { at: time('12:33'), placeId: studentCenter.id, title: '학생회관식당에서 식사' },
      ],
    });
    const dropped = answer.dropped.find(({ place }) => place.label === '301동식당');
    expect(dropped?.reason).toContain('지은');
  });
});

describe('What the model is given', () => {
  it('holds no coordinates, course names, or rooms, and the reply no course names or rooms', async () => {
    const date = '2087-01-21';
    await workedExample(date);
    const friend = await minsu();

    const response = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }]);

    expect(response.status).toBe(200);
    const given = JSON.stringify(stage.model.toolResults()[1]);
    expect(given).toContain('학생회관식당');
    for (const secret of ['latitude', COURSE, ROOM]) {
      expect(given).not.toContain(secret);
    }
    const replied = JSON.stringify(response.body);
    expect(replied).not.toContain(COURSE);
    expect(replied).not.toContain(ROOM);
  });
});

describe('What the model is told of the plans', () => {
  it("names the asker 나 and a Friend's name as others' text, with walks and times as words and minutes", async () => {
    const date = '2087-01-28';
    await workedExample(date);
    const friend = await minsu();

    await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }]);

    expect(stage.model.toolResults()[1]).toMatchObject({
      result: 'planned',
      plans: expect.arrayContaining([
        {
          restaurant: '학생회관식당',
          start: '12:33',
          end: '12:59',
          togetherMinutes: 26,
          meeting: { at: '12:18', place: '301동', with: ['<data label="friend.name">민수</data>'] },
          people: [
            { name: '나', from: '301동', walkMinutes: 15, leaveAt: '12:18', leaveBy: '12:59' },
            {
              name: '<data label="friend.name">민수</data>',
              from: '302동',
              walkMinutes: 18,
              leaveAt: '12:15',
              leaveBy: null,
            },
          ],
        },
      ]) as unknown,
      dropped: [],
    });
  });
});

// A Friend with no Class that day, whose phone is at the Student Center, and whose Master Switch is on, as the
// asker's is.
async function sharingFriend(date: string): Promise<{ friend: Named; at: { latitude: number; longitude: number } }> {
  await workedExample(date);
  const friend = await stage.friend('하은');
  await expectStatus(setMasterSwitch(stage.app, stage.asker, true), 204);
  await expectStatus(setMasterSwitch(stage.app, friend, true), 204);
  const { latitude, longitude } = await stage.numbered('63');
  await expectStatus(uploadPosition(stage.app, friend, { latitude, longitude }), 200);
  return { friend, at: { latitude, longitude } };
}

describe("A Friend's position", () => {
  it('is used when the asker may see it on the map', async () => {
    const date = '2087-02-04';
    const { friend, at } = await sharingFriend(date);

    const response = await stage.send([resolve('하은'), planMeal(date, [friend.id]), { text: '…' }]);

    const plan = answerIn(response.body).plans[0];
    expect(plan?.parts[1]).toMatchObject({ origin: { basis: 'location', place: { label: '63동' } } });
    expect(plan?.parts[1]?.walkMinutes).not.toBeNull();
    expect(plan?.scene.people.find(({ userId }) => userId === friend.id)).toMatchObject({ at, source: 'exact' });
  });

  it('is not used once the Friend has turned their sharing with the asker off', async () => {
    const date = '2087-02-11';
    const { friend } = await sharingFriend(date);
    await expectStatus(setFriendSharing(stage.app, friend, stage.asker.id, false), 204);

    const response = await stage.send([resolve('하은'), planMeal(date, [friend.id]), { text: '…' }]);

    const answer = answerIn(response.body);
    expect(answer.plans[0]?.parts[1]?.origin).toBeNull();
    expect(answer.chips.at(-1)).toEqual({ kind: 'person', text: '하은 · 자리 모름', userId: friend.id });
  });
});

describe("The asker's location", () => {
  it('is where an asker with no Class before sets out from', async () => {
    const date = '2087-02-18';
    await stage.asking(date, '11:50');
    await stage.menusOn(date, RESTAURANTS);
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    const { latitude, longitude } = await stage.numbered('301');

    const response = await stage.send([planMeal(date), { text: '…' }], {
      context: { location: { latitude, longitude } },
    });

    const answer = answerIn(response.body);
    expect(answer.plans[0]?.parts[0]).toMatchObject({ origin: { basis: 'location', place: { label: '301동' } } });
    expect(answer.chips[0]).toEqual({ kind: 'origin', text: '301동에서', userId: null });
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app that does not draw answers', () => {
  it('is offered the Restaurant cards, not planMeal, and gets no answer', async () => {
    await stage.asking('2087-02-25', '11:50');

    const response = await stage.send([{ text: '네' }], { clientCapabilities: ['library'] });

    expect(response.status).toBe(200);
    expect(toolNames()).toContain('findMealRestaurants');
    expect(toolNames()).not.toContain('planMeal');
    expect(replySchema.parse(response.body).answer).toBeNull();
  });

  it('is told apart from one that does, which is offered planMeal with its rules in place of the cards', async () => {
    await stage.asking('2087-02-25', '11:50');

    await stage.send([{ text: '네' }]);

    expect(toolNames()).toContain('planMeal');
    expect(toolNames()).not.toContain('findMealRestaurants');
    expect(toolNames()).not.toContain('showRestaurants');
    expect(stage.model.system()).toContain(PLAN_RULES);
  });
});

describe('A day without menus', () => {
  it('answers no plan for want of a menu, and tells the model none', async () => {
    const date = '2087-03-04';
    await stage.asking(date, '11:50');

    const response = await stage.send([planMeal(date), { text: '…' }]);

    const answer = answerIn(response.body);
    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-menu');
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
  });
});

describe('A Friend the resolver did not return', () => {
  it('is refused, and nothing is planned', async () => {
    const date = '2087-03-11';
    await stage.asking(date, '11:50');

    const response = await stage.send([planMeal(date, [randomUUID()]), { text: '…' }]);

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});
