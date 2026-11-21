/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// The Board asked back as buttons (P05 ticket 23): when proposeQuest refuses only the Board, the reply offers the four
// Boards as `ask` offers, which the app docks as chips under the question, and the model is told so. Any other field
// missing beside it, or a Proposal made after it in the same reply, leaves no Board chips.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

// A recruiting 파티 at 15:00 on `date`, with `more` over it.
const codingStudy = (date: string, more: object = {}): Step => ({
  tool: 'proposeQuest',
  input: {
    title: '코딩 스터디',
    description: '같이 코딩 공부해요',
    joinPolicy: 'approval',
    capacity: 4,
    startsAt: `${date}T15:00:00+09:00`,
    ...more,
  },
});

const replySchema = z.object({
  proposal: z.unknown(),
  offers: z.array(z.object({ kind: z.string(), label: z.string(), text: z.string() })).optional(),
});

describe('A 파티 refused only for its Board', () => {
  it('offers the four Boards as chips under the question, and tells the model so', async () => {
    await stage.asking('2091-03-05', '11:30');

    const response = await stage.send(
      [codingStudy('2091-03-06'), { text: '어느 게시판에 올릴까요?' }],
      {},
      '내일 3시 코딩 스터디 4명 모집해줘',
    );

    expect(replySchema.parse(response.body).offers).toEqual([
      { kind: 'ask', label: '식사', text: '식사 게시판으로 해 줘' },
      { kind: 'ask', label: '진로', text: '진로 게시판으로 해 줘' },
      { kind: 'ask', label: '취미', text: '취미 게시판으로 해 줘' },
      { kind: 'ask', label: '공연', text: '공연 게시판으로 해 줘' },
    ]);
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'refused',
      fields: { board: expect.any(String) as unknown },
      note: expect.stringContaining('buttons') as unknown,
    });
  });
});

describe('No Board chips', () => {
  it('when another field is missing beside the Board', async () => {
    await stage.asking('2091-03-12', '11:30');

    const response = await stage.send(
      [codingStudy('2091-03-13', { capacity: undefined }), { text: '몇 명으로 할까요?' }],
      {},
      '내일 3시 코딩 스터디 모집해줘',
    );

    expect(replySchema.parse(response.body).offers).toBeUndefined();
  });

  it('when the model chose the Board and proposed in the same reply', async () => {
    await stage.asking('2091-03-19', '11:30');

    const response = await stage.send(
      [codingStudy('2091-03-20'), codingStudy('2091-03-20', { board: 'career' }), { text: '…' }],
      {},
      '내일 3시 코딩 스터디 4명 모집해줘',
    );

    const reply = replySchema.parse(response.body);
    expect(reply.proposal).not.toBeNull();
    expect(reply.offers).toBeUndefined();
  });
});
