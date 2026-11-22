/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, planMeal } from './meal-plan.js';

// A meal's plans, the least walking first (P05 ticket 32), at the Assistant's endpoint with the seed's walking table.
// Reported on a Sunday at 21:20 for Monday: a Class ends at 10:45 in 301동 and the next starts at 15:30 in 302동, and
// the first plan was 학생회관식당, 32 minutes' walk, for staying until it closes at 14:30, while 301동식당 and
// 302동식당 are minutes away.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const SUNDAY = '2097-09-01';
const MONDAY = '2097-09-02';
const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];
const ENGINEERING = { opensAt: '11:00', closesAt: '13:30' };

const answerSchema = z.object({ answer: z.custom<AnswerReply>((value) => value !== null) });

async function monday(): Promise<void> {
  await stage.asking(SUNDAY, '21:20');
  await stage.menusOn(MONDAY, RESTAURANTS);
  stage.hoursAre({
    '301동식당': { lunch: ENGINEERING },
    '302동식당': { lunch: ENGINEERING },
    학생회관식당: { lunch: { opensAt: '11:00', closesAt: '14:30' } },
  });
  await stage.classAt(stage.asker, '09:30', '10:45', '301', 'monday');
}

async function plansFor(): Promise<AnswerReply['plans']> {
  const response = await stage.send([planMeal(MONDAY), { text: '…' }], {}, '내일 점심 어디서 먹을까');
  expect(response.status).toBe(200);
  return answerSchema.parse(response.body).answer.plans;
}

describe('Lunch on Monday, asked on Sunday night', () => {
  it('between a Class in 301동 and one in 302동, puts the two Restaurants there first', async () => {
    await monday();
    await stage.classAt(stage.asker, '15:30', '16:45', '302', 'monday');

    const plans = await plansFor();

    expect(plans.slice(0, 2).map(({ id, startAt }) => [id, startAt])).toEqual([
      ['301동식당', `${MONDAY}T11:00:00+09:00`],
      ['302동식당', `${MONDAY}T11:00:00+09:00`],
    ]);
    const longest = Math.max(...plans.map(({ togetherMinutes }) => togetherMinutes));
    expect(plans.find(({ id }) => id === '학생회관식당')?.togetherMinutes).toBe(longest);
  });

  it('with nothing after the Class in 301동, puts the Restaurant in 301동 first', async () => {
    await monday();

    const [first] = await plansFor();

    expect(first?.id).toBe('301동식당');
  });
});
