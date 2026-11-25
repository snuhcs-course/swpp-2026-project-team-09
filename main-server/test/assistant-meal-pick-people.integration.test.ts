/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MealPlanStage, planMeal, resolve } from './meal-plan.js';
import { answerIn } from './plan-answers.js';
import { type Step } from './scripted-model.js';

// A meal asked with company the User did not name (P04 ticket 73; the user's phone on 2026-11-26: "친구 두명이랑 저녁"
// was asked back for names). planMeal plans it for the User alone, or with the Friends they named, and the answer opens
// the picking of Friends on the plan. At the Assistant's endpoint with the scripted model, the seed's walking table and
// Places, on the design's worked example (Classes in 301동 until 11:50 and in 24동 from 13:00).

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const TUESDAY = '2084-03-07';

const pickingMeal = (friendIds: string[] = []): Step => ({
  tool: 'planMeal',
  input: { date: TUESDAY, meal: 'lunch', friendIds, pickPeople: true },
});

async function askerWithDay(): Promise<void> {
  await stage.asking(TUESDAY, '11:50');
  await stage.menusOn(TUESDAY, ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층']);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

// Who the plan is for, the asker first.
function peopleIn({ input }: ReturnType<typeof answerIn>): string[] {
  return 'people' in input ? input.people.map(({ userId }) => userId) : [];
}

async function answered(steps: Step[], text: string): Promise<ReturnType<typeof answerIn>> {
  return answerIn((await stage.send([...steps, { text: '…' }], {}, text)).body);
}

// Partitions: nobody named, with Friends to pick; one named and more to pick; nobody named and no Friend at all; a meal
// asked without the flag. Expected values: who the plan is for, and whether the answer opens the picking.
describe('A meal with Friends the User did not name', () => {
  it('is planned for the User alone, and opens the picking of their Friends', async () => {
    await askerWithDay();
    const jieun = await stage.friend('지은');

    const answer = await answered([pickingMeal()], '친구 두명이랑 점심');

    expect(answer.pickPeople).toBe(true);
    expect(peopleIn(answer)).toEqual([stage.asker.id]);
    expect(answer.plans[0]?.band.others?.map(({ userId }) => userId)).toEqual([jieun.id]);
  });

  it('is planned with the Friend the User named, and opens the picking for the rest', async () => {
    await askerWithDay();
    const minsu = await stage.friend('민수');
    await stage.friend('지은');

    const answer = await answered([resolve('민수'), pickingMeal([minsu.id])], '민수랑 친구 한 명 더 해서 점심');

    expect(answer.pickPeople).toBe(true);
    expect(peopleIn(answer)).toEqual([stage.asker.id, minsu.id]);
  });

  it('opens nothing for a User without Friends, whose plan is theirs alone', async () => {
    await askerWithDay();

    const answer = await answered([pickingMeal()], '친구랑 점심');

    expect(answer.pickPeople).toBeUndefined();
    expect(answer.plans.length).toBeGreaterThan(0);
  });

  it('opens nothing for a meal asked without it', async () => {
    await askerWithDay();
    await stage.friend('지은');

    const answer = await answered([planMeal(TUESDAY)], '배고파');

    expect(answer.pickPeople).toBeUndefined();
  });
});
