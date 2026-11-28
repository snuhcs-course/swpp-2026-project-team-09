/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';

// A time of today the User named that has passed, at the Assistant's endpoint with the scripted model and the real chat
// feature (P05 ticket 80). On the phone at 11:13, "아침 7시에 도서관 갔다가 점심" was answered at once for 내일(일). Now the
// reply asks back with 내일로 and 오늘 지금부터 before anything is planned: once for the whole message, whatever else
// its tools drew, and with the same question for every answer kind. Each test asks on a Tuesday of 2097, which no other
// file posts menus for.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당'];

const ANSWERS_APP = { clientCapabilities: ['library', 'answer', 'answers', 'events', 'meet'] };

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  answers: z.array(z.custom<AnswerReply>()).optional(),
  offers: z.array(z.object({ kind: z.string(), label: z.string(), text: z.string() })).optional(),
  steps: z.array(z.unknown()).optional(),
  lookup: z.unknown(),
  cards: z.array(z.unknown()),
});

const QUESTION = '오늘 아침 7시는 지났어요. 내일로 볼까요?';
const CHOICES = [
  { kind: 'ask', label: '내일로', text: '내일 아침 7시로 해 줘' },
  { kind: 'ask', label: '오늘 지금부터', text: '오늘 지금부터 해 줘' },
];

const askPastTime = (named: string, at: string): { tool: string; input: object } => ({
  tool: 'askPastTime',
  input: { named, at },
});

describe('아침 7시에 도서관 갔다가 점심, asked at 11:13', () => {
  it('asks back with 내일로 and 오늘 지금부터, and plans and draws nothing', async () => {
    const date = '2097-11-05';
    await stage.asking(date, '11:13');
    await stage.menusOn(date, RESTAURANTS);

    const response = await stage.send(
      [
        askPastTime('아침 7시', '07:00'),
        { tool: 'planMeal', input: { date, meal: 'lunch' } },
        { text: '내일 아침 7시에 도서관, 점심은 302동식당이에요.' },
      ],
      ANSWERS_APP,
      '아침 7시에 도서관 갔다가 점심',
    );

    expect(response.status).toBe(200);
    const reply = replySchema.parse(response.body);
    expect(reply).toMatchObject({ text: QUESTION, answer: null, lookup: null, cards: [], offers: CHOICES });
    expect(reply.answers ?? []).toEqual([]);
    expect(reply.steps).toBeUndefined();
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'asked' });
  });
});

describe('The question of a time that passed, asked at 11:13', () => {
  it('reads the Past times line with what of today is over', async () => {
    const date = '2097-11-12';
    await stage.asking(date, '11:13');

    await stage.send([askPastTime('아침 7시', '07:00'), { text: '' }], ANSWERS_APP, '아침 7시에 도서관 갔다가 점심');

    expect(stage.model.system()).toContain('Past times: now is 11:13');
    expect(stage.model.system()).toContain('새벽, 아침 are over');
  });

  it('asks once for a message that named two times that passed', async () => {
    const date = '2097-11-19';
    await stage.asking(date, '11:13');

    const response = await stage.send(
      [askPastTime('아침 7시', '07:00'), askPastTime('10시', '10:00'), { text: '' }],
      ANSWERS_APP,
      '아침 7시에 도서관, 10시에 점심',
    );

    expect(replySchema.parse(response.body)).toMatchObject({ text: QUESTION, offers: CHOICES });
  });

  it('gives an app that does not say answers the same question in words, with its buttons', async () => {
    const date = '2097-11-26';
    await stage.asking(date, '11:13');

    const response = await stage.send([askPastTime('아침 7시', '07:00'), { text: '' }], {}, '아침 7시에 도서관');

    expect(replySchema.parse(response.body)).toMatchObject({ text: QUESTION, answer: null, offers: CHOICES });
  });
});

describe('저녁 7시에 밥, asked at 11:13', () => {
  it('is still to come today, so the message is answered as asked', async () => {
    const date = '2097-12-03';
    await stage.asking(date, '11:13');
    await stage.menusOn(date, RESTAURANTS);

    const response = await stage.send(
      [askPastTime('저녁 7시', '19:00'), { tool: 'planMeal', input: { date, meal: 'dinner' } }, { text: '…' }],
      ANSWERS_APP,
      '저녁 7시에 밥',
    );

    const reply = replySchema.parse(response.body);
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'not-past' });
    expect(reply.answer?.input).toMatchObject({ kind: 'meal', date, meal: 'dinner' });
    expect(reply.offers).toBeUndefined();
  });
});
