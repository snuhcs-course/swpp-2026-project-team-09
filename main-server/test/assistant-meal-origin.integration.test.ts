/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, planMeal } from './meal-plan.js';

// Where the asker of a meal sets out from, after the morning's Class has ended (P05 ticket 42), at the Assistant's
// endpoint with the seed's walking table. Reported on 2026-11-23 at about 12:40: lunch asked at noon started from 301동
// at 10:45, the end of the first Class, though the User had left it or never gone.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const TUESDAY = '2097-09-03';
const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const answerSchema = z.object({ answer: z.custom<AnswerReply>((value) => value !== null) });

// The asker's origin in the first plan, with the context given once the asker is signed in.
async function myOrigin(
  contextOf: () => Promise<object>,
): Promise<AnswerReply['plans'][number]['parts'][number]['origin']> {
  await stage.asking(TUESDAY, '12:00');
  const context = await contextOf();
  await stage.menusOn(TUESDAY, RESTAURANTS);
  await stage.classAt(stage.asker, '09:30', '10:45', '301');
  const response = await stage.send([planMeal(TUESDAY), { text: '…' }], { context }, '점심 어디서 먹을까');
  expect(response.status).toBe(200);
  const { answer } = answerSchema.parse(response.body);
  return answer.plans[0]?.parts.find(({ me }) => me)?.origin ?? null;
}

// Where 302동 is, as the app sends a position.
async function at302(): Promise<object> {
  const { latitude, longitude } = await stage.numbered('302');
  return { location: { latitude, longitude } };
}

describe('Lunch asked at 12:00 after a Class in 301동 that ended at 10:45', () => {
  it('off campus, with no position, sets out from where nobody knows, not from 301동', async () => {
    expect(await myOrigin(() => Promise.resolve({ locationMissing: 'off-campus' }))).toBeNull();
  });

  it('with the location permission refused, sets out from where nobody knows', async () => {
    expect(await myOrigin(() => Promise.resolve({ locationMissing: 'permission' }))).toBeNull();
  });

  it('at 302동, sets out from there', async () => {
    expect(await myOrigin(at302)).toMatchObject({
      place: { label: '302동' },
      basis: 'location',
    });
  });
});
