/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// The meal the server takes by the clock when the model leaves it out, at the Assistant's endpoint with the scripted
// model: "배고파, 민수랑 같이" asked at 15:00, after lunch's window (11:00–14:30) has ended, plans dinner. A start the
// User names before dinner's window (17:00–19:30) is fitted to it, and a lunch they name is still planned.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당'];

const replySchema = z.object({ answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

// Each Restaurant serving lunch and dinner that day.
async function lunchAndDinner(date: string): Promise<void> {
  const dinner = { meal: 'dinner', text: '돈까스 : 5,500원', kind: 'dish', name: '돈까스', price: 5500 };
  const lunch = { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 };
  const restaurants = RESTAURANTS.map((name) => restaurant({ name, lines: [lunch, dinner] }));
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
}

// Asked on a Tuesday at 15:00 by an asker in class in 301동 from 16:00 to 16:45, with 민수 in class in 302동 then.
async function askedAtThree(date: string): Promise<Named> {
  await stage.asking(date, '15:00');
  await lunchAndDinner(date);
  await stage.classAt(stage.asker, '16:00', '16:45', '301');
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '16:00', '16:45', '302');
  return friend;
}

const planMeal = (input: object): Step => ({ tool: 'planMeal', input });

describe('A meal the model leaves out, at 15:00', () => {
  it('is dinner: the plans start once dinner is served, the first line names it, and the model is told', async () => {
    const date = '2087-10-07';
    const friend = await askedAtThree(date);

    const response = await stage.send(
      [resolve('민수'), planMeal({ date, friendIds: [friend.id] }), { text: '…' }],
      {},
      '배고파, 민수랑 같이',
    );

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ kind: 'meal', date, meal: 'dinner' });
    expect(answer.plans.length).toBeGreaterThan(0);
    expect(answer.plans.filter(({ startAt }) => startAt < `${date}T17:00:00+09:00`)).toEqual([]);
    expect(answer.plans[0]?.lines[0]?.[0]).toEqual(plain('저녁 '));
    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'planned', meal: 'dinner' });
  });
});

describe('A start the User names before dinner is served', () => {
  it("is fitted to dinner's window, which the plan says it starts at", async () => {
    const date = '2087-10-14';
    const friend = await askedAtThree(date);

    const response = await stage.send(
      [resolve('민수'), planMeal({ date, meal: 'dinner', friendIds: [friend.id], from: '15:00' }), { text: '…' }],
      {},
      '오후 3시쯤 민수랑 저녁 먹자',
    );

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ meal: 'dinner', window: { from: '15:00', until: null } });
    expect(answer.plans.find(({ id }) => id === '302동식당')).toMatchObject({
      startAt: `${date}T17:00:00+09:00`,
      lines: [[plain('저녁 '), { text: '17:00 302동식당', strong: true }], [plain('저녁은 17:00부터예요')]],
    });
  });
});

describe('A lunch the User names at 15:00', () => {
  it('is planned as asked, and answers that no lunch time is left', async () => {
    const date = '2087-10-21';
    const friend = await askedAtThree(date);

    const response = await stage.send(
      [resolve('민수'), planMeal({ date, meal: 'lunch', friendIds: [friend.id] }), { text: '…' }],
      {},
      '오늘 점심 민수랑 먹자',
    );

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ meal: 'lunch' });
    expect(answer.noPlan).toEqual({
      reason: 'no-shared-time',
      lines: [[plain('점심 시간에는 같이 비는 시간이 없어요')]],
    });
  });
});
