/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { makePlanQuest } from './plan-quests.js';
import { getInvitations } from './quest-recruiting.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// The meeting a new meet's Plan would change (P05 ticket 17, slice 2): the asker's own one with the same Friends is set
// aside and named as one to change (row 1); one a Friend made is theirs, and nothing is planned (row 2); one with other
// people is no target (row 8); the model may name the one it means by its ref; two with the same Friend are asked
// about (row 10b). Making a second one at POST /plans is refused, as it is changed in place. One whose every Friend
// declined is the same meeting, changed in place, and invites them again (row 6).

const stage = new MealPlanStage();
let prisma: PrismaClient;

beforeAll(async () => {
  await stage.start();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), stage.stop()]);
});

// An app that draws 바꾸기 for a plan already set, and the released one, which does not.
const MEET_APP = { clientCapabilities: ['library', 'answer', 'meet', 'plan-set'] };
const RELEASED_APP = { clientCapabilities: ['library', 'answer', 'meet'] };

// A meeting made from a meet's Plan on `date` at `clock`, led by `leader` with `invited` waiting.
async function meeting(date: string, clock: string, leader: Named, invited: Named[]): Promise<string> {
  const [hours, minutes] = clock.split(':').map(Number);
  const end = `${String((hours ?? 0) + 1).padStart(2, '0')}:${String(minutes ?? 0).padStart(2, '0')}`;
  const quest = await prisma.quest.create({
    data: {
      title: '학생회관 앞에서 만나기',
      leaderId: leader.id,
      meet: true,
      holders: { create: [{ userId: leader.id }] },
      invitations: { create: invited.map(({ id }) => ({ userId: id })) },
      subQuests: {
        create: [
          {
            title: '학생회관 앞에서 만나기',
            startsAt: new Date(`${date}T${clock}:00+09:00`),
            endsAt: new Date(`${date}T${end}:00+09:00`),
          },
        ],
      },
    },
  });
  return quest.id;
}

const planMeet = (date: string, friendIds: string[], more: object = {}): Step => ({
  tool: 'planMeet',
  input: { date, friendIds, ...more },
});

const answerOf = (body: unknown): AnswerReply | null =>
  z.object({ answer: z.custom<AnswerReply | null>() }).parse(body).answer;

describe("The asker's own meeting with the same Friend", () => {
  it('is set aside, named to the model, and given as a planSet they may change', async () => {
    await stage.asking('2092-02-11', '10:30');
    const minsu = await stage.friend('민수');
    const kept = await meeting('2092-02-12', '14:00', stage.asker, [minsu]);

    const response = await stage.send(
      [resolve('민수'), planMeet('2092-02-12', [minsu.id]), { text: '…' }],
      MEET_APP,
      '내일 민수랑 보자',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'planned', setAside: { ref: kept } });
    expect(answerOf(response.body)?.planSet).toMatchObject({ questId: kept, kind: 'meet', changeable: true });
  });

  it('is the one the model names by its ref, whoever else is asked', async () => {
    await stage.asking('2092-02-18', '10:30');
    const minsu = await stage.friend('민수');
    const jieun = await stage.friend('지은');
    const kept = await meeting('2092-02-19', '14:00', stage.asker, [minsu]);

    await stage.send(
      [resolve('지은'), planMeet('2092-02-19', [jieun.id], { questId: kept.slice(0, 8) }), { text: '…' }],
      MEET_APP,
      '그거 지은이랑으로 바꿔 줘',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ setAside: { ref: kept } });
  });
});

describe('Another meeting', () => {
  it('one a Friend made is theirs: nothing is planned, and the model is told whose it is', async () => {
    await stage.asking('2092-02-25', '10:30');
    const minsu = await stage.friend('민수');
    const kept = await meeting('2092-02-26', '14:00', minsu, [stage.asker]);

    const response = await stage.send(
      [resolve('민수'), planMeet('2092-02-26', [minsu.id]), { text: '…' }],
      MEET_APP,
      '내일 민수랑 보자',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'set-by-friend', meeting: { ref: kept } });
    expect(answerOf(response.body)).toBeNull();
  });

  it('one with other people is no target: it is related, not set aside', async () => {
    await stage.asking('2092-03-03', '10:30');
    const minsu = await stage.friend('민수');
    const jieun = await stage.friend('지은');
    const kept = await meeting('2092-03-04', '14:00', stage.asker, [minsu]);

    const response = await stage.send(
      [resolve('민수'), resolve('지은'), planMeet('2092-03-04', [minsu.id, jieun.id]), { text: '…' }],
      MEET_APP,
      '내일 민수랑 지은이랑 보자',
    );

    expect(stage.model.toolResults()[2]).not.toHaveProperty('setAside');
    expect(answerOf(response.body)?.planSet).toBeNull();
    expect(answerOf(response.body)?.related).toMatchObject([{ questId: kept }]);
  });

  it('two with the same Friend that day are asked about, and none is planned', async () => {
    await stage.asking('2092-03-10', '10:30');
    const minsu = await stage.friend('민수');
    await meeting('2092-03-11', '12:00', stage.asker, [minsu]);
    await meeting('2092-03-11', '17:00', stage.asker, [minsu]);

    const response = await stage.send(
      [resolve('민수'), planMeet('2092-03-11', [minsu.id]), { text: '…' }],
      MEET_APP,
      '내일 민수랑 보자',
    );

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'several', meetings: [{}, {}] });
    expect(answerOf(response.body)).toBeNull();
  });
});

// A meet's answer for the asker and `friend`, recalculated as `app` asks it, and the making of its first Plan.
async function firstMeet(
  date: string,
  friend: Named,
  app: object = {},
): Promise<{ answer: AnswerReply; making: object }> {
  const input = {
    kind: 'meet',
    date,
    people: [stage.asker.id, friend.id].map((userId) => ({ userId, constraints: [] })),
    window: { from: null, until: null },
    placeId: null,
  };
  const answered = await withAccessToken(
    request(stage.app.getHttpServer()).post('/assistant/answers'),
    stage.asker.accessToken,
  ).send({ input, ...app });
  const answer = z.custom<AnswerReply>().parse(answered.body);
  const [plan] = answer.plans;
  return { answer, making: { input, planId: plan?.id, startAt: plan?.startAt, location: null } };
}

describe('Making a second meeting at POST /plans', () => {
  it.each([
    ['the asker made', 'PLAN_ALREADY_SET', '2092-03-17', '2092-03-18'],
    ['a Friend made', 'PLAN_SET_BY_FRIEND', '2092-03-24', '2092-03-25'],
  ])('is refused when %s the meeting, with its questId', async (who, code, asked, date) => {
    await stage.asking(asked, '10:30');
    const minsu = await stage.friend('민수');
    const kept =
      who === 'the asker made'
        ? await meeting(date, '14:00', stage.asker, [minsu])
        : await meeting(date, '14:00', minsu, [stage.asker]);

    const response = await makePlanQuest(stage, {
      ...(await firstMeet(date, minsu)).making,
      clientCapabilities: ['plan-set'],
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code, questId: kept });
  });
});

describe('A meeting whose every Friend declined', () => {
  it('is set aside as one to change, and its plan changes it in place, inviting them again', async () => {
    await stage.asking('2092-04-21', '10:30');
    const minsu = await stage.friend('민수');
    const kept = await meeting('2092-04-22', '14:00', stage.asker, []);
    await prisma.questDecline.create({ data: { questId: kept, userId: minsu.id } });
    const { answer, making } = await firstMeet('2092-04-22', minsu, { clientCapabilities: ['plan-set'] });

    const response = await withAccessToken(
      request(stage.app.getHttpServer()).put(`/plans/${kept}`),
      stage.asker.accessToken,
    ).send(making);

    expect(answer.planSet).toMatchObject({ questId: kept, changeable: true });
    expect(response.status).toBe(200);
    const invitations = z.array(z.object({ quest: z.object({ id: z.string() }) }));
    expect(invitations.parse((await getInvitations(stage.app, minsu)).body)).toEqual([
      expect.objectContaining({ quest: expect.objectContaining({ id: kept }) as unknown }),
    ]);
  });
});

describe('An app that does not draw 바꾸기', () => {
  it('is planned for as before: the meeting is related, never set aside, and no change is offered', async () => {
    await stage.asking('2092-03-31', '10:30');
    const minsu = await stage.friend('민수');
    const kept = await meeting('2092-04-01', '14:00', stage.asker, [minsu]);

    const response = await stage.send(
      [resolve('민수'), planMeet('2092-04-01', [minsu.id]), { text: '…' }],
      RELEASED_APP,
      '내일 민수랑 보자',
    );
    await stage.send(
      [{ tool: 'findDay', input: { date: '2092-04-01', questIds: [kept] } }, { text: '…' }],
      RELEASED_APP,
      '민수랑 약속 몇 시야?',
    );

    expect(answerOf(response.body)).toMatchObject({ planSet: null, related: [{ questId: kept }] });
    expect(stage.model.toolResults()[0]).not.toHaveProperty('note');
  });

  it('makes a second meeting at POST /plans, as before, where one that draws it is refused', async () => {
    await stage.asking('2092-04-07', '10:30');
    const minsu = await stage.friend('민수');
    await meeting('2092-04-08', '14:00', stage.asker, [minsu]);

    const response = await makePlanQuest(stage, (await firstMeet('2092-04-08', minsu)).making);

    expect(response.status).toBe(201);
  });

  it('is offered no change by findDay, where one that draws it is', async () => {
    await stage.asking('2092-04-14', '10:30');
    const minsu = await stage.friend('민수');
    const kept = await meeting('2092-04-15', '14:00', stage.asker, [minsu]);

    await stage.send(
      [{ tool: 'findDay', input: { date: '2092-04-15', questIds: [kept] } }, { text: '…' }],
      MEET_APP,
      '민수랑 약속 몇 시야?',
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ note: expect.stringContaining('바꾸기') as unknown });
  });
});
