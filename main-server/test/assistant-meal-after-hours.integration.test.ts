/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A meal asked for after it is over today (P01 ticket 23, the Release's smoke test, row 1): "배고파" at 21:20 left an
// answer with nothing to change and a sentence about buttons that were not there. Now the reply offers tomorrow's lunch
// with 내일로, the button of a time of today that has passed (P05 ticket 80), beside the model's sentence: a request for
// now names no time. Lunch named at 15:00 asks for the whole message, in `assistant-meal-by-clock`.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당'];

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  offers: z.array(z.object({ kind: z.string(), label: z.string(), text: z.string() })).optional(),
});

const planMeal = (input: object): Step => ({ tool: 'planMeal', input });

// What planMeal answered the model.
function toolSaid(): { result: string; reason: string } {
  return z.object({ result: z.string(), reason: z.string() }).parse(stage.model.toolResults().at(-1));
}

describe('배고파 after dinner is over', () => {
  it('draws no answer and offers tomorrow’s lunch as the one button, 내일로', async () => {
    const date = '2098-11-04';
    await stage.asking(date, '21:20');
    await stage.menusOn(date, RESTAURANTS);

    const response = await stage.send([planMeal({ date, now: true }), { text: '…' }]);

    expect(response.status).toBe(200);
    const reply = replySchema.parse(response.body);
    expect(reply.answer).toBeNull();
    expect(reply.offers).toEqual([{ kind: 'ask', label: '내일로', text: '내일 점심으로 해 줘' }]);
    const said = toolSaid();
    expect(said.result).toBe('none');
    expect(said.reason).toContain('Say only "오늘 식사 시간은 지났어요. 내일로 볼까요?"');
    expect(said.reason).not.toContain('buttons to ease');
  });
});

describe('지금 with nothing to ease before the meal is over', () => {
  it('keeps the answer and tells the model of no buttons', async () => {
    const date = '2098-11-18';
    await stage.asking(date, '12:00');
    await stage.menusOn(date, RESTAURANTS);
    await stage.classAt(stage.asker, '11:00', '14:30', '301');
    await stage.classAt(stage.asker, '17:00', '19:30', '301');

    const response = await stage.send([planMeal({ date, now: true }), { text: '…' }]);

    const reply = replySchema.parse(response.body);
    expect(reply.answer?.noPlan?.relax ?? []).toEqual([]);
    expect(reply.offers).toBeUndefined();
    expect(toolSaid().reason).not.toContain('button');
  });
});
