/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MealPlanStage, planMeal } from './meal-plan.js';
import { replySchema } from './plan-answers.js';

// A meal's reply is the one sentence about the first plan (P04 ticket 73's second fault; the user's phone on
// 2026-11-26: "저녁" was answered "예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 도보 3분이에요."). At the
// Assistant's endpoint with the scripted model writing that reply, the seed's walking table and Places.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const TUESDAY = '2084-03-07';
const FIRST = '301동식당이 가장 가까워서 11:50에 먹어요.';

describe('A meal reply with a walk in a second sentence', () => {
  it('reaches the app as its first sentence alone', async () => {
    await stage.asking(TUESDAY, '11:50');
    await stage.menusOn(TUESDAY, ['301동식당', '302동식당', '학생회관식당']);
    await stage.classAt(stage.asker, '11:00', '11:50', '301');

    const response = await stage.send([planMeal(TUESDAY), { text: `${FIRST} 301동에서 도보 1분이에요.` }], {}, '점심');

    const reply = replySchema.parse(response.body);
    expect(reply.answer?.plans.length).toBeGreaterThan(0);
    expect(reply.text).toBe(FIRST);
  });
});
