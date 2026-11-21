/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { firstPlan, inputOf, makePlanQuest } from './plan-quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// The Assistant knows the User's Quests (P05 ticket 17, slice 1): findDay reads their Quests of a day beside their
// Classes, with each Quest's ref, kind and people, shows only those asked about, and the model reads what is still
// ahead today with each message.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];

const replySchema = z.object({ lookup: z.custom<Lookup | null>() });

const questIdOf = (body: unknown): string => z.object({ quest: z.object({ id: z.string() }) }).parse(body).quest.id;

// A lunch taken alone and a meeting with 민수 at 14:00, made from their Plans on `date`, asked at 10:30.
async function dayWithQuests(date: string): Promise<{ lunch: string; meeting: string }> {
  await stage.asking(date, '10:30');
  await stage.menusOn(date, RESTAURANTS);
  const minsu = await stage.friend('민수');
  const lunchPlan = await firstPlan(stage, date, [stage.asker.id]);
  const lunch = await makePlanQuest(stage, {
    input: inputOf(date, [stage.asker.id]),
    planId: lunchPlan.id,
    startAt: lunchPlan.startAt,
    location: null,
  });
  const meetInput = {
    kind: 'meet',
    date,
    people: [stage.asker.id, minsu.id].map((userId) => ({ userId, constraints: [] })),
    window: { from: '14:00', until: null },
    placeId: null,
  };
  const recalculated = await withAccessToken(
    request(stage.app.getHttpServer()).post('/assistant/answers'),
    stage.asker.accessToken,
  ).send({ input: meetInput });
  const [meetPlan] = z.custom<AnswerReply>().parse(recalculated.body).plans;
  const meeting = await makePlanQuest(stage, {
    input: meetInput,
    planId: meetPlan?.id,
    startAt: meetPlan?.startAt,
    location: null,
  });
  expect([lunch.status, meeting.status]).toEqual([201, 201]);
  return { lunch: questIdOf(lunch.body), meeting: questIdOf(meeting.body) };
}

const findDay = (input: object): Step => ({ tool: 'findDay', input });

describe("The User's day asked about", () => {
  it('holds their Quests beside their Classes, each with its ref, kind and people, drawn as a day', async () => {
    const date = '2089-10-10';
    const { lunch, meeting } = await dayWithQuests(date);

    const response = await stage.send([findDay({ date }), { text: '…' }], {}, '오늘 뭐 있지?');

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'found',
      quests: [
        { ref: lunch, kind: 'meal-lunch', mine: true, changeable: true },
        { ref: meeting, kind: 'meet', start: '14:00', people: [{ answer: 'waiting' }] },
      ],
    });
    const { lookup } = replySchema.parse(response.body);
    expect(lookup?.kind).toBe('day');
    expect(lookup?.steps?.map(({ text }) => text)).toEqual([
      expect.stringMatching(/에서 점심$/u),
      expect.stringMatching(/에서 만나기 · 민수$/u),
    ]);
  });

  it('shows only the Quest asked about, by the first 8 characters of its ref', async () => {
    const date = '2089-10-17';
    const { meeting } = await dayWithQuests(date);

    const response = await stage.send(
      [findDay({ date, questIds: [meeting.slice(0, 8)] }), { text: '…' }],
      {},
      '민수랑 약속 몇 시였지?',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ classes: [], quests: [{ ref: meeting, kind: 'meet' }] });
    const { lookup } = replySchema.parse(response.body);
    expect(lookup?.steps).toHaveLength(1);
    expect(lookup?.kept).toMatchObject([
      { questId: meeting, kind: 'meet', people: [{ name: '민수', answer: 'waiting' }], mine: true, changeable: false },
    ]);
  });
});

describe('What is still ahead today', () => {
  it("is a line the model reads after the User's message, with each Quest's ref, kind and people", async () => {
    const date = '2089-10-24';
    const { meeting } = await dayWithQuests(date);

    await stage.send([{ text: '…' }], {}, '안녕');

    const sent = JSON.stringify(stage.model.received()[0]?.prompt);
    expect(sent).toContain('[Ahead: ');
    expect(sent).toContain(`meet`);
    expect(sent).toContain(`ref ${meeting.slice(0, 8)}, mine`);
    expect(sent).toContain('민수');
  });
});
