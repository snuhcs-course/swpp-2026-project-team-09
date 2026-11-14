/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { MealPlanStage, planMeal } from './meal-plan.js';

// A layer's button beside a meal planned on the map: the answer already takes the map, so the reply has none, whichever
// of the two the model asks for first.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({ mapButtons: z.array(z.string()), answer: z.unknown() });

const dining = { tool: 'showOnMap', input: { layer: 'dining' } };

async function lunchAlone(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, ['301동식당']);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
}

describe("A layer's button beside a Plan", () => {
  it('is not added after the Plan, and the model is told why', async () => {
    const date = '2087-06-03';
    await lunchAlone(date);

    const response = await stage.send([planMeal(date), dining, { text: '…' }]);

    const { mapButtons, answer } = replySchema.parse(response.body);
    expect(answer).not.toBeNull();
    expect(mapButtons).toEqual([]);
    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'not shown' });
  });

  it('is taken back when the Plan comes after it', async () => {
    const date = '2087-06-10';
    await lunchAlone(date);

    const response = await stage.send([dining, planMeal(date), { text: '…' }]);

    expect(replySchema.parse(response.body).mapButtons).toEqual([]);
  });

  it('stays when the reply has no Plan', async () => {
    await stage.asking('2087-06-17', '11:50');

    const response = await stage.send([dining, { text: '…' }]);

    expect(replySchema.parse(response.body)).toEqual({ mapButtons: ['dining'], answer: null });
  });
});
