/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { BetterPlanStage, inputOf, time, type WorkedQuest } from './better-plan.js';
import { type Named } from './meal-plan.js';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { answerIn, recalculate } from './plan-answers.js';
import { answerInvitation, handOver } from './quest-recruiting.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// A shared meal changed in place (P05 ticket 31, row 20 of ticket 17's case table): the asker's lunch with Friends is
// set aside and changeable when the plans are for its people, and 바꾸기, `PUT /plans/:questId`, changes it in place
// with everyone still in. A lunch a Friend set, or one asked for with other people, is not changeable: the `PUT` would
// refuse it.

const stage = new BetterPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const PLAN_SET = { clientCapabilities: ['library', 'answer', 'plan-set'] };

const resolve = (name: string): Step => ({ tool: 'resolveFriend', input: { name } });

const planMeal = (date: string, friendIds: string[] = []): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds },
});

// The asker asks for lunch with these Friends, by the model's planMeal, and the answer and planMeal's words come back.
async function askLunch(
  date: string,
  friends: readonly Named[],
  text: string,
  app: object = PLAN_SET,
): Promise<{ response: request.Response; words: unknown }> {
  const steps = [
    ...friends.map(({ name }) => resolve(name)),
    planMeal(
      date,
      friends.map(({ id }) => id),
    ),
  ];
  const response = await stage.send([...steps, { text: '…' }], app, text);
  const words = stage.model
    .toolResults()
    .find((result) => z.object({ result: z.literal('planned') }).safeParse(result).success);
  return { response, words };
}

// Presses 바꾸기: the answer's first plan goes to `PUT /plans/:questId` for these people.
function pressChange(body: unknown, questId: string, date: string, people: readonly string[]): request.Test {
  const [plan] = answerIn(body).plans;
  return stage.changePlan(stage.asker, questId, {
    input: inputOf(date, [...people]),
    planId: plan?.id,
    startAt: plan?.startAt,
    location: null,
  });
}

const membersOf = async (questId: string): Promise<string[]> => {
  const quest = await withAccessToken(
    request(stage.app.getHttpServer()).get(`/quests/${questId}`),
    stage.asker.accessToken,
  );
  return z
    .object({ members: z.array(z.object({ user: z.object({ id: z.string() }) })) })
    .parse(quest.body)
    .members.map(({ user }) => user.id);
};

describe('A lunch the asker leads with Friends, asked for with its people', () => {
  let worked: WorkedQuest;
  const date = '2088-11-02';

  beforeAll(async () => {
    worked = await stage.workedQuest(date);
  });

  it('is set aside as changeable, and 바꾸기 changes it in place with everyone still in (row 20a)', async () => {
    const { minsu, jieun, questId } = worked;

    const { response, words } = await askLunch(date, [minsu, jieun], '민수랑 지은이랑 점심 먹자');

    expect(answerIn(response.body).planSet).toMatchObject({ questId, changeable: true });
    expect(words).toMatchObject({ alreadySet: { shared: true, changeable: true } });
    const changed = await pressChange(response.body, questId, date, [stage.asker.id, minsu.id, jieun.id]);
    expect(changed.status).toBe(200);
    expect(await membersOf(questId)).toEqual(expect.arrayContaining([stage.asker.id, minsu.id]));
    expect(await stage.invitationTo(jieun, questId)).toBeDefined();
  });

  it('asked for with its people from an app that draws no 바꾸기, is not changeable (row 20j)', async () => {
    const { minsu, jieun, questId } = worked;
    const released = { clientCapabilities: ['library', 'answer'] };

    const { response, words } = await askLunch(date, [minsu, jieun], '민수랑 지은이랑 점심 먹자', released);

    expect(answerIn(response.body).planSet).toMatchObject({ questId, changeable: false });
    expect(words).toMatchObject({ alreadySet: { shared: true, changeable: false } });
  });

  it('asked for alone, is set aside but not changeable (row 20b)', async () => {
    const { response, words } = await askLunch(date, [], '점심 뭐 먹지?');

    expect(answerIn(response.body).planSet).toMatchObject({ questId: worked.questId, changeable: false });
    expect(words).toMatchObject({ alreadySet: { shared: true, changeable: false } });
  });

  it('asked about by its ref, is offered 시간 바꾸기, as a meeting is', async () => {
    const findDay = { tool: 'findDay', input: { date, questIds: [worked.questId.slice(0, 8)] } };

    await stage.send([findDay, { text: '…' }], PLAN_SET, '점심 어디서 먹기로 했지?');

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'found',
      quests: [expect.objectContaining({ changeable: true })],
      note: expect.any(String) as unknown,
    });
  });
});

describe('A lunch with Friends the asker does not lead', () => {
  it('names the Friend who leads it, and is not changeable (row 20d)', async () => {
    const date = '2088-11-09';
    const { minsu, jieun, questId } = await stage.workedQuest(date);
    await handOver(stage.app, stage.asker, questId, minsu.id);

    const { response, words } = await askLunch(date, [minsu, jieun], '민수랑 지은이랑 점심 먹자');

    expect(answerIn(response.body).planSet).toMatchObject({ questId, changeable: false });
    expect(words).toMatchObject({
      alreadySet: { changeable: false, leader: expect.stringContaining('민수') as unknown },
    });
  });
});

describe('A lunch whose only invited Friend declined', () => {
  it('is the same lunch, changeable, and 바꾸기 asks the Friend again (row 20e)', async () => {
    const date = '2088-11-16';
    // Before lunch, so that the lunch kept has not started (row 20g).
    await stage.asking(date, '10:30');
    await stage.menusOn(date, ['301동식당', '302동식당', '학생회관식당']);
    const minsu = await stage.friend('민수');
    const kept = await keptLunch(date, minsu);
    await answerInvitation(stage.app, minsu, (await stage.invitationTo(minsu, kept)) ?? '', 'decline');

    const { response, words } = await askLunch(date, [minsu], '민수랑 점심 먹자');

    expect(answerIn(response.body).planSet).toMatchObject({ questId: kept, changeable: true });
    expect(words).toMatchObject({ alreadySet: { declined: [expect.stringContaining('민수')] } });
    expect((await pressChange(response.body, kept, date, [stage.asker.id, minsu.id])).status).toBe(200);
    expect(await stage.invitationTo(minsu, kept)).toBeDefined();
  });
});

describe('A lunch the asker keeps alone, asked for with a Friend', () => {
  // Row 20i made a new Quest in its place; P05 ticket 44 adds the Friend to the same one.
  it('is changeable in place, adding the Friend (row 20i, P05 ticket 44)', async () => {
    const date = '2088-11-23';
    // Before lunch, so that the lunch kept has not started (row 20g).
    await stage.asking(date, '10:30');
    await stage.menusOn(date, ['301동식당', '302동식당', '학생회관식당']);
    const minsu = await stage.friend('민수');
    const kept = await keptLunch(date);

    const { response, words } = await askLunch(date, [minsu], '민수랑 점심 먹자');

    expect(answerIn(response.body).planSet).toMatchObject({ questId: kept, changeable: true });
    expect(answerIn(response.body).adding?.friends).toEqual([{ userId: minsu.id, name: '민수' }]);
    expect(words).toMatchObject({ alreadySet: { shared: false, changeable: true } });
  });
});

// A lunch the asker made of the first plan for them and the Friend, if any, at POST /plans.
async function keptLunch(date: string, friend?: Named): Promise<string> {
  const people = friend === undefined ? [stage.asker.id] : [stage.asker.id, friend.id];
  const answered = await recalculate(stage, inputOf(date, people));
  const [plan] = z.custom<AnswerReply>().parse(answered.body).plans;
  const made = await withAccessToken(request(stage.app.getHttpServer()).post('/plans'), stage.asker.accessToken)
    .set('Idempotency-Key', randomUUID())
    .send({
      input: inputOf(date, people),
      planId: plan?.id,
      startAt: plan?.startAt ?? time(date, '12:00'),
      location: null,
    });
  return z.object({ quest: z.object({ id: z.string() }) }).parse(made.body).quest.id;
}
