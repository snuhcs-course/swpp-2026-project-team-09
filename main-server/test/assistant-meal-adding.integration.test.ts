/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type Plan } from '../src/assistant/dto/answer.dto.js';
import { BetterPlanStage, inputOf } from './better-plan.js';
import { befriend, type TestUser } from './friends.js';
import { type Named, planMeal, resolve } from './meal-plan.js';
import { answerIn } from './plan-answers.js';
import { answerInvitation, getInvitations, handOver } from './quest-recruiting.js';
import { withAccessToken } from './sign-in.js';

// A Friend added to a meal already made as a Quest (P05 ticket 44). On each Tuesday of 2101, at 10:30, the asker has a
// Class in 301동 until 11:45 and again from 14:00, and 민수 one in 302동 until 11:45; the asker makes their lunch of
// the first plan, and asks to add a Friend by the model's planMeal with that Friend alone. The plans keep the lunch's
// Restaurant and start, and 바꾸기 (`PUT /plans/:questId`) invites the Friend to that same Quest; nothing is sent before.

const stage = new BetterPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const PLAN_SET = ['library', 'answer', 'plan-set'];

const ids = ({ input }: AnswerReply): string[] => ('people' in input ? input.people.map(({ userId }) => userId) : []);

async function dayOf(date: string): Promise<Named> {
  await stage.asking(date, '10:30');
  await stage.menusOn(date, ['301동식당', '302동식당', '학생회관식당']);
  await stage.classAt(stage.asker, '09:00', '11:45', '301');
  await stage.classAt(stage.asker, '14:00', '15:15', '301');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '09:00', '11:45', '302');
  return minsu;
}

// A Friend of the asker's with a Class in 302동 from 09:00 to `until`.
async function friendUntil(name: string, until: string): Promise<Named> {
  const friend = await stage.friend(name);
  await stage.classAt(friend, '09:00', until, '302');
  return friend;
}

// The lunch the leader makes at POST /plans of the first plan for them and these people.
async function lunchOf(leader: TestUser, date: string, people: readonly TestUser[]): Promise<Lunch> {
  const input = inputOf(date, [leader.id, ...people.map(({ id }) => id)]);
  const server = stage.app.getHttpServer();
  const answered = await withAccessToken(request(server).post('/assistant/answers'), leader.accessToken).send({
    input,
    location: null,
  });
  const [plan] = z.custom<AnswerReply>().parse(answered.body).plans;
  if (plan === undefined) {
    throw new Error(`No plan: ${JSON.stringify(answered.body)}`);
  }
  const made = await withAccessToken(request(server).post('/plans'), leader.accessToken)
    .set('Idempotency-Key', randomUUID())
    .send({ input, planId: plan.id, startAt: plan.startAt, location: null });
  return { questId: z.object({ quest: z.object({ id: z.string() }) }).parse(made.body).quest.id, plan };
}

interface Lunch {
  questId: string;
  plan: Plan;
}

async function answer(user: TestUser, questId: string, how: 'accept' | 'decline'): Promise<void> {
  await answerInvitation(stage.app, user, (await stage.invitationTo(user, questId)) ?? '', how);
}

// The asker asks to add the Friend, and the reply and planMeal's words come back.
async function askToAdd(date: string, friend: Named): Promise<{ body: unknown; words: unknown }> {
  const steps = [resolve(friend.name), planMeal(date, [friend.id]), { text: '…' }];
  const response = await stage.send(steps, { clientCapabilities: PLAN_SET }, `${friend.name}도 추가해 줘`);
  return { body: response.body, words: stage.model.toolResults().at(-1) };
}

// 바꾸기 on the answer's first plan.
function press(answered: AnswerReply, questId: string): request.Test {
  const [plan] = answered.plans;
  const body = { input: answered.input, planId: plan?.id, startAt: plan?.startAt, location: null };
  return stage.changePlan(stage.asker, questId, { ...body, clientCapabilities: PLAN_SET });
}

const stepsToldTo = async (user: TestUser): Promise<unknown[]> =>
  z
    .array(z.object({ id: z.string() }))
    .parse((await stage.notificationsOf(user)).body)
    .filter(({ id }) => id.startsWith('step-changed:'));

const questOf = async (questId: string): Promise<{ id: string; capacity: number; takenAlone: boolean }> =>
  z
    .object({ id: z.string(), capacity: z.number(), takenAlone: z.boolean() })
    .parse(
      (await withAccessToken(request(stage.app.getHttpServer()).get(`/quests/${questId}`), stage.asker.accessToken))
        .body,
    );

describe('A Friend who can come at the lunch’s start, added to a lunch the asker leads with 민수', () => {
  const date = '2101-03-01';
  let minsu: Named;
  let haeun: Named;
  let lunch: Lunch;
  let added: AnswerReply;

  beforeAll(async () => {
    minsu = await dayOf(date);
    haeun = await friendUntil('하은', '11:30');
    lunch = await lunchOf(stage.asker, date, [minsu]);
    await answer(minsu, lunch.questId, 'accept');
  });

  it('is planned with everyone in it, at its Restaurant and start, and nothing is sent before the press', async () => {
    const { body, words } = await askToAdd(date, haeun);
    added = answerIn(body);

    expect(ids(added)).toEqual([stage.asker.id, minsu.id, haeun.id]);
    expect(added.planSet).toMatchObject({ questId: lunch.questId, changeable: true });
    expect(added.plans.map(({ id, startAt }) => [id, startAt])).toEqual([[lunch.plan.id, lunch.plan.startAt]]);
    expect(added.adding).toEqual({
      friends: [{ userId: haeun.id, name: '하은' }],
      startAt: lunch.plan.startAt,
      movesTo: null,
    });
    expect(words).toMatchObject({ result: 'planned', adding: { movesTo: null, fits: true } });
    expect((await getInvitations(stage.app, haeun)).body).toEqual([]);
    expect((await stage.notificationsOf(haeun)).body).toEqual([]);
  });

  it('is invited to the same Quest on the press, and 민수 is told nothing', async () => {
    const changed = await press(added, lunch.questId);

    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ id: lunch.questId });
    expect(await stage.invitationTo(haeun, lunch.questId)).toBeDefined();
    expect(await stepsToldTo(minsu)).toEqual([]);
  });
});

describe('A Friend who can come only later', () => {
  const date = '2101-03-08';
  let minsu: Named;
  let seojun: Named;
  let lunch: Lunch;
  let added: AnswerReply;

  beforeAll(async () => {
    minsu = await dayOf(date);
    seojun = await friendUntil('서준', '12:40');
    lunch = await lunchOf(stage.asker, date, [minsu]);
    await answer(minsu, lunch.questId, 'accept');
  });

  it('moves the lunch only in the plan, to when they can come', async () => {
    const { body, words } = await askToAdd(date, seojun);
    added = answerIn(body);
    const [plan] = added.plans;

    expect(plan?.id).toBe(lunch.plan.id);
    expect(plan?.startAt).not.toBe(lunch.plan.startAt);
    expect(added.adding).toMatchObject({ startAt: lunch.plan.startAt, movesTo: plan?.startAt });
    expect(words).toMatchObject({ adding: { movesTo: plan?.startAt.slice(11, 16), fits: true } });
    expect(await stage.invitationTo(seojun, lunch.questId)).toBeUndefined();
  });

  it('is moved and invited on the press, and 민수 is told of the move', async () => {
    expect((await press(added, lunch.questId)).status).toBe(200);
    expect(await stage.invitationTo(seojun, lunch.questId)).toBeDefined();
    expect(await stepsToldTo(minsu)).not.toEqual([]);
  });
});

describe('A Friend who cannot come in the lunch', () => {
  it('is said not to fit, with no plan to press and nothing sent', async () => {
    const date = '2101-03-15';
    const minsu = await dayOf(date);
    const jiho = await friendUntil('지호', '15:00');
    const lunch = await lunchOf(stage.asker, date, [minsu]);

    const { body, words } = await askToAdd(date, jiho);

    expect(answerIn(body).plans).toEqual([]);
    expect(words).toMatchObject({ result: 'none', adding: { fits: false } });
    expect(await stage.invitationTo(jiho, lunch.questId)).toBeUndefined();
  });
});

describe('A Friend already in the lunch, or invited to it', () => {
  const date = '2101-03-22';
  let minsu: Named;
  let haeun: Named;

  beforeAll(async () => {
    minsu = await dayOf(date);
    haeun = await friendUntil('하은', '11:30');
    const { questId } = await lunchOf(stage.asker, date, [minsu, haeun]);
    await answer(minsu, questId, 'accept');
  });

  it('is said to be invited already, and nobody is added', async () => {
    const { body, words } = await askToAdd(date, haeun);

    expect(answerIn(body).adding).toBeUndefined();
    expect(words).toMatchObject({
      alreadyIn: [{ name: expect.stringContaining('하은') as unknown, answer: 'invited' }],
    });
  });

  it('is said to be in it already, and nobody is added', async () => {
    const { body, words } = await askToAdd(date, minsu);

    expect(answerIn(body).adding).toBeUndefined();
    expect(words).toMatchObject({ alreadyIn: [{ name: expect.stringContaining('민수') as unknown, answer: 'in' }] });
  });
});

describe('A Friend who declined the lunch', () => {
  it('is added again, and invited again on the press', async () => {
    const date = '2101-03-29';
    const minsu = await dayOf(date);
    const haeun = await friendUntil('하은', '11:30');
    const lunch = await lunchOf(stage.asker, date, [minsu, haeun]);
    await answer(minsu, lunch.questId, 'accept');
    await answer(haeun, lunch.questId, 'decline');

    const added = answerIn((await askToAdd(date, haeun)).body);

    expect(added.adding?.friends).toEqual([{ userId: haeun.id, name: '하은' }]);
    expect((await press(added, lunch.questId)).status).toBe(200);
    expect(await stage.invitationTo(haeun, lunch.questId)).toBeDefined();
  });
});

describe('A lunch the asker holds alone', () => {
  it('takes the Friend in place: the same Quest, no longer taken alone, and the Friend invited', async () => {
    const date = '2101-04-05';
    await dayOf(date);
    const haeun = await friendUntil('하은', '11:30');
    const lunch = await lunchOf(stage.asker, date, []);
    expect(await questOf(lunch.questId)).toMatchObject({ takenAlone: true });

    const added = answerIn((await askToAdd(date, haeun)).body);

    expect(added.planSet).toMatchObject({ questId: lunch.questId, changeable: true });
    expect(added.adding).toMatchObject({ startAt: lunch.plan.startAt, movesTo: null });
    expect((await press(added, lunch.questId)).status).toBe(200);
    expect(await questOf(lunch.questId)).toEqual({ id: lunch.questId, capacity: 4, takenAlone: false });
    expect(await stage.invitationTo(haeun, lunch.questId)).toBeDefined();
  });
});

describe('A lunch 민수 leads', () => {
  it('is not changeable here, and the model is told who leads it', async () => {
    const date = '2101-04-12';
    const minsu = await dayOf(date);
    const haeun = await friendUntil('하은', '11:30');
    const lunch = await lunchOf(stage.asker, date, [minsu]);
    await answer(minsu, lunch.questId, 'accept');
    await handOver(stage.app, stage.asker, lunch.questId, minsu.id);

    const { body, words } = await askToAdd(date, haeun);

    expect(answerIn(body).planSet).toMatchObject({ questId: lunch.questId, changeable: false });
    expect(words).toMatchObject({ alreadySet: { leader: expect.stringContaining('민수') as unknown } });
  });
});

describe('A lunch the asker is only invited to', () => {
  it('plans nothing, and names only its Holders', async () => {
    const date = '2101-04-19';
    const minsu = await dayOf(date);
    const jiho = await stage.friend('지호');
    await befriend(stage.app, minsu, jiho);
    const haeun = await friendUntil('하은', '11:30');
    await lunchOf(minsu, date, [stage.asker, jiho]);

    const { body, words } = await askToAdd(date, haeun);

    expect(z.object({ answer: z.null() }).safeParse(body).success).toBe(true);
    expect(words).toMatchObject({ result: 'none', invitedTo: { holders: [expect.stringContaining('민수')] } });
    expect(JSON.stringify(words)).not.toContain('지호');
  });
});
